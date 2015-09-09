var events = require('events')
var net = require('net')
var os = require('os')

var mem, store = {}

var cmd = {
  sync : '\u0016',
  update : '\u0006'
}

function init() {
  if(!mem)
    setup()
  return mem
}

function log(line, id) {
  var who = id >= 0 ? mem.conf[id].host +':'+ mem.conf[id].port : ''
  mem.emit('log', '[amnesia] '+ line +' '+ who)
}

function setup() {
  mem = new events.EventEmitter()
  mem.updated = 0
  mem.remote = false

  Object.defineProperty(mem, 'conf', {
    set : conf,
    get : function() {
      return store.conf
    }
  })

  Object.defineProperty(mem, 'data', {
    set : data,
    get : function() {
      return store.data
    }
  })
}

function conf(value) {
  store.conf = value
  server()
}

function data(value) {
  try {
    JSON.parse(JSON.stringify(value))
  }
  catch(e) {
    return log('Skipping invalid value: '+ value)
  }

  mem.updated = Date.now()
  mem.emit('change', JSON.stringify(store.data),
    JSON.stringify(value), mem.remote)
  store.data = value

  if(mem.remote === false) { // new value was set locally, send to other peers
    for(var id = 0; id < mem.conf.length; id++) {
      send(value, id)
    }
  }
  else {
    mem.remote = false
  }
}

function send(value, id, callback) {
  var cid = mem.conf[id]
  if(cid.self) // do not send to itself
    return

  if(!cid.client)
    cid.client = connect(id)

  if(callback)
    cid.callback = callback

  cid.client.write(JSON.stringify(value))
}

function connect(id) {
  var cid = mem.conf[id]
  var client = net.connect(cid.port, cid.host)

  client.on('connect', function() {
    log('Connected to peer', id)
  })

  client.on('data', function(data) {
    if(cid.callback)
      cid.callback(data.toString(), id)
  })

  client.on('close', function() {
    cid.client = null
    log('Peer connection closed', id)
  })

  client.on('error', function(error) {
    cid.client = null
    log('Peer connection error ('+ error.message +')', id)
  })

  return client
}

function sync() { // on init, SYNC with other peers
  var fresh = 0, id = null
  var callback = function(result, i) {
    var updated = result.split(':')[1]
    if(updated > fresh) {
      fresh = updated
      id = i
    }
  }

  for(var i = 0; i < mem.conf.length; i++) {
    send(cmd.sync, i, callback)
  }

  setTimeout(function() { // wait 1 sec for any sync responses from all peers
    if (id !== null && fresh > mem.updated) // no update needed
      update(id)
  }, 1000)

  log('Requesting SYNC to all peers')
}

function update(id) { // on SYNC a peer has an updated value, request it.
  send(cmd.update, id, function(val) {
    mem.remote = true
    mem.data = parse(val)
  })

  log('Requesting UPDATE to', id)
}

function server() {
  var tcpserver = net.createServer(function(socket) {
    var peer = socket.remoteAddress

    socket.on('data', function(value) {
      router(socket, parse(value), peer)
    })

    socket.on('error', function(error) {
      if(error.code == 'ECONNRESET')
        log('Peer disconnected '+ peer)
      else
        log('Error ('+ error.message +') connecting to peer '+ peer)
    })
  })

  tcpserver.on('connection', function(socket) {
    log('Peer connected '+ socket.remoteAddress)
  })

  tcpserver.on('listening', function() {
    mem.conf[mem.conf.id].self = true
    log('Amnesia tcp server running on', mem.conf.id)
    sync()
  })

  tcpserver.on('error', function(error) {
    if(error.code == 'EADDRINUSE') {
      log('Port already in use. Trying another one')
      mem.conf[mem.conf.id].self = false
      listen(tcpserver)
    }
    else {
      log('Amnesia server error '+ error.message)
    }
  })

  listen(tcpserver)
}

function listen(server) { // find the correct ip and port to bind
  var nifs = JSON.stringify(os.networkInterfaces())

  for(var i in mem.conf) { // loop over conf ips
    if(nifs.indexOf(mem.conf[i].host) != -1 && mem.conf[i].self === undefined) {
      mem.conf.id = i
      return server.listen(mem.conf[i].port, mem.conf[i].host)
    }
  }

  console.error('No configuration found for this machine. '
    + 'Edit conf.json and add this machine\'s ip/port')

  process.exit(1)
}

function router(socket, data, peer) { // route request to the server
  if(data == cmd.sync) {
    log('Sending SYNC response to peer '+ peer)
    socket.write(cmd.sync +':'+ mem.updated)
  }
  else if(data == cmd.update) {
    log('Sending UPDATE response to peer '+ peer)
    socket.write(JSON.stringify(mem.data))
  }
  else {
    log('Received new value from peer '+ peer)
    mem.remote = true
    mem.data = data
  }
}

function parse(value) {
  try {
    return JSON.parse(value)
  }
  catch(e) {
    return value.toString()
  }
}

// export and init
module.exports = init()

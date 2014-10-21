
var events = require('events')
var	net = require('net')
var	os = require('os')
var	conf = require('./conf')
var mem

function init() {
	if(mem === undefined) { // singleton
		setup()
		server()
	}
	return mem
}

function log(line, id) {
	var who = id >= 0 ? conf[id].host +':'+ conf[id].port : ''
	mem.emit('log', '[AMNESIA] '+ line +' '+ who)
}

function setup() {
	mem = new events.EventEmitter()
	mem.updated = 0
	mem.remote = false

	Object.defineProperty(mem, 'data', {
		set : set, 
		get : function() {
			return this.value
		}
	})
}

function set(value) {
	if(value === undefined 
		|| value == Infinity
		|| Number.isNaN(value) 
		|| typeof value == 'function')
		return log('Skipping invalid value: '+ value)

	log('Value changed from '+ this.value +' to '
		+ value +' '+ (mem.remote ? 'remotely' : 'locally'))

	mem.updated = Date.now()
	mem.emit('change', this.value, value, mem.remote)
	this.value = value

	if(mem.remote === false) { // new value was set locally, send to other peers
		for(var id = 0; id < conf.length; id++) {
			send(value, id)
		}
	}
	else {
		mem.remote = false	
	}
}

function send(value, id, callback) {
	if(conf[id].self) // do not send to itself
		return

	if(!conf[id].client)
		conf[id].client = connect(id)

	if(callback)
		conf[id].callback = callback

	conf[id].client.write(JSON.stringify(value))
}

function connect(id) {
	var client = net.connect(conf[id].port, conf[id].host)

	log('Connecting to peer', id)	

	client.on('data', function(data) {
		if(conf[id].callback)
			conf[id].callback(data.toString(), id)
	})

	client.on('close', function() {
		conf[id].client = null
		log('Peer connection closed', id)
	})

	client.on('error', function(error) {
		conf[id].client = null
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

	for(var i = 0; i < conf.length; i++) {
		send('!SYNC', i, callback)
	}

	setTimeout(function() { // wait 1 sec for any sync responses from all peers
		if (id !== null && fresh > mem.updated) // no update needed, all peers have nothing
			update(id)
	}, 1000)
	
	log('Requesting SYNC to all peers')
}

function update(id) { // on SYNC a peer has an updated value, request it.
	send('!UPDATE', id, function(val) {
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

		log('Peer connected '+ peer)
	})

	tcpserver.on('listening', function() {
		conf[conf.id].self = true
		log('Amnesia tcp server running on ', conf.id)
		sync()
	})

	tcpserver.on('error', function(error) {
		if(error.code == 'EADDRINUSE') {
			log('Port already in use. Trying another one')
			conf[conf.id].self = false
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
	
	for (var i in conf) { // loop over conf ips
		if(nifs.indexOf(conf[i].host) != -1 && conf[i].self === undefined) {
			conf.id = i
			return server.listen(conf[i].port, conf[i].host)
		}
	}

	console.error('No configuration found for this machine. '
		+ 'Edit conf.json and add this machine\'s ip/port')

	process.exit(1)
}

function router(socket, data, peer) { // route request to the server
	if(data == '!SYNC') {
		log('Sending SYNC response to peer '+ peer)
		socket.write('!SYNC:'+ mem.updated)
	}
	else if(data == '!UPDATE') {
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
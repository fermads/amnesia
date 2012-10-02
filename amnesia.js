
var Events = require('events'),
	Net = require('net'),
	Os = require('os'),
	conf = require('./conf')

var mem, log

var Amnesia = {

	init : function() {
		Amnesia.setup()
		Amnesia.server()
		return mem
	},

	log : function(line, id) {
		var who = id >= 0 ? conf[id].host +':'+ conf[id].port : ''
		mem.emit('log', line + who)
	},

	setup : function() {
		mem = new Events.EventEmitter()
		mem.updated = 0
		mem.remote = null // last value was set remotely?
		log = Amnesia.log

		Object.defineProperty(mem, 'data', {
			set : Amnesia.set, // overwrite default setter
			get : function() {
				return this.value
			}
		})
	},

	set : function(value) {
		log('Value changed from '+ this.value +' to '+ value
			+ (mem.remote ? ' remotely' : ' locally' ) )

		this.value = value
		mem.updated = Date.now()
		mem.emit('change', mem.data, value, mem.remote)

		if(!mem.remote) { // new value is set locally, send to other peers
			for(var i = 0; i < conf.length; i++) {
				Amnesia.send(value, i)
			}
		}
		mem.remote = false
	},

	send : function(value, id, callback) {
		if(conf[id].self) // do not send to itself;
			return

		var client = Net.connect(conf[id].port, conf[id].host)

		client.on('data', function(data) {
			if(callback)
				callback(data.toString(), id)
		})

		client.on('error', function(err) {
			log(err + ' on ', id)
		})

		client.write(JSON.stringify(value))
	},

	sync : function() {	// on init, SYNC with other peers
		var fresh = 0, id = null
		for(var i = 0; i < conf.length; i++) {
			Amnesia.send('!!SYNC', i, function(updated, i) {
				if(updated > fresh) {
					fresh = updated
					id = i
				}
			})
		}

		setTimeout(function() {
			if (id !== null) // no update needed, all peers have nothing
				Amnesia.update(id)
		}, 1000)
		
		log('Requesting SYNC to all peers')
	},

	update : function(id) { // on SYNC a peer has an updated value, request it.
		Amnesia.send('!!UPDATE', id, function(val) {
			mem.remote = true
			mem.data = Amnesia.parse(val)
		})

		log('Requesting UPDATE to ', id)
	},

	server : function() {
		var server = Net.createServer(function(socket) {
			socket.on('data', function(value) {
				Amnesia.router(socket, Amnesia.parse(value))
			})
		})

		server.on('listening', function() {
			conf[conf.id].self = true
			log('Listening on ', conf.id)
			Amnesia.sync()
		})

		server.on('error', function(e) {
			if(e.code == 'EADDRINUSE') {
				conf[conf.id].self = false
				Amnesia.listen(server)
			}
			else {
				log(e.message)
			}
		})

		Amnesia.listen(server)
	},

	listen : function(server) { // find the correct ip and port to bind
		var nics = Os.networkInterfaces()

		for (var nic in nics) { // loop on network interfaces
			for (var family in nics[nic]) { // loop on family (ipv4 e ipv6)
				for (var i in conf) { // loop on conf ips
					if(conf[i].host == nics[nic][family].address 
					&& conf[i].self === undefined) {
						conf.id = i
						server.listen(conf[i].port, conf[i].host)
						return
					}
				}
			}
		}

		console.error('No configuration found for this machine. '
			+ 'Edit conf.json and add this machine\'s ip/port')

		process.exit(1)
	},

	router : function(socket, value) { // route request to the server
		if(value == '!!SYNC') {
			log('Sending SYNC response to '+ socket.remoteAddress)
			socket.write(mem.updated.toString())
		}
		else if(value == '!!UPDATE') {
			log('Sending UPDATE response to '+ socket.remoteAddress)
			socket.write(JSON.stringify(mem.data))
		}
		else {
			log('Received new value from '+ socket.remoteAddress)
			mem.remote = true
			mem.data = value
		}
	},

	parse : function(value) {
		try {
			return JSON.parse(value)
		}
		catch(e) {
			return value.toString()
		}
	}
}

// export and init
module.exports = Amnesia.init()

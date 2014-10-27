var readline = require('readline')
var mem = require('./amnesia')
var rl
mem.conf = require('./conf')

function init() {

	bind()
	setup()
	ask()
}

function bind() {
	mem.on('change', function(oldValue, newValue, remoteUpdate) {
		console.log('Value changed from '+ oldValue +' to '+ newValue +' '
			+ (remoteUpdate ? 'remotely' : 'locally') 
			+ ' at '+ new Date(mem.updated).toISOString())
	})

	mem.on('log', function(msg) {
		console.log(msg)
	})
}

function setup() {
	rl = readline.createInterface({
	  input: process.stdin,
	  output: process.stdout
	})
}

function ask() {
	rl.question('\nEnter a string to send to all peers: ', function(answer) {
		mem.data = answer		
		ask()
	})
}

init()
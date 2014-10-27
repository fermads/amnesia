var mem = require('./amnesia')
mem.conf = require('./conf.json')

function init() {
	
	bind()
	run()
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

function run() {
	var count = 0
	var testvalues = [ 'ok', 1, false, true, null, undefined, Infinity, 
						NaN, {a:1}, {}, [1], [], '', function(){} ]

	var id = setInterval(function() {
	    if(count >= testvalues.length)
	    	clearInterval(id)
    	mem.data = testvalues[count++]
	}, 2000)
}

init()

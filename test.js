var mem = require ('./amnesia');
var util = require ('util');

mem.on('change', function(oldvalue, newvalue, remoteUpdate) {
	console.log('client: value changed from '+ oldvalue +' to '+ newvalue +' '+ (remoteUpdate ? 'remotely' : 'locally') );
	console.log(mem.updated);
})

mem.on('log', function(msg) {
	util.log(msg);
})

setTimeout (function() {
	mem.data = 2;	
}, 3000)


setTimeout (function() {
	mem.data = 8;	
}, 6000)

setTimeout (function() {
	mem.data = 11;	
}, 10000)

var mem = require('../amnesia')

mem.conf = require('../conf.json')

function init() {
  bind()
  run()
}

function bind() {
  mem.on('change', function(oldValue, newValue, remoteUpdate) {
    console.log('Value changed from', oldValue, 'to', newValue,
      (remoteUpdate ? 'remotely' : 'locally'),
      'at', new Date(mem.updated).toLocaleTimeString())
  })

  mem.on('log', function(msg) {
    console.log(msg)
  })
}

function run() {
  var count = 0
  var testvalues = [ // test all types of values
  	'ok', 1, 0, false, true, null,
  	undefined, Infinity, NaN, {a:1},
  	{}, [1], [], '', function(){},
    new Date(), new RegExp()
  ]

  var id = setInterval(function() {
    if(count >= testvalues.length)
      clearInterval(id)
    mem.data = testvalues[count++]
  }, 1000)
}

init()

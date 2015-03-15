var readline = require('readline')
var mem = require('../amnesia')
var rl

mem.conf = require('../conf')

function init() {
  bind()
  setup()
  ask()
  console.log('***** Type any string to send to all peers *****');
}

function bind() {
  mem.on('change', function(oldValue, newValue, remoteUpdate) {
    console.log('[MYAPPLOG] Value changed from', oldValue, 'to', newValue,
      (remoteUpdate ? 'remotely' : 'locally'),
      'at', new Date(mem.updated).toLocaleTimeString())
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
  rl.question('', function(answer) {
    mem.data = answer
    ask()
  })
}

init()
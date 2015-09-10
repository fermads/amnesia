# Amnesia

Easy memory sharing between machines and/or processes for Node.js

* Extremely simple and small. A single variable (property) is shared between machines and processes
* When this variable value changes, it is updated on all other machines/processes
* Supported value types are JSON, String, Boolean and Number
* Sharing is done using a TCP socket
* No other module dependency

Disclaimer:

* No guarantees of concurrent writes, last one stands
* No persistence. On restarts, it'll sync with other peers and get the most updated value
* It's actually copying data, not strictly sharing the same memory allocation

## Install

```
npm install amnesia
```

## Usage

Use like any JavaScript object. The shared value is on the "data" property
```js
var mem = require ('amnesia');
mem.conf = [/* your configuration, see example below */];
mem.data = 1 // mem.data variable in all machines will have their value set to 1

```

When value changes
```js
mem.on('change', function(oldValue, newValue, remoteUpdate) {
	console.log('Value changed from', oldValue, 'to', newValue,
		(remoteUpdate ? 'remotely' : 'locally') );
	// remoteUpdate shows if the new value came from another machine (set remotely)
})
```

See what is happening/debug
```js
mem.on('log', function(msg) {
	console.log(msg);
})
```

When it was last updated
```js
console.log(mem.updated)
```

## Configuration

Copy `conf.json` to your application directory and edit/add your ips/ports
```js
mem.conf = require('./conf')
```

OR add it directly to your code

```js
mem.conf = [
	{
		"host" : "10.0.1.2",
		"port" : 7777
	},
	{
		"host" : "10.0.1.2",
		"port" : 8888
	},
	{
		"host" : "10.0.1.6",
		"port" : 8888
	}
]
```

If you'll share on the same machine with different processes, duplicate the ip with different ports

All machines should have the same configuration with the current machine's ip and its peers.

## How it works
It uses the `Object.defineProperty` to add a custom setter and getter to the `data` property on the `mem` (amnesia) object.

When a value is set (i.e. `mem.data = 1`) the custom setter is called.

The custom setter sets the value to the local variable then write its value to the TCP socket for each other peer.

Other peers receive the new value and set them locally to their `mem.data`.

When a new process/machine starts (or restarts), it gets the most updated value from its peers (sync).


## Interactive example
On machine 1:
```js
node
> var mem = require('amnesia')
> mem.conf = require('./conf')
> mem.data = { jsontest : 123 } // <-- set to some json
{ jsontest: 123 }
>
```

Then, on machine 2:
```js
node
> var mem = require('amnesia')
> mem.conf = require('./conf') // <-- after adding config, a SYNC happens
> mem.data // <-- value for mem.data is already set
{ jsontest: 123 }
> mem.data = { jsontest: 456 } // <-- set a new value
>
```

Back to machine 1:
```js
> mem.data // <-- new value already on machine 1
{ jsontest: 456 }
>
```


## License

Licensed under the MIT license.
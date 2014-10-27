# Amnesia

Simple memory sharing (javascript object/variable) between different machines and/or processes for Node.js

* Extremely simple and small. A single variable is shared between machines and processes
* When this variable value is changed, it gets updated on all other machines
* Supports javascript Boolean, Number, String and JSON
* No other modules dependency

Disclaimer:

* No guarantees of concurrent writes, last one stands
* No persistence. On restarts, it'll ask for a SYNC from all others peers and get the most updated value


## Install

```
npm install amnesia
```

## Configuration

Two ways to do it. 

1. Copy conf.json to your application directory and edit/add your ips/ports 
```
mem.conf = require('./conf')
```

2. Add it directly to your code

```js
mem.conf = [
	{
		"host" : "172.22.18.15",
		"port" : 7777
	},
	{
		"host" : "172.22.18.15",
		"port" : 8888
	},
	{
		"host" : "172.22.18.16",
		"port" : 8888
	}
]
```

If you'll share on the same machine with different processes, duplicate the ip with different ports

All machines should have the same configuration with the current machine's ip and its peers


## Usage

Use like any javascript object. The value is on the "data" property
```js
mem = require ('amnesia');
mem.conf = [/* your configuration */];
mem.data = 1 // <-- all "mem.data" variable in all machines will have their value set to 1

```

Need to know when value change?
```js
mem.on('change', function(oldValue, newValue, remoteUpdate) {
	console.log('Value changed from '+ oldValue +' to '+ newValue +' '+ (remoteUpdate ? 'remotely' : 'locally') );
	// remoteUpdate tells you if the new value came from another machine (set remotely)
})
```

Need to see whats happening?
```js
mem.on('log', function(msg) {
	console.log(msg);
})
```

When it was updated?
```js
console.log(mem.updated)
```

## Interactive example
On machine 1:
```js
node
> var mem = require('amnesia')
> mem.conf = require('./conf')
> mem.data = { jsontest : 123 }
{ jsontest: 123 }
>
```

Then, on machine 2:
```js
node
> var mem = require('amnesia') 
> mem.conf = require('./conf') // <-- after adding config, a SYNC happens
> mem.data // <-- then value for mem.data is already set
{ jsontest: 123 }
>
```

## License

Licensed under the MIT license.
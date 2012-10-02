# Amnesia

Easy memory (javascript object/variable) sharing between different machines and/or process for Node.js

* Extremely simple and small. A single variable is shared between machines and processes
* When this variable value is changed, it gets updated on all other machines
* No other modules dependency

Disclaimer:

* No guarantees of concurrent writes, last one stands
* No persistence. On restarts, it'll ask for a SYNC from all others peers and get the most updated value
* If you're on only one machine and using node.js cluster, you'll probably be better with message passing
* For a serious use, you'll probably need something else like Redis or Memcache


## Install

```
npm install amnesia
```

## Configuration

Edit conf.json and add your ips/ports. If you'll share on the same machine with different processes, duplicate the ip with different ports

All machines should have the same conf.json with the current machine's ip and its peers


```js
[
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

## Usage

Use like any javascript object. The value is on the "data" property
```js
mem = require ('./amnesia');
mem.data = 1 // <-- all "mem.data" variable in all machines will have their value set to 1

```

Need to know when value change?
```js
mem.on('change', function(oldvalue, newvalue, remoteUpdate) {
	console.log('Value changed from '+ oldvalue +' to '+ newvalue +' '+ (remoteUpdate ? 'remotely' : 'locally') );
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
> mem = require('./amnesia')
{ updated: 0, remote: null }
> mem.data = { jsontest : 123 }
{ jsontest: 123 }
>
```

Then, on machine 2:
```js
node
> mem = require('./amnesia') // <-- a SYNC happens here
{ updated: 0, remote: null }
> mem.data
{ jsontest: 123 } // <-- then value for mem.data is already set
>
```

## License

Licensed under the MIT license.
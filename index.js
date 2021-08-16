const { HDirection } = require('gnode-api');

function Wiredfy(ext) {
	let HPacket
	if (typeof parse_in_Users == 'undefined') {
		parse_in_Users = require('./parsers/in_Users')
	}

	if (typeof parse_in_UserUpdate == 'undefined') {
		parse_in_UserUpdate = require('./parsers/in_userUpdate')
	}

	const watchingUsers = {}
	const watchingObjects = {}

	function handleUsers(message) {
		const packet = message.getPacket()

		// allow to use this:
		//   parse_in_Users.users.indexToId
		//   parse_in_Users.users.idToIndex
		parse_in_Users(packet)
	}

	function handleObjectUpdate(message) {
		const packet = message.getPacket()
		
		const objectUid = packet.readString()
		if (watchingObjects[objectUid]) {
			const handlers = watchingObjects[objectUid]
			for (let i = 0; i < handlers.length; i++) {
				if (typeof handlers[i] == 'function')
					handlers[i]()
				else
					throw new Error("Unknown handler type: "+(typeof handlers[i]))
			}
		}
	}

	function handleUserUpdate(message) {
		const packet = message.getPacket()
		
		const users = parse_in_UserUpdate(packet).users

		for (let i = 0; i < users.length; i++) {
			const userIndex = users[i].index
			const userId = parse_in_Users.users.indexToId[userIndex]

			if (watchingUsers[userId]) {
				const handlers = watchingUsers[userId]
				for (let j = 0; j < handlers.length; j++) {
					handlers[j](users[i].posX, users[i].posY)
				}
			}
		}
	}

	function initIntercepting() {
		ext.interceptByNameOrHash(HDirection.TOCLIENT, 'Users', handleUsers)
		ext.interceptByNameOrHash(HDirection.TOCLIENT, 'ObjectDataUpdate', handleObjectUpdate)
		ext.interceptByNameOrHash(HDirection.TOCLIENT, 'UserUpdate', handleUserUpdate)
	}

	function init(hostHPacket) {
		HPacket = hostHPacket
		
		const p1 = new HPacket(`{in:Chat}{i:0}{s:"asd"}{i:0}{i:0}{i:0}{i:0}`)
		console.log(p1.isCorrupted())

		const p2 = new HPacket(`{out:MoveAvatar}{i:7}{i:4}`)
		console.log(p2.isCorrupted())

		console.log(ext.sendToClient(p1))
		console.log(ext.sendToServer(p2))
		initIntercepting()
	}

	function exit() {
		watchingUsers = {}
		watchingObjects = {}
	}

	function when(watchable) {
		const toDos = []

		function callback() {
			for (const toDo of toDos) {
				if (toDo.conditions && toDo.conditions.some(c => !c()))
					continue

				toDo.action()
			}
		}

		watchable.watcher(callback)

		function buildDoFunction(obj) {
			return function doFunction(action) {
				obj.action = action
				toDos.push(obj)
			}
		}

		function buildIfFunction(obj) {
			return function ifFunction(gettable) {
				if (!obj.conditions) obj.conditions = []

				obj.conditions.push(gettable.getter)

				return {
					if: buildIfFunction(obj),
					do: buildDoFunction(obj),
				}
			}
		}

		return {
			if: buildIfFunction({}),
			do: buildDoFunction({}),
		}
	}

	const actions = {
		walkTo: function(x, y) {
			return function() {
				ext.sendToServer(new HPacket(`{out:MoveAvatar}{i:${x}}{i:${y}}`))
			}
		},

		say: function(message) {
			return function() {
				ext.sendToServer(new HPacket(`{out:Chat}{s:${message}}`))
			}
		},

		shout: function(message) {

		},
	}

	const props = {
		avatar: function(userId) {
			function inPlace(expectedX, expectedY) {
				let state = false 
				if (!watchingUsers[userId]) watchingUsers[userId] = []

				const watchers = []

				function handler(realX, realY) {
					if (expectedX == realX && expectedY == realY) {
						state = true
						for (let  i = 0; i < watchers.length; i++) {
							watchers[i]()
						}
					} else {
						state = false
					}
				}
				watchingUsers[userId].push(handler)

				function watcher(callback) {
					watchers.push(callback)
				}

				function getter() {
					return state
				}

				return {
					watcher: watcher,
					getter: getter,
				}
			}

			return {
				inPlace: inPlace,
			}
		},

		me: function() {
			return avatar(myId)
		},

		object: function(objectUid) {
			function changeState() {
				function watcher(callback) {
					if (!watchingObjects[objectUid]) watchingObjects[objectUid] = []
	
					function handler() {
						callback()
					}
	
					watchingObjects[objectUid].push(handler)
				}
				return {
					watcher: watcher,
				}
			}

			return {
				changeState: changeState,
			}
		},

		clock: function() {

		},

		every: function() {

		},
	}

	return { init, exit, when, actions, props }
}

module.exports = Wiredfy

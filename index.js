const { HPacket, HDirection } = require('gnode-api');

function Wiredfy(ext) {
	let myId, waitingForMyBadges, resolveInit
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

	function handleHabboUserBadges(message) {
		if (waitingForMyBadges) {
			waitingForMyBadges = false
			const packet = message.getPacket()
			myId = packet.readInteger()
			resolveInit()
		}
	}

	function initIntercepting() {
		ext.interceptByNameOrHash(HDirection.TOCLIENT, 'Users', handleUsers)
		ext.interceptByNameOrHash(HDirection.TOCLIENT, 'ObjectDataUpdate', handleObjectUpdate)
		ext.interceptByNameOrHash(HDirection.TOCLIENT, 'UserUpdate', handleUserUpdate)
		ext.interceptByNameOrHash(HDirection.TOCLIENT, 'HabboUserBadges', handleHabboUserBadges)
	}

	function init(hostHPacket) {
		// HPacket = hostHPacket

		waitingForMyBadges = true
		ext.sendToServer(new HPacket("{out:GetBadges}"))
		initIntercepting()

		return new Promise(res => {
			resolveInit = res
		})
	}

	function exit() {
		for (const prop in watchingUsers) delete watchingUsers[prop]
		for (const prop in watchingObjects) delete watchingObjects[prop]
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
				if (obj) {
					const newObj = Object.assign({}, obj)
					newObj.action = action
					toDos.push(newObj)
				} else {
					toDos.push({ action })
				}
			}
		}

		function buildIfFunction(obj) {
			return function ifFunction(gettable) {
				let nextObj
				if (obj) {
					const newObj = Object.assign({}, obj)
					if (!newObj.conditions) newObj.conditions = []
					newObj.conditions.push(gettable.getter)
					nextObj = newObj
				} else {
					nextObj = { conditions: [gettable.getter] }
				}

				return {
					if: buildIfFunction(nextObj),
					do: buildDoFunction(nextObj),
				}
			}
		}

		return {
			if: buildIfFunction(),
			do: buildDoFunction(),
		}
	}

	const actions = {
		walkTo: function(x, y) {
			return function() {
				ext.sendToServer(new HPacket(`{out:MoveAvatar}{i:${x}}{i:${y}}`))
			}
		},

		say: function(message, style = 7) {
			return function() {
				ext.sendToServer(new HPacket(`{out:Chat}{s:"${message}"}{i:${style}}{i:0}`))
			}
		},

		shout: function(message, style = 7) {
			return function() {
				ext.sendToServer(new HPacket(`{out:Shout}{s:"${message}"}{i:${style}}`))
			}
		},

		dance: function (style = 1) {
			return function () {
				ext.sendToServer(new HPacket(`{out:Dance}{i:${style}}`))
			}
		},

		sit: function () {
			return function () {
				ext.sendToServer(new HPacket("{out:ChangePosture}{i:1}"))
			}
		},

		stand: function () {
			return function () {
				ext.sendToServer(new HPacket("{out:ChangePosture}{i:0}"))
			}
		},

		wave: function () {
			return function () {
				ext.sendToServer(new HPacket("{out:AvatarExpression}{i:1}"))
			}
		},
	}

	const props = {
		avatar: function (userId) {
			function inPlace(expectedX, expectedY) { // TODO: fix when leaving the place
				let state = false
				if (!watchingUsers[userId]) watchingUsers[userId] = []

				const watchers = []

				function handler(realX, realY) {
					if (expectedX == realX && expectedY == realY) {
						state = true
						for (let i = 0; i < watchers.length; i++) {
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

		me: function () {
			if (!myId) throw new Error("My id not found!")

			return props.avatar(myId)
		},

		object: function (objectUid) {
			function changeState() {
				function watcher(callback) {
					if (!watchingObjects[objectUid]) watchingObjects[objectUid] = []
	
					function handler() {
						callback()
					}
	
					watchingObjects[objectUid].push(handler)
				}
				return { watcher }
			}

			return { changeState }
		},
	}

	const utils = {
		all: function (callbacks) {
			return function () {
				for (const callback of callbacks) {
					callback()
				}
			}
		},

		wait: function (delay) {
			return {
				then: function (callback) {
					return function () {
						setTimeout(callback, delay)
					}
				}
			}
		},

		every: function (timeout) {
			const watchers = []

			function handler() {
				for (const watcher of watchers) {
					watcher()
				}
			}

			let interval = setInterval(handler, timeout)

			function watcher(callback) {
				watchers.push(callback)
			}

			function stop() {
				clearInterval(interval)
			}

			return { watcher, stop }
		},

		clock: function() {

		},
	}

	return { init, exit, when, actions, props, utils }
}

module.exports = Wiredfy

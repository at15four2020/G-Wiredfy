const in_Users = (function () {
    const users = {
        indexToId: {},
        idToIndex: {}
    }
    function parse(packet) {
        var initialReadIndex = packet.getReadIndex()
        packet.resetReadIndex()

        const result = { users: [] }

        const usersCount = packet.readInteger()

        for (let i = 0; i < usersCount; i++) {
            const user = {}
            user.id = packet.readInteger()
            user.name = packet.readString()
            user.motto = packet.readString()
            user.figure = packet.readString()
            user.index = packet.readInteger()
            user.posX = packet.readInteger()
            user.posY = packet.readInteger()
            user.posZ = packet.readString()
            packet.readInteger()
            const entityTypeId = packet.readInteger()

            switch (entityTypeId) {
                case 1: // user
                    user.gender = packet.readString()
                    user.groupId = packet.readInteger()
                    packet.readInteger()
                    user.groupName = packet.readString()
                    packet.readString()
                    packet.readInteger()
                    packet.readBoolean()
                    break;
                case 2: // pet
                    packet.readInteger();
                    packet.readInteger();
                    packet.readString();
                    packet.readInteger();
                    packet.readBoolean();
                    packet.readBoolean();
                    packet.readBoolean();
                    packet.readBoolean();
                    packet.readBoolean();
                    packet.readBoolean();
                    packet.readInteger();
                    packet.readString();
                    break;
                case 4: // bot
                    packet.readString();
                    packet.readInteger();
                    packet.readString();
                    for (let j = packet.readInteger(); j > 0; j--) {
                        packet.readShort()
                    }
                    break;
            }

            users.idToIndex[user.id] = user.index
            users.indexToId[user.index] = user.id

            result.users.push(user)
        }

        packet.setReadIndex(initialReadIndex)

        return result
    }

    parse.users = users

    return parse
})()

module.exports = in_Users

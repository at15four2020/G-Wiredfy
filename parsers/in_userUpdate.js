function in_UserUpdate(packet) {
    var initialReadIndex = packet.getReadIndex()
    packet.resetReadIndex()

    const result = { users: [] }

    const usersCount = packet.readInteger()

    for (let i = 0; i < usersCount; i++) {
        const user = {}
        user.index = packet.readInteger()
        user.posX = packet.readInteger()
        user.posY = packet.readInteger()
        user.posZ = packet.readString()
        user.headFacing = packet.readInteger()
        user.bodyFacing = packet.readInteger()
        user.action = packet.readString()

        result.users.push(user)
    }

    packet.setReadIndex(initialReadIndex)

    return result
}

module.exports = in_UserUpdate

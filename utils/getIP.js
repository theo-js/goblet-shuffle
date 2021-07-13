const getIPFromHttpReq = req => req.headers['x-forwarded-for'] || req.connection.remoteAddress;

const getIPFromSocket = socket => socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;

module.exports = {
    getIPFromHttpReq,
    getIPFromSocket
}
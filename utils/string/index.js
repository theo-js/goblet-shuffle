const { randomInt } = require('../math');
const { ROOM_ID_LENGTH } = require('../../constants');

function randomChar () {
    var chars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 1, 2, 3, 4, 5, 6, 7, 8, 9];
    return chars[randomInt(0, chars.length - 1)];
}

function randomColor (min, max) {
	return 'rgb(' + randomInt(min, max) + ', ' + randomInt(min, max) + ', ' + randomInt(min, max) + ')';
}

function generateRoomID (lengthParam) {
    var IDlength = lengthParam || ROOM_ID_LENGTH || 10;
    var id = '';
    for (var i = 0; i < IDlength; i++) {
        id += randomChar();
    }
    return id;
}

module.exports = {
    randomChar,
    randomColor,
    generateRoomID
}
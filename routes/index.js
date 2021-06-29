const router = require('express').Router();
const { getIP } = require('../utils');
const { filterPlayer } = require('../api/routes/multiplayer');

// Constants
const {
	DOMAIN,
    GAME_CONSTANTS,
    GAME_MODE,
    PLAYER_ROLE,
    ROOM_ID_LENGTH,
	GAME_START_COUNTDOWN
} = require('../constants');

const { secondsToTime, timeToStr, secondsToTimeStr } = require('../utils/date');
const { randomInt, avg } = require('../utils/math');
const { generateRoomID, randomChar, randomColor } = require('../utils/string');
const { urlErrMsg } = require('../utils/validate/errors.js');
const { sanitizeStr, isValidNum, limitNum } = require('../utils/validate')
const gameUtils = {
	secondsToTime, timeToStr, secondsToTimeStr,
	randomColor,
	randomInt, avg,
	isValidNum, limitNum
};

// Join room (multiplayer)
router.get('/:roomID', (req, res) => {
	try {
		// Validate param
		const { roomID } = req.params;
		if (!roomID || roomID.length !== ROOM_ID_LENGTH) return res.redirect(301, `/?err=0`);
	
		const room = global.rooms.find(room => room.id === roomID);
		if (!!room) {
			// Room exists
			// Find out if current user is admin
			const ip = getIP(req);
			const isAdmin = room.admin.ip === ip;

			// Filter private data
			const filteredRoom = Object.assign({}, room) // Make copy of the room object
			filteredRoom.players = filteredRoom.players.map(player => filterPlayer(player));
			filteredRoom.admin = filterPlayer(filteredRoom.admin);

			res.render('multi', {
				err: urlErrMsg(req.query.err),
				room: filteredRoom,
				isAdmin,
				DOMAIN,
				PLAYER_ROLE,
				GAME_MODE,
				GAME_CONSTANTS,
				GAME_START_COUNTDOWN,
				utils: {
					...gameUtils,
					sanitizeStr
				}
			});
		} else return res.redirect(301, `/?err=1`);
	} catch (err) {
		res.redirect(301, `/`);
	}
});

// Solo
router.get('/', (req, res) => {
	res.render('solo', {
		err: urlErrMsg(req.query.err),
		GAME_CONSTANTS, GAME_MODE,
		ROOM_ID_LENGTH,
		utils: {
            ...gameUtils,
			generateRoomID, randomChar
		}
	});
});


// Redirect other URLs to root
router.get('*', (req, res) => {
	res.redirect(308, '/');
});

module.exports = router;
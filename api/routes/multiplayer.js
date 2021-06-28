const multiplayerRouter = require('express').Router();
const { getIP } = require('../../utils');
const { validateStr, isValidNum } = require('../../utils/validate');
const {
	GAME_CONSTANTS,
	GAME_MODE,
	PLAYER_ROLE,
	ROOM_ID_LENGTH
} = require('../../constants');

global.rooms = [];

const getRoomIndex = (roomID, resolve, reject) => {
	const room = global.rooms.find(room => room.id === roomID);
	if (!room) return reject (room);

	return resolve(global.rooms.indexOf(room));
};

const filterPlayer = player => {
	/*
		id (combination of socketID and remote address) will be used
		to identify server-side, while socketID for client-side,
		in order not to expose players' IP address
	*/
	const playerClone = Object.assign({}, player);
	delete playerClone.uid;
	delete playerClone.ip;
	return playerClone;
};

multiplayerRouter.post('/create-room', (req, res) => {
	try {
		// Validate IP
		const ip = getIP(req);
		// Find out if this IP is admin in any of the rooms already
		const userAdminInAnyRoom = global.rooms.find(room => {
			try {
				return room.admin.ip === ip;
			} catch { return false }
		}); // returns a room in which our user is admin, or undefined

		// Redirect user to their room
		if (!!userAdminInAnyRoom) {
			return res.status(403).json({
				success: true,
				msg: 'You can only own one room',
				errcode: 2,
				roomID: userAdminInAnyRoom.id
			});
		}


		// Validate room
		const room = req.body;
		const { id, name, admin, settings} = room;
		let adminName = admin.name.trim();
		const { goblets, shuffleCount, shuffleSpeed, gameMode } = settings;

		if (!id || id.length !== ROOM_ID_LENGTH || !validateStr(id)) {
			return res.status(400).json({ success: false, msg: 'Invalid room id' });
		}
		if (!adminName || adminName.length === 0) adminName = 'Player_1';
		if (!isValidNum(adminName.length, 1, GAME_CONSTANTS.maxPlayerNameLength)) {
			return res.status(400).json({ success: false, msg: 'Your name is too long ...' });
		}
		if (!validateStr(adminName)) {
			return res.status(400).json({ success: false, msg: 'Your name contains forbidden characters; please change it to continue' });
		}
		if (name.length > GAME_CONSTANTS.maxRoomNameLength) {
			return res.status(400).json({ success: false, msg: 'Your room name is too long ...' });
		}
		if (name && !validateStr(name)) {
			return res.status(400).json({ success: false, msg: 'Your room name contains forbidden characters; please change it to continue' });
		} 
		const roomName = name ? name.trim() : `${adminName}'s room`;
		if (!isValidNum(
			goblets,
			GAME_CONSTANTS.minGoblets,
			GAME_CONSTANTS.maxGoblets
		)) {
			return res.status(400).json({ success: false, msg: 'The goblets count setting does not fall in the correct range' });
		}
		if (!isValidNum(
			shuffleCount,
			GAME_CONSTANTS.minShuffleCount,
			GAME_CONSTANTS.maxShuffleCount
		)) {
			return res.status(400).json({ success: false, msg: 'The shuffle count setting does not fall in the correct range' });
		}
		if (!isValidNum(
			shuffleSpeed,
			GAME_CONSTANTS.minShuffleSpeed,
			GAME_CONSTANTS.maxShuffleSpeed
		)) {
			return res.status(400).json({ success: false, msg: 'The speed setting does not fall in the correct range' });
		}

		// Validate game mode
		let gameModeValidated = { // Default game mode
			mode: GAME_MODE.REACH_SCORE,
			scoreToReach: GAME_CONSTANTS.defaultScoreToReach
		}; 
		if (gameMode && gameMode.mode){
			switch (gameMode.mode) {
				case GAME_MODE.REACH_SCORE:
					if (typeof gameMode.scoreToReach !== 'number') return res.status(403).json({ success: false, msg: 'Score to reach is invalid !' });
					if (gameMode.scoreToReach < GAME_CONSTANTS.minScoreToReach) {
						return res.status(403).json({ success: false, msg: `Score to reach should be at least ${GAME_CONSTANTS.minScoreToReach}` });
					}
					if (gameMode.scoreToReach > GAME_CONSTANTS.maxScoreToReach) {
						return res.status(403).json({ success: false, msg: `Score to reach should be max ${GAME_CONSTANTS.maxScoreToReach}` });
					}

					gameModeValidated = gameMode;
					break;
				case GAME_MODE.COUNTDOWN:
					if (typeof gameMode.countdown !== 'number') return res.status(403).json({ success: false, msg: 'Countdown timer value is invalid !' });
					if (gameMode.countdown < GAME_CONSTANTS.minCountdown) {
						return res.status(403).json({ success: false, msg: `Cannot set countdown lower than ${GAME_CONSTANTS.minCountdown} seconds` });
					}
					if (gameMode.countdown > GAME_CONSTANTS.maxCountdown) {
						return res.status(403).json({ success: false, msg: `Cannot set countdown higher than 30 minutes` });
					}

					gameModeValidated = gameMode;
					break;
				default: //
			}
		}
		settings.gameMode = gameModeValidated;

		// Check if room already exists
		let roomInMemory = global.rooms.find(room => room.id === id);
		if (!!roomInMemory) {
			return res.status(409).json({ success: false, msg: 'This room id is already in use, try again' });
		}

		// Add new room
		const createdRoom = {
			...room,
			name: roomName,
			isPlaying: false,
			gameStart: null,
			gameStartCountdown: null,
			settings,
			admin: {
				...room.admin,
				ip,
				name: adminName,
				role: PLAYER_ROLE.ADMIN
			},
			players: []
		};
		global.rooms.push(createdRoom);
		return res.status(200).json({ success: true, msg: '' });

	} catch (err) {
		console.log(err);
		return res.status(500).json({ success: false, msg: 'Unknown server error' });
	}
});

module.exports = {
	multiplayerRouter,
	getRoomIndex,
	filterPlayer
};
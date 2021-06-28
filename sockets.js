const { Server } = require('socket.io');
const {
	getRoomIndex,
	filterPlayer
} = require('./api/routes/multiplayer');
const {
	GAME_CONSTANTS, 
	PLAYER_ROLE, 
	GAME_START_COUNTDOWN, 
	GAME_MODE,
	ROOM_TTL
	} = require('./constants');
const { randomInt } = require('./utils/math');
const { validateStr, limitNum } = require('./utils/validate');

function getIP (socket) {
	return socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
}

module.exports = server => {
	// Timers
	const roomDeletionTimer = {};
	const gameStartTimer = {};
	const countdownTimer = {};

	const io = new Server(server, {
		cors: {
			origin: ['http://localhost', process.env.DOMAIN_NAME],
			methods: ['GET', 'POST']
		}
	});

	io.on('connection', socket => {
		console.log('connect !');	
		
		// Enter room
		const { roomID } = socket.handshake.query;
		getRoomIndex(
			roomID,
			roomIndex => {
				if (!validateStr(socket.id)) return false; // prevent XSS

				const room = global.rooms[roomIndex];
				const ip = getIP(socket);
				// Look for IP address in room
				const uid = socket.id + ip;

				const playerInRoom = room.players.find(player => player.ip === ip);

				if (!playerInRoom) {
					// Player is not already in room
					
					// Abort deleting the room
					clearTimeout(roomDeletionTimer[roomID]);
					delete roomDeletionTimer[roomID];

					// Add player
					socket.join(roomID);
					const player = {
						uid, ip,
						socketID: socket.id,
						participates: false,
						score: 0
					};

					// Check if player is admin
					if (room.admin.ip === ip) {
						// Player is admin
						global.rooms[roomIndex].admin.uid = uid; // Set admin's current ID
						global.rooms[roomIndex].admin.socketID = socket.id;

						player.role = PLAYER_ROLE.ADMIN;
						player.name = room.admin.name;
					} else {
						// Player is not admin
						player.role = PLAYER_ROLE.BASIC;
						player.name = `Player_${room.players.length + 1}`;
					}
					global.rooms[roomIndex].players.push(player);

					// Notify other players about player join
					io.to(roomID).emit('player join', filterPlayer(player));
				} else {
					// Player is already in the room
					// Check if player is admin
					if (room.admin.ip === ip) {
						// Player is admin
						global.rooms[roomIndex].admin.uid = uid; // Update admin's IDs with new socket
						global.rooms[roomIndex].admin.socketID = socket.id;
						// Notify other players
						socket.broadcast.to(roomID).emit('admin ID change', socket.id);
					}
					// Update players with current player's new IDs
					let prevSocketID = null;
					global.rooms[roomIndex].players = room.players.map(player => {
						if (player.ip === ip) {
							prevSocketID = player.socketID;
							player.socketID = socket.id;
							player.uid = uid;
							return player;
						} 
						return player;
					});
					// Notify other players
					socket.broadcast.to(roomID).emit('player ID change',
						{ previous: prevSocketID, current: socket.id }
					);
				}
			},
			() => socket.disconnect(true)
		);

		// Game start
		socket.on('start game', () => {
			// Get current room
			getRoomIndex(
				roomID,
				roomIndex => {
					const room = global.rooms[roomIndex];
					const ip = getIP(socket);

					// Only admin can start games
					console.log('user with IP: ' + ip + ' tries to start game')
					if ( room && room.admin.ip === ip ) {
						// Start countdown
						const ms = GAME_START_COUNTDOWN * 1000;
						io.to(roomID).emit('game start countdown');
						global.rooms[roomIndex].gameStartCountdown = Date.now();

						gameStartTimer[roomID] = setTimeout(() => {
							try {
								// Reset timer ID
								global.rooms[roomIndex].gameStartCountdown = null;
								// There needs to be at least 2 participating players
								const participants = room.players.filter(player => player.participates);
								if ( participants.length > 1 ) {
									// Successfully starting game
									// Modify room status
									global.rooms[roomIndex].isPlaying = true;
									global.rooms[roomIndex].gameStart = Date.now();
									// Notify players
									io.to(roomID).emit('game start');

									// In COUNTDOWN mode, start countdown at game start
									if (room.settings.gameMode.mode === GAME_MODE.COUNTDOWN) {
										countdownTimer[roomID] = setTimeout(() => {
											// Winner is the one who has the highest score at this moment
											let winner = participants[0];
											participants.forEach((participant, index) => {
												if (participant.score > winner.score) {
													// Get player with highest score
													winner = participant;
													// Set participate property to false
													global.rooms[roomIndex].players[index].participates = false;
												}
											});
											// Reset room variables
											global.rooms[roomIndex].isPlaying = false;
											global.rooms[roomIndex].gameStart = null;
											// Reset player variables
											room.players.forEach((player, index) => {
												global.rooms[roomIndex].players[index].participates = false;
												global.rooms[roomIndex].players[index].score = 0;
											});
											// Notify players about who's the winner
											io.to(roomID).emit('victory', winner.socketID);
										}, room.settings.gameMode.countdown * 1000);
									}
								} else {
									// Send error to admin
									if (room && room.admin.ip === ip) {
										socket.emit('error', { 
											type: 'get-ready',
											msg: 'There needs to be at least 2 participating players to start a game'
										});
									}
								}
							} catch {
								clearTimeout(gameStartTimer[roomID]);
								io.to(roomID).emit('abort game start');
								global.rooms[roomIndex].gameStart = null;
								global.rooms[roomIndex].gameStartCountdown = null;
							}
						}, ms);
					} // else You don't have the permission to start a game in this room
				},
				() => false 
			);
		});
		socket.on('abort game start', () => {
			// Get current room
			getRoomIndex(
				roomID,
				roomIndex => {
					const room = global.rooms[roomIndex];
					const ip = getIP(socket);
					// Only admin can abort game start
					if ( room && room.admin.ip === ip ) {
						// Stop timer
						clearTimeout(gameStartTimer[roomID]);
						// Notify players
						io.to(roomID).emit('abort game start');
						// Change room data
						global.rooms[roomIndex].gameStart = null;
						global.rooms[roomIndex].gameStartCountdown = null;
					} // else You don't have the permission to abort a game in this room
				},
				() => false 
			);
		});

		// Player
		socket.on('player change', ({ type, payload }) => {
			function isRequestFromSamePlayer (addConditions /*: Array<(room, player) => boolean>*/)
			/*: ({player, roomIndex, playerIndex, room}|false) */ {
				let returnValue = false;

				// Get current room
				getRoomIndex(
					roomID,
					roomIndex => {
						const room = global.rooms[roomIndex];
						const ip = getIP(socket);
						// Make sure user who sent the request has the same IP address as the registered player
						let playerIndex; // (get player index)
						const player = room.players.find((player, index) => {
							playerIndex = index;
							return player.ip === ip;
						});

						// Additional conditions that can reject the request
						if ( addConditions && addConditions.some(condition => !condition(room, player)) ) {
							return;
						}

						if (!!player) {
							// A player who verifies all the conditions has been found
							returnValue = { player, room, roomIndex, playerIndex };
							return true;
						}
					},
					() => false
				);

				return returnValue;
			}

			function updatePlayer (object, key, value/*{roomIndex, playerIndex}*/)/*: boolean*/ {
				try {
					if (
						!object.hasOwnProperty('roomIndex') ||
						!object.hasOwnProperty('playerIndex') ||
						!object.hasOwnProperty('player')
					) {
						return false;
					}

					const { roomIndex, playerIndex } = object;
					global.rooms[roomIndex].players[playerIndex][key] = value;
					return true;
				} catch {
					return false;
				}
			}

			switch (type) {
				case 'rename player': {
					const name = payload; 
					if (!name || !validateStr(name)) break;

					// Player can only rename oneself
					const playerWhoCanBeRenamed = isRequestFromSamePlayer();
					if (!updatePlayer(playerWhoCanBeRenamed, 'name', name)) break;

					const { player } = playerWhoCanBeRenamed;
					socket.broadcast.to(roomID).emit('player renamed', player.socketID, name);
					break;

				} case 'participate': {
					/*
					  Additional condition:
					  Players can only participate as long as game has not started yet
					*/
					const hasGameNotStarted = room => !room.isPlaying;
					// Add condition: player must not be participating
					const isLurking = (room, player) => !player.participates;

					// Players can only decide to participate by their own choice
					const playerWhoCanParticipate = isRequestFromSamePlayer([hasGameNotStarted, isLurking])

					if (
						// Update player's state
						!updatePlayer(playerWhoCanParticipate, 'participates', true)
					) {
						break;
					}
					
					// Emit event
					const { player } = playerWhoCanParticipate;
					io.to(roomID).emit('participates', filterPlayer(player));
					break;

				} case 'give up': {
					// Players can only decide to stop participating by their own choice
					const playerWhoCanGiveUp = isRequestFromSamePlayer([(room, player) => {
						// Additional condition: player must be participating
						return player.participates;
					}]);
					
					if (
						// Update player's state
						!updatePlayer(playerWhoCanGiveUp, 'participates', false)
					) {
						break;
					}

					// Emit event
					const { player } = playerWhoCanGiveUp;
					io.to(roomID).emit('gave up', filterPlayer(player));
					break;
			
				} case 'score': {
					getRoomIndex(
						roomID,
						roomIndex => {
							const room = global.rooms[roomIndex];
							const ip = getIP(socket);
							let newScore = payload;

							// Player can only update his own score
							let playerIndex = null;
							const player = room.players.find((player, index) => {
								playerIndex = index;
								return player.ip === ip;
							});
							if (!player) return false;

							if (room.isPlaying) {
								// Limit score gain/loss during game
								const diff = payload - player.score; //  newScore - prevScore
								const validDiff = limitNum(
									diff,
									GAME_CONSTANTS.maxScoreLoss,
									GAME_CONSTANTS.maxScoreGain
								);
								if (validDiff === false) return false;
								newScore = player.score + validDiff;
							}

							// Update player's score
							try {
								// Memorize previous score
								const oldScore = global.rooms[roomIndex].players[playerIndex].score;
								// Update current score with new score
								global.rooms[roomIndex].players[playerIndex].score = newScore;
							} catch {
								return;
							}

							// Handle REACH_SCORE mode
							if (
								room.isPlaying && 
								room.settings.gameMode.mode === GAME_MODE.REACH_SCORE
							) {
								// Trigger victory event when a player has reached score
								if (newScore >= room.settings.gameMode.scoreToReach) {
									io.to(roomID).emit(
										'updated score',
											player.socketID, // socketID
											room.settings.gameMode.scoreToReach, // currentScore
											room.settings.gameMode.scoreToReach - oldScore // diff (gain/loss)
									);
									io.to(roomID).emit(
										'victory', player.socketID
									);
									// Reset room variables
									global.rooms[roomIndex].isPlaying = false;
									global.rooms[roomIndex].gameStart = null;
									// Reset player variables
									room.players.forEach((player, index) => {
										global.rooms[roomIndex].players[index].participates = false;
										global.rooms[roomIndex].players[index].score = 0;
									});
									return true;
								}
							}

							// Emit event (notify other players about new score)
							io.to(roomID).emit(
								'updated score', player.socketID, newScore, validDiff
							);
						},
						() => false
					);
					break;

				} default: return false;
			}
		});

		// Room settings
		socket.on('room setting change', ({ type, value }) => {
			getRoomIndex(
				roomID,
				roomIndex => {
					const room = global.rooms[roomIndex];
					const ip = getIP(socket);
					// Only admin can change the room's settings
					if (room.admin.ip !== ip) return false
					// Cannot change settings during game
					if (room.isPlaying) {
						socket.emit('error', {
							type: 'game-settings',
							msg: 'Cannot change settings during game !'
						});
						return false;
					}

					// Validate new setting
					switch (type) {
						case 'goblets-count': {
							const validated = limitNum(
								parseInt(value),
								GAME_CONSTANTS.minGoblets,
								GAME_CONSTANTS.maxGoblets
							);
							if (validated === false) {
								socket.emit('error', {
									type: 'game-settings',
									msg: `Invalid number of goblets ! It should be between ${GAME_CONSTANTS.minGoblets} and ${GAME_CONSTANTS.maxGoblets}`
								});
								return false;
							}

							global.rooms[roomIndex].settings.goblets = validated;
							socket.broadcast.to(roomID).emit('game setting changed', {
								type, value: validated
							});
							break;
						} case 'shuffle-count': {
							const validated = limitNum(
								parseInt(value),
								GAME_CONSTANTS.minShuffleCount,
								GAME_CONSTANTS.maxShuffleCount
							);
							if (validated === false) {
								socket.emit('error', {
									type: 'game-settings',
									msg: `Invalid number of goblet permutations ! It should be between ${GAME_CONSTANTS.minShuffleCount} and ${GAME_CONSTANTS.maxShuffleCount}`
								});
								return false;
							}

							global.rooms[roomIndex].settings.shuffleCount = validated;
							socket.broadcast.to(roomID).emit('game setting changed', {
								type, value: validated
							});
							break;
						} case 'shuffle-speed': {
							const validated = limitNum(
								parseFloat(value),
								GAME_CONSTANTS.minShuffleSpeed,
								GAME_CONSTANTS.maxShuffleSpeed
							);
							if (validated === false) {
								socket.emit('error', {
									type: 'game-settings',
									msg: 'Invalid shuffle speed !'
								});
								return false;
							}

							global.rooms[roomIndex].settings.shuffleSpeed = validated;
							socket.broadcast.to(roomID).emit('game setting changed', {
								type, value: validated
							});
							break;
						} case 'game-mode': {
							const isValidMode = Object.keys(GAME_MODE).includes(value);
							if (!isValidMode) {
								socket.emit('error', {
									type: 'game-settings',
									msg: 'This game mode does not exist'
								});
								return false;
							}

							global.rooms[roomIndex].settings.gameMode.mode = value;
							io.to(roomID).emit('game setting changed', { type, value });
							break;
						} case 'score-to-reach': {
							const validated = limitNum(
								parseInt(value),
								GAME_CONSTANTS.minScoreToReach,
								GAME_CONSTANTS.maxScoreToReach
							)
							if (validated === false) {
								socket.emit('error', {
									type: 'game-settings',
									msg: `Invalid score ! It should be between ${GAME_CONSTANTS.minScoreToReach} and ${GAME_CONSTANTS.maxScoreToReach}`
								});
								return false;
							}
							global.rooms[roomIndex].settings.gameMode = { mode: GAME_MODE.REACH_SCORE, scoreToReach: value };
							io.to(roomID).emit('game setting changed', { type, value });
							break;
						} case 'countdown': {
							const validated = limitNum(
								parseInt(value),
								GAME_CONSTANTS.minCountdown,
								GAME_CONSTANTS.maxCountdown
							);
							if (validated === false) {
								socket.emit('error', {
									type: 'game-settings',
									msg: `Invalid countdown ! It should be between ${GAME_CONSTANTS.minCountdown} and ${GAME_CONSTANTS.maxCountdown}`
								});
								return false;
							}
							global.rooms[roomIndex].settings.gameMode = { mode: GAME_MODE.COUNTDOWN, countdown: value };
							io.to(roomID).emit('game setting changed', { type, value });
							break;
						} default: return false;
					}
				},
				() => false
			);
		});
		
		// Chat
		socket.on('chat msg', (unescapedMSG) => {
			if (!unescapedMSG) return;
			// No need to verify socket belongs to a player who is in this room
			io.to(roomID).emit('chat msg', {
				socketID: socket.id,
				msg: unescapedMSG,
				timestamp: Date.now()
			});
		});

		// Disconnect
		socket.on('disconnect', () => {
			// Delete user from room
			console.log('disconnect')
			getRoomIndex(
				roomID,
				roomIndex => {
					const room = global.rooms[roomIndex];
					const ip = getIP(socket);
					// Look for IP address in room
					const uid = socket.id + ip;
					const playerInRoom = room.players.find(player => player.ip === ip);

					if (playerInRoom) {
						// Player is still in the room
						socket.leave(roomID); // Leave room

						// Remove player
						const remainingPlayers = global.rooms[roomIndex].players.filter(player => {
							return player.uid !== uid;
						});
						global.rooms[roomIndex].players = remainingPlayers;

						// Delete room if there's no player left in the group
						if (remainingPlayers.length <= 0) {
							// Delete room after 5 seconds
							roomDeletionTimer[roomID] = setTimeout(() => {
								global.rooms = global.rooms.filter(room => room.id !== roomID);
								delete roomDeletionTimer[roomID];
								// Clear all timers/intervals related to this room
								clearInterval(gameStartTimer[roomID]); delete gameStartTimer[roomID];
								clearInterval(countdownTimer[roomID]); delete countdownTimer[roomID];
							}, ROOM_TTL * 1000);

						} else {
							// Notify other players about player leave
							socket.broadcast.to(roomID).emit('player leave', playerInRoom.socketID);

							// Make new admin if leaving user was admin
							if (playerInRoom.role === PLAYER_ROLE.ADMIN) {
								// Give ADMIN role to random remaining player
								const playerIndex = randomInt(0, remainingPlayers.length - 1);
								const newAdmin = remainingPlayers[playerIndex];
								global.rooms[roomIndex].admin = newAdmin; // Set new admin to room
								newAdmin.role = PLAYER_ROLE.ADMIN;
								remainingPlayers[playerIndex] = newAdmin;
								global.rooms[roomIndex].players = remainingPlayers;

								// Notify other players about new admin
								socket.broadcast.to(roomID).emit('new admin', newAdmin.socketID);
							}
						}
					}
				},
				() => false
			);
		});
	});
};
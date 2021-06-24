// GAME
var participantsUL = document.getElementById('participants-list');
var lurkersUL = document.getElementById('lurkers-list');

var getReadySection = document.getElementById('get-ready-section');

// Game start countdown
var startMultiPlayerGameBtn = document.getElementById('start-multiplayer-game-btn');
var countdownBfGame = document.getElementById('countdown-before-game');
var gameStartTimer = null;
var gameStartInterval = null;
function resetGameStartCountdown () {
	// Reset timeout & interval
	window.clearInterval(gameStartInterval);
	gameStartInterval = null;
	window.clearTimeout(gameStartTimer);
	gameStartTimer = null;
	// Hide timer
	gameStartCountdown = GAME_START_COUNTDOWN;
	countdownBfGame.textContent = GAME_START_COUNTDOWN;
	countdownBfGame.classList.add('hidden');
	// Reset game start button
	if (startMultiPlayerGameBtn) {
		startMultiPlayerGameBtn.textContent = 'Start game';
		startMultiPlayerGameBtn.className = 'btn btn-success start-game';
		startMultiPlayerGameBtn.onclick = triggerGameStartCountdown;
	}
}

function updateGetReadySection () {
	if (isPlaying) {
		return '<p>This room is playing right now; you will be able to join when they create a new game.</p>';
	}
	var amParticipating = participants.find(function (player) {
		return player.socketID === socket.id;
	});

	var joinGameSection = '';
	if (!amParticipating) {
		joinGameSection = '<section class="join-game-section">' +
			( isAdmin ? '<p class="msg">You need at least 2 participating players to play</p>' : '' ) +
			'<button class="btn btn-primary join" id="join-game-btn" onclick="participate(true);">' +
				'Join' +
			'</button>' +
		'</section>'
	} else {
		joinGameSection = '<section class="join-game-section">' +
			( isAdmin ? '<p class="msg">You need at least 2 participating players to play</p>' : '' ) +
			'<button class="btn btn-danger leave" id="join-game-btn" onclick="participate(false);">' +
				'Leave' +
			'</button>' +
		'</section>'
	}

	var startGameSection = '';
	if (isAdmin) {
		startGameSection = '<section class="start-game-section">' +
			'<p>' +
				'Once the game starts you won\'t be able to join it or modify the settings until it\'s finished !' +
			'</p>' +
			'<button ' +
				'class="btn btn-success start-game"' +
				'onclick="triggerGameStartCountdown();"' +
				'id="start-multiplayer-game-btn"' +
			'>' +
				'Start game' +
			'</button>' +
		'</section>'
	} else {
		startGameSection = '<section class="start-game-section">' +
			'<p>' +
				'Once the game starts you won\'t be able to join it until it\'s finished !' +
			'</p>' +
		'</section>'
	}

	var countdownSection = '<p ' +
		'class="hidden"' +
		'id="countdown-before-game"' +
	'>' +
		+ GAME_START_COUNTDOWN +
	'</p>';
	var hr = '<div class="hr" style="background: #FFFA;"></div>';

	// Update
	getReadySection.innerHTML = joinGameSection + hr + startGameSection + hr + countdownSection;

	startMultiPlayerGameBtn = document.getElementById('start-multiplayer-game-btn');
	countdownBfGame = document.getElementById('countdown-before-game');
}

function createPercentageBar (score, scoreToReach, socketID) {
	var percentageBar = document.createElement('div');
	percentageBar.className = 'percentage-bar';
	var content = document.createElement('div');
	content.setAttribute('id', 'player_' + socketID + '_percentage');
	var percentage = (score / scoreToReach) * 100;
	content.style.width = percentage + '%';
	percentageBar.appendChild(content);
	return percentageBar;
}
function updatePlayerScore (
	id, 
	newScore, 
	updateState = true, 
	sort = true
) {
	// Set player's score in DOM
	// Looking for player score to update in DOM
	var playerScore = document.getElementById('player_' + id + '_score');
	if (playerScore) {
		playerScore.textContent = newScore;
	}

	if (settings.gameMode.mode === GAME_MODE.REACH_SCORE) {
		// Looking for player percentage bar in DOM
		var playerPercentage = document.getElementById('player_' + id + '_percentage');
		if (playerPercentage) {
			var percentage = newScore / settings.gameMode.scoreToReach * 100;
			playerPercentage.style.width = percentage + '%';
		}
	}

	// Update state
	if (updateState) {
		players = players.map(function (player) {
			if (player.socketID === id) {
				return { ...player, score: newScore };
			}
			return player;
		});
		participants = participants.map(function (player) {
			if (player.socketID === id) {
				return { ...player, score: newScore };
			}
			return player;
		});
	}

	// Sort participants
	if (sort) {
		sortParticipants();
	}
}

function addPlayer (player, ul, addClasses) {
	// Check that player is not already there
	var idAttribute = 'player_' + player.socketID;
	if (!!document.getElementById(idAttribute)) {
		return false;
	}

	// Mutate state
	players.push(player);
	if (ul == participantsUL) {
		participants.push(player);
	} else if (ul == lurkersUL) {
		lurkers.push(player);
	}

	// Create new li element
	var li = document.createElement('li');
	var playerName;

	// Add classes
	li.className = 'player';
	var participatesClass = player.participates ? 'participant' : 'lurker';
	li.classList.add(participatesClass);
	if (player.role === 'ADMIN') {
		// This player is admin
		li.classList.add('admin');
	}
	if (Array.isArray(addClasses)) { // Allow function to add more classes
		addClasses.forEach(function (className) {
			li.classList.add(className);
		});
	}

	if (player.socketID === socket.id) {
		// This player is me
		li.classList.add('me');
		// Player name is an input element
		var form = document.createElement('form');
		form.className = 'player-name-form';
		playerName = document.createElement('input');
		function changeName () { // On player name change
			playerName.blur();

			if (!playerName.value) {
				// Reset to previous name if input is empty
				playerName.value = player.name;
				return;
			}

			// Change name
			localStorage['player-name'] = playerName.value;
			playerName.title = playerName.value + ' (YOU)';
			socket.emit('player change', { 
				type: 'rename player',
				payload: playerName.value
			});
		}
		form.onsubmit = function (e) {
			e.preventDefault();
			changeName();
		};
		playerName.value = player.name;
		playerName.title = player.name + ' (YOU)';
		playerName.oninput = function (e) { // Prevent from typing forbidden characters
			var sanitized = sanitizeStr(e.target.value);
			e.target.value = sanitized;
		}
		playerName.onchange = changeName;
		playerName.className = 'player-name';
		playerName.setAttribute('autofocus', true);
		playerName.setAttribute('id', idAttribute + '_name');
		
		form.appendChild(playerName);
		li.appendChild(form);
	} else {
		// This player is not me
		li.classList.add('other');
		// Player name is a 4th lvl title
		playerName = document.createElement('h4');
		playerName.className = 'player-name';
		playerName.textContent = player.name;
		playerName.setAttribute('id', idAttribute + '_name');
		li.appendChild(playerName);
	}

	// Set ID attribute on li (socketID)
	li.setAttribute('id', idAttribute);

	// Do additional stuff depending on which list we're adding player to
	if (ul === participantsUL) {
		// Adding to participants
		if (settings.gameMode.mode === GAME_MODE.REACH_SCORE) {
			// Playing in REACH_SCORE mode
			// Append percentage bar to li
			var percentageBar = createPercentageBar(
				player.score,
				settings.gameMode.scoreToReach,
				player.socketID
			);
			li.appendChild(percentageBar);
		}
		// Append score to li
		var scoreStr = document.createElement('strong');
		scoreStr.setAttribute('id', idAttribute + '_score');
		scoreStr.className = 'player-score';
		scoreStr.textContent = player.score;
		li.appendChild(scoreStr);
	}

	// Append list of chat messages
	var chatMsgList = document.createElement('ul');
	chatMsgList.className = 'msg-list';
	var chatMsgListID = 'player_' + player.socketID + '_msg_list';
	chatMsgList.setAttribute('id', chatMsgListID);
	li.appendChild(chatMsgList);

	// Append li to ul
	if (ul.appendChild) {
		ul.appendChild(li);
	}

	// Increment player list title
	var title = ul.previousElementSibling;
	if (title && title.dataset) {
		var content = title.textContent;
		title.dataset.number++;
		var replaced = content.replace(/\([0-9]+\)/, '(' + title.dataset.number + ')');
		title.textContent = replaced;
		title.setAttribute('title', replaced);
	}
}
function removePlayer (socketID) {
	// Get player's list item DOM element
	var idAttribute = 'player_' + socketID;
	var li = document.getElementById(idAttribute);
	if (li) {
		var ul = li.parentElement;
		if (ul) {
			ul.removeChild(li);
			// Decrement player list title
			var title = ul.previousElementSibling;
			if (title && title.dataset) {
				var content = title.textContent;
				title.dataset.number--;
				var replaced = content.replace(/\([0-9]+\)/, '(' + title.dataset.number + ')');
				title.textContent = replaced;
				title.setAttribute('title', replaced);
			}
			// Mutate state
			players = players.filter(function (player) {
				return player.socketID !== socketID;
			});
			if (ul == lurkersUL) {
				lurkers = lurkers.filter(function (player) {
					return player.socketID !== socketID;
				});
			} else if (ul == participantsUL) {
				participants = participants.filter(function (player) {
					return player.socketID !== socketID;
				});
			}
		}
	}

	/*// Check if there are enough participants for a game during gamestart countdown
	if ( gameStartTimer !== null && participants.length < 2 ) {
		// Stop countdown and reset counter
		if (isAdmin) {
			socket.emit('abort game start');
		}
	}*/
}

function participate (boolean) {
	if (boolean) {
		// Player tries to participate
		socket.emit('player change', { type: 'participate' });
	} else {
		// Player tries to stop participating
		socket.emit('player change', { type: 'give up' });
	}
}

function triggerGameStartCountdown () {
	if (
		gameStartTimer === null && gameStartInterval === null
		//&& !isPlaying && participants.length > 1
	) {
		socket.emit('start game');
	}
}
function handleGameStartCountdown (ms = GAME_START_COUNTDOWN*1000) {
	// Change start button
	if (startMultiPlayerGameBtn) {
		startMultiPlayerGameBtn.onclick = function () {
			socket.emit('abort game start');
		}
		startMultiPlayerGameBtn.className = 'btn btn-danger start-game';
		startMultiPlayerGameBtn.textContent = 'Abort start';
	}

	// Start countdown
	countdownBfGame.classList.remove('hidden');

	window.clearInterval(gameStartInterval); // In case an interval had started
	gameStartInterval = window.setInterval(function () {
		gameStartCountdown--;
		countdownBfGame.textContent = gameStartCountdown;
	}, 1000);

	// Stop interval after correct time
	window.clearTimeout(gameStartTimer);
	gameStartTimer = window.setTimeout(function () {
		resetGameStartCountdown();
		// Start game (should receive 'game start' event)
	}, ms);
}

function sortParticipants (asc = false) {
	// Sort participants by score
	if (asc) {
		// From lowest to highest
		participants.sort(function (a, b) {
			return a.score - b.score;
		});
	} else {
		// From highest to lowest
		participants.sort(function (a, b) {
			return b.score - a.score;
		});
	}
	// Update DOM
	participants.forEach(function (player, index, array) {
		// Get corresponding li DOM element
		var li = document.getElementById('player_' + player.socketID);
		li.style.order = index - array.length - 1;
	});
}

function handleMultiPlayerError (err) {
	switch (err.type) {
		case 'get-ready': {
			if (!getReadySection) {
				return false;
			}
			// Check if there's a message already
			var preexistingErrPara = document.getElementById('get-ready-error');
			if (preexistingErrPara) {
				preexistingErrPara.parentElement.removeChild(preexistingErrPara);
			}
			// Create error message in 'get-ready' section
			var errPara = document.createElement('p');
			errPara.id = 'get-ready-error';
			errPara.className = 'alert alert-danger flicker';
			errPara.innerHTML = err.msg + ' <button class="close-btn" ' + 
				'onclick="this.parentElement.parentElement.removeChild(this.parentElement);">' + 
				'<i class="fa fa-times"></i></button>';
			getReadySection.appendChild(errPara);
			errPara.scrollIntoView({
				behavior: 'smooth',
				inline: 'start', block: 'nearest'
			});
			return true;
		} case'game-settings': {
			console.log('game settings error: ')
			console.log(err.msg)
			return true;
		} default: return false;
	}
}

// CHAT
var chatForm = document.getElementById('chat-form');
if (chatForm) {
	chatForm.onsubmit = handleChatFormSubmit;
}
var chatFormInput = document.getElementById('chat-form-input');
function handleChatFormSubmit (e) {
	e.preventDefault();
	// Validation
	if (!chatFormInput) return;
	if (!chatFormInput.value) return;
	if (!socket) return;

	socket.emit('chat msg', chatFormInput.value);

	chatFormInput.value = '';
}

function handleChatMsgReception ({ socketID, timespan, msg }) {
	/*var ulID = 'player_' + socketID + '_msg_list';
	var ul = document.getElementById(ulID);
	if (ul) {
		var li = document.createElement('li');
		var liID = 'msg_from_' + socketID + 'at_' + timespan;
		li.setAttribute('id', liID);
		li.className = 'chat-msg';
		li.textContent = msg;
		ul.innerHTML = '';
		ul.appendChild(li);
	}*/
	console.log(msg)
}

// SOCKET EVENTS
// React to websocket events
window.addEventListener('load', function () {
	// Player joined a room
	socket.on('player join', function (player) {
		player.participates ? addPlayer(player, participantsUL) : addPlayer(player, lurkersUL);
		// Check if there are enough participants for a game
	});

	// PLayer left a room
	socket.on('player leave', function (socketID) {
		removePlayer(socketID);
	});

	// Player was renamed
	socket.on('player renamed', function (id, name) {
		// DOM
		var playerTitle = document.getElementById('player_' + id + '_name');
		if (playerTitle) {
			playerTitle.textContent = name;
			playerTitle.title = name;
		}
		// Mutate state
		// Change name in players list
		players = players.map(function (player) {
			if (player.socketID === id) {
				return { ...player, socketID: id };
			}
			return player
		});
		// Change name in participants list
		participants = participants.map(function (player) {
			if (player.socketID === id) {
				return { ...player, socketID: id };
			}
			return player
		});
		// Change name in lurkers list
		lurkers = lurkers.map(function (player) {
			if (player.socketID === id) {
				return { ...player, socketID: id };
			}
			return player
		});
	});

	// Player's score was modified
	socket.on('updated score', updatePlayerScore);

	// Player was accepted as a participant
	socket.on('participates', function (player) {
		removePlayer(player.socketID);
		addPlayer(player, participantsUL);
		// Change join btn if participating player is me
		if (player.socketID === socket.id) {
			var joinGameBtn = document.getElementById('join-game-btn');
			if (joinGameBtn) {
				joinGameBtn.textContent = 'Leave';
				joinGameBtn.className = 'btn btn-danger leave';
				joinGameBtn.onclick = function () {
					participate(false);
				};
			}
		}
	});

	// Player gave up
	socket.on('gave up', function (player) {
		// Remove player from list of participants and add to list of lurkers
		removePlayer(player.socketID);
		addPlayer(player, lurkersUL);

		if (!isPlaying) {
			// Game has not started
			// Change button if player who gave up is me
			if (player.socketID === socket.id) {
				var joinGameBtn = document.getElementById('join-game-btn');
				if (joinGameBtn) {
					joinGameBtn.textContent = 'Join';
					joinGameBtn.className = 'btn btn-primary join';
					joinGameBtn.onclick = function () {
						participate(true);
					};
				}
			}
		} else {
			// Game has started
			getReadySection.classList.remove('hidden');
			updateGetReadySection();
		}
	});

	// Admin changed the game settings
	socket.on('game setting changed', function ({ type, value }) {
		switch (type) {
			case 'goblets-count': {
				settings.goblets = value;
				setGoblets(value);
				break;
			} case 'shuffle-count': {
				settings.shuffleCount = value;
				break;
			} case 'shuffle-speed': {
				settings.shuffleSpeed = value;
				break;
			} case 'game-mode': {
				settings.gameMode.mode = value;
				switch (value) {
					case GAME_MODE.REACH_SCORE:
						// Hide timer
						if (timeOutput) {
							timeOutput.style.display = 'none';
						}
						break;
					case GAME_MODE.COUNTDOWN:
						// Display timer
						if (timeOutput) {
							timeOutput.style.display = 'block';
							timeOutput.className = 'fade-in';
						}
						break;
					default:
				}
				break;
			} case 'score-to-reach': {
				settings.gameMode = { mode: GAME_MODE.REACH_SCORE, scoreToReach: value };
				break;
			} case 'countdown': {
				settings.gameMode = { mode: GAME_MODE.COUNTDOWN, countdown: value };
				// Update timer
				if (timeOutputM && timeOutputS) {
					var timeString = secondsToTimeStr(value);
					timeOutputM.textContent = timeString.m;
					timeOutputS.textContent = timeString.s;
				}				
				break;
			} default: return;
		}
	});

	// Admin started countdown (before game)
	socket.on('game start countdown', handleGameStartCountdown);

	// Admin cancelled game start during countdown
	socket.on('abort game start', resetGameStartCountdown);

	// Game started
	socket.on('game start', function () {
		//if ( participants.length > 1 ) {
			isPlaying = true;
			var amParticipating = participants.find(function (participant) {
				return participant.socketID === socket.id;
			});
			if ( !!amParticipating ) {
				// I am participating
				getReadySection.classList.add('hidden');
				onPlay();
			} else {
				// I'm not participating
				updateGetReadySection();
			}
		//}
	});

	socket.on('victory', function (socketID) {
		const winner = participants.find(function (thisPlayer) {
			return thisPlayer.socketID === socketID;
		});
		if (!!winner) {
			// End game
			endGame(winner);

			// Reset game variables
			isPlaying = false;

			// Do something for each participant
			participants.forEach(function (player) {
				// Reset everybody's score
				player.score = 0;
				updatePlayerScore(
					player.socketID,
					0, 
					false, 
					false
				);

				// Add all participants to list of lurkers
				removePlayer(player.socketID);
				addPlayer(player, lurkersUL);
			});

			// Show 'get-ready' section
			getReadySection.classList.remove('hidden');
			updateGetReadySection();
		}
	});

	socket.on('new admin', function (id) {
		if (id === socket.id) {
			// I am the new admin
			isAdmin = true;
			updateGetReadySection();
		} else {
			// New admin is another player
		}
	});

	// User receives an error
	socket.on('error', function (err) {
		handleMultiPlayerError(err);
	});

	// Someone sent a message to our room
	socket.on('chat msg', handleChatMsgReception);
}, false);
var participantsUL = document.getElementById('participants-list');
var lurkersUL = document.getElementById('lurkers-list');

var getReadySection = document.getElementById('get-ready-section');

// Game start countdown
var startMultiPlayerGameBtn = document.getElementById('start-multiplayer-game-btn');
var countdownBfGame = document.getElementById('countdown-before-game');
var gameStartTimer = null;
var gameStartInterval = null;
function resetGameStartCountdown () {
	window.clearInterval(gameStartInterval);
	gameStartInterval = null;
	window.clearTimeout(gameStartTimer);
	gameStartTimer = null;
	gameStartCountdown = GAME_START_COUNTDOWN;
	countdownBfGame.textContent = GAME_START_COUNTDOWN;
	countdownBfGame.classList.add('hidden');
}

function createPercentageBar (score, scoreToReach) {
	var percentageBar = document.createElement('div');
	percentageBar.className = 'percentage-bar';
	var content = document.createElement('div');
	var percentage = (score / scoreToReach) * 100;
	content.style.width = percentage + '%';
	percentageBar.appendChild(content);
	return percentageBar;
}

function addPlayer (player, ul, addClasses) {
	// Check that player is not already there
	var idAttribute = 'player_' + player.socketID;
	if (!!document.getElementById(idAttribute)) {
		return false;
	}

	// Add player to lists in state
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
		playerName = document.createElement('input');
		playerName.value = player.name;
		playerName.title = player.name + ' (YOU)';
		playerName.oninput = function (e) { // Prevent from typing forbidden characters
			var sanitized = sanitizeStr(e.target.value);
			e.target.value = sanitized;
		}
		playerName.onchange = function (e) { // On player name change
			if (!e.target.value) {
				// Reset to previous name if input is empty
				e.target.value = player.name;
				return;
			}

			localStorage['player-name'] = e.target.value;
			e.target.title = e.target.value + ' (YOU)';
			socket.emit('player change', { 
				type: 'rename player',
				payload: e.target.value
			});
		};
		playerName.className = 'player-name';
		playerName.setAttribute('autofocus', true);
	} else {
		// This player is not me
		li.classList.add('other');
		// Player name is a 4th lvl title
		playerName = document.createElement('h4');
		playerName.textContent = player.name;
	}
	playerName.setAttribute('id', 'player_' + player.socketID + '_name');
	li.appendChild(playerName);

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
				settings.gameMode.scoreToReach
			);
			li.appendChild(percentageBar);
		}
		// Append score to li
		var scoreStr = document.createElement('strong');
		scoreStr.className = 'player-score';
		scoreStr.textContent = player.score;
		li.appendChild(scoreStr);
	}

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
			// Remove player from lists in state
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

	// Check if there are enough participants for a game during gamestart countdown
	if ( gameStartTimer !== null && participants.length < 2 ) {
		// Stop countdown and reset counter
		resetGameStartCountdown();
	}
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
		&& !isPlaying && participants.length > 1
	) {
		socket.emit('start game');
	}
}

function handleMultiPlayerError (err) {}


// React to websocket events
window.addEventListener('load', function () {
	// Player joined a room
	socket.on('player join', function (player) {
		player.participates ? addPlayer(player, participantsUL) : addPlayer(player, lurkersUL);
	});

	// PLayer left a room
	socket.on('player leave', function (socketID) {
		removePlayer(socketID);
	});

	// Player was renamed
	socket.on('player renamed', function (id, name) {
		var playerTitle = document.getElementById('player_' + id + '_name');
		if (playerTitle) {
			playerTitle.textContent = name;
			playerTitle.title = name;
		}
	});

	// Player was accepted as a participant
	socket.on('participates', function (player) {
		removePlayer(player.socketID);
		addPlayer(player, participantsUL);
		// Change join btn
		var joinGameBtn = document.getElementById('join-game-btn');
		if (joinGameBtn) {
			joinGameBtn.textContent = 'Leave';
			joinGameBtn.className = 'btn btn-danger leave';
			joinGameBtn.onclick = function () {
				participate(false);
			};
		}
	});

	// Player gave up
	socket.on('gave up', function (player) {
		removePlayer(player.socketID);
		addPlayer(player, lurkersUL);
		// Change button
		var joinGameBtn = document.getElementById('join-game-btn');
		if (joinGameBtn) {
			joinGameBtn.textContent = 'Join';
			joinGameBtn.className = 'btn btn-primary join';
			joinGameBtn.onclick = function () {
				participate(true);
			};
		}
	});

	// Admin started countdown before game
	socket.on('game start countdown', function () {
		// Change start button
		startMultiPlayerGameBtn.onclick = function () {
			socket.emit('abort game start');
		}
		startMultiPlayerGameBtn.className = 'btn btn-danger start-game';
		startMultiPlayerGameBtn.textContent = 'Abort start';

		// Start countdown
		countdownBfGame.classList.remove('hidden');
		const ms = GAME_START_COUNTDOWN*1000;

		gameStartInterval = window.setInterval(function () {
			gameStartCountdown--;
			countdownBfGame.textContent = gameStartCountdown;
		}, 1000);

		// Stop interval after correct time
		gameStartTimer = window.setTimeout(function () {
			resetGameStartCountdown();
			// Start game (should receive 'game start' event)
		}, ms);
	});

	// Admin cancelled game start during countdown
	socket.on('abort game start', function () {
		resetGameStartCountdown();
		startMultiPlayerGameBtn.onclick = triggerGameStartCountdown;
		startMultiPlayerGameBtn.className = 'btn btn-success start-game';
		startMultiPlayerGameBtn.textContent = 'Start game';
	});

	// Game started
	socket.on('game start', function () {
		console.log('Game started')
		var amParticipating = participants.find(function (participant) {
			return participant.socketID === socket.id;
		});
		if (!!amParticipating) {
			// I am participating
			isPlaying = true;
			getReadySection.classList.add('hidden');
			onPlay();
		} else {
			// I'm not participating
		}
	});

	// User receives an error
	socket.on('error', function (error) {
	});
}, false);
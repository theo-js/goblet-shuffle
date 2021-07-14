'use strict';

// GAME
var participantsUL = document.getElementById('participants-list');
var lurkersUL = document.getElementById('lurkers-list');

var getReadySection = document.getElementById('get-ready-section');
var chatHistorySection = document.getElementById('chat-history');
var chatHistoryBody = document.getElementById('chat-history-body');
var chatHistory = document.getElementById('chat-history_msg-list');

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
function addPercentageBars (boolean) {
	if (boolean === true) {
		// Add percentage bars
		Array.from(participantsUL.children).forEach(function (li) {
			// Check if a percentage bar already exists
			var barExists = document.getElementById(li.id + '_percentage');
			if (!!barExists) return;

			// Find player ID
			var id = li.id.replace('player_', '');
			var percentageBar = createPercentageBar(
				0, // Since game mode cannot be changed during game, score is necessarily 0
				settings.gameMode.scoreToReach,
				id
			);
			// Append bar to li before player score
			var score = document.getElementById(li.id + '_score');
			if (score) {
				li.insertBefore(percentageBar, score);
			}
		});
	} else if (boolean === false) {
		// Remove percentage bars
		var bars = document.getElementsByClassName('percentage-bar');
		Array.from(bars).forEach(function (bar) {
			bar.parentElement.removeChild(bar);
		});
	}
}
function updatePlayerScore (
	id, 
	newScore,
	diff,
	updateState = true, 
	sort = true,
	anim = true
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

	// Player score animation
	if (anim) {
		scoreAnimation(
			diff < 0 ? 'loss' : 'gain', // ClassName
			playerScore, // Integer that will be displayed
			Math.abs(diff) // Sign is displayed with a pseudo-element
		);
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

			var newName = playerName.value.trim();

			if (!newName) {
				// Reset to previous name if input is empty
				playerName.value = player.name;
				return;
			}

			// Change name
			localStorage['player-name'] = newName;
			playerName.title = newName + ' (YOU)';
			socket.emit('player change', { 
				type: 'rename player',
				payload: newName
			});

			// Overwrite chat messages name in chat history
			changePlayerNameInChatHistory (socket.id, newName)

			// Update state
			players = players.map(function (player) {
				if (player.socketID === socket.id) {
					return { ... player, name: newName };
				}
				return player;
			});
			lurkers = lurkers.map(function (player) {
				if (player.socketID === socket.id) {
					return { ... player, name: newName };
				}
				return player;
			});
			participants = participants.map(function (player) {
				if (player.socketID === socket.id) {
					return { ... player, name: newName };
				}
				return player;
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

	// Append last chat message
	var lastChatMSG = document.createElement('p');
	lastChatMSG.className = 'last-msg';
	var lastChatMsgID = 'player_' + player.socketID + '_last-msg';
	lastChatMSG.setAttribute('id', lastChatMsgID);
	li.appendChild(lastChatMSG);

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
// Handle forms submit
var chatForm = document.getElementById('chat-form');
var chatFormInput = document.getElementById('chat-form-input');
if (chatForm) {
	chatForm.onsubmit = function (e) {
		handleChatFormSubmit(e, chatFormInput);
	};
}
// User can send msgs from within the 'chat history' as well as when it is closed
var chatFormInside = document.getElementById('chat-form-inside');
var chatFormInsideInput = document.getElementById('chat-form-inside-input');
if (chatFormInside) {
	chatFormInside.onsubmit = function (e) {
		handleChatFormSubmit(e, chatFormInsideInput);
	};
}

// Send msg
function handleChatFormSubmit (e, input) {
	e.preventDefault();
	// Validation
	if (!input) return;
	if (!input.value) return;
	if (!socket) return;

	socket.emit('chat msg', input.value);

	input.value = '';
}

// Receive msg
function handleChatMsgReception (msgObject) {
	if (msgObject.socketID && msgObject.timestamp && msgObject.msg) {
		displayMsgBubble(msgObject); // Last msg appears next to player's name
		appendMsgToChatHistory(msgObject); // History of all received messages (not persisting)
	}
}

// Display last msg next to player
function displayMsgBubble ({ socketID, msg}) {
	var paraID = 'player_' + socketID + '_last-msg';
	var para = document.getElementById(paraID);
	if (para) {
		para.setAttribute('data-empty', 'no');
		para.innerHTML = ''; // Clear previous content
		var span = document.createElement('span');
		span.className = 'content';
		span.textContent = msg.substring(0, 50);
		para.title = msg;
		para.appendChild(span);
		// Delete text on click
		para.onclick = function () {
			para.setAttribute('data-empty', 'yes');
			para.removeChild(span);
			para.removeAttribute('title');
		}
	}
}

// Manage chat history
// Check if user is trying to scroll up to read old msgs
var isReadingOldChats = false;
var chatHistoryScrollBtn = document.getElementById('chat-history_scrolldown-btn');
function handleChatHistoryScroll (scrollEv) {
	var chatHist = scrollEv.target;
	// Check what distance has been scrolled from the bottom of the chat history
	var scrollBottom = chatHist.scrollHeight - (chatHist.scrollTop + chatHist.clientHeight);
	var breakPoint = 100; // Distance from bottom in pxs from which software will consider that user tries to read old msgs
	isReadingOldChats = scrollBottom >= breakPoint;
	if ( isReadingOldChats ) {
		chatHistoryScrollBtn.classList.add('visible')
	} else {
		chatHistoryScrollBtn.classList.remove('visible');
	}
}
if ( chatHistory ) {
	chatHistory.addEventListener('scroll', handleChatHistoryScroll);
}
// Observe chat messages and mark as read
var chatHistoryObserverOptions = {
	root: chatHistory,
	rootMargin: '0px',
	threshold: 0.1
};
var chatHistoryObserver = new IntersectionObserver(handleChatHistoryMsgIntersect, chatHistoryObserverOptions);
function handleChatHistoryMsgIntersect (entries, observer) {
	entries.forEach(function (entry) {
		if (entry.isIntersecting) {
			// Mark as read
			entry.target.setAttribute('data-read', 'read');

			// Stop observing
			observer.unobserve(entry.target);

			// Update count of unread messages
			var msgCount = document.querySelector('#chat-history_msg-count');
			if (msgCount && msgCount.dataset) {
				var newCount = msgCount.dataset.count - 1;
				msgCount.setAttribute('data-count', newCount);
				msgCount.textContent = newCount;
			}

			// Change chat history scroll btn msg
			if (chatHistoryScrollBtn) {
				chatHistoryScrollBtn.classList.remove('new-msg');
				var btnTextContent = chatHistoryScrollBtn.firstElementChild;
				if (btnTextContent) btnTextContent.textContent = 'Scroll down';
			}
		}
	});
}
// Add msg to chat history
function appendMsgToChatHistory ({ socketID, timestamp, msg }) {
	if (chatHistory) {
		var li = document.createElement('li');
		li.className = 'chat-msg ' + socketID;
		li.id = 'msg_from_' + socketID + '_at_' + timestamp;
		li.setAttribute('data-timestamp', timestamp);
		li.setAttribute('data-read', 'read');

		// Check if previous message was sent by the same person
		var lis = Array.from(chatHistory.children);
		var lastMsg = lis[lis.length - 1];
		var isPrevMsgFromSamePlayer = false;
		try {
			var sameAuthorRegexp = new RegExp('^msg_from_' + socketID);
			var isPrevMsgFromSamePlayer = lastMsg.id.match(sameAuthorRegexp);
		} catch (e) {
			isPrevMsgFromSamePlayer = false;
		}
		li.classList.add(isPrevMsgFromSamePlayer ? 'prev==author' : 'prev!=author');
		// Check if previous message was sent more than x time ago
		var firstSinceXTime = false;
		if (lastMsg && lastMsg.dataset) {
			var maxTimeDiff = 1 * 60 * 1000; // amount of time since last message after which the class will be added
			var lastMsgTimestamp = lastMsg.dataset.timestamp;
			var timeDiff = Date.now() - lastMsgTimestamp;
			firstSinceXTime = timeDiff >= maxTimeDiff;
			if (firstSinceXTime) {
				li.classList.add('first-since-x-time');
			}
		}

		// Append date of emission by the server
		if (timestamp && typeof timestamp === 'number') {
			var span = document.createElement('span');
			span.className = 'date';
			var date = new Date(timestamp);

			// Format date
			var hours = date.getHours().toString();
			hours = (hours >= 0 && hours < 10) ? '0' + hours : hours // Add zero
			var mins = date.getMinutes().toString();
			mins = (mins >= 0 && mins < 10) ? '0' + mins : mins // Add zero
			var textContent = hours + ':' + mins;

			span.textContent = textContent;
			li.appendChild(span);
		}

		// Append author
		var author = players.find(function (player) {
			return player.socketID === socketID;
		});
		if (
			!!author && 
			author.name &&
			(!isPrevMsgFromSamePlayer || firstSinceXTime)
		) {
			var strong = document.createElement('strong');
			strong.className = 'author ' + socketID;
			strong.textContent = author.name;
			li.appendChild(strong);
		}

		// Append msg content
		var content = document.createElement('span');
		content.className = 'content';
		content.textContent = msg;
		li.appendChild(content);

		// Append msg to history
		chatHistory.appendChild(li);

		// Scroll down chat history
		var mustScrollDown = (
			!isReadingOldChats || 
			socketID === socket.id
		);
		if (mustScrollDown) {
			window.setTimeout(function () {
				if (chatHistory && chatHistory.scroll) {
					chatHistory.scroll({
						top: chatHistory.scrollHeight,
						left: 0,
						behaviour: 'smooth'
					});
				}
			}, 10);
		}

		// Message was sent by someone else
		if (socketID != socket.id) {
			// Msg is not read
			li.setAttribute('data-read', 'not-read');
			
			// Increment count of unread msgs
			var msgCount = document.querySelector('#chat-history_msg-count');
			if (msgCount && msgCount.dataset) {
				// Increment
				var count = msgCount.dataset.count;
				count++;
				// Validate
				if (!isValidNum(count)) {
					count = 0;
				}

				msgCount.textContent = count;
				msgCount.setAttribute('data-count', count);
			}
			// Observe new unread msg
			chatHistoryObserver.observe(li);
			// Change chat history scroll btn msg if user is reading old messages
			if (chatHistoryScrollBtn) {
				if (!chatHistoryScrollBtn.classList.contains('new-msg')) {
					chatHistoryScrollBtn.classList.add('new-msg');
				}
				var content = chatHistoryScrollBtn.firstElementChild;
				content.textContent = 'New messages';
			}
		}
	}
}

// Overwrite the name of a player in chat history
function changePlayerNameInChatHistory (socketID, newName) {
	var authorNames = Array.from(
		document.querySelectorAll('#chat-history_msg-list .chat-msg.' + socketID + ' .author')
	);
	authorNames.forEach(function (authorName) {
		authorName.textContent = newName;
	});
}

// Open/close chat history
function toggleChatHistory () {
	if (chatHistoryBody) {
		isReadingOldChats = false;
		var isClosed = chatHistoryBody.classList.contains('closed');
		if (isClosed) {
			// Open
			chatHistoryBody.classList.remove('closed');
			return true;
		} else {
			// Close
			chatHistoryBody.classList.add('closed');
			return false;
		}
	}
}
// Close chat on click outside
document.body.addEventListener('click', function (e) {
	// Do nothing if chat is already closed
	if (chatHistoryBody.classList.contains('closed')) {
		return;
	}

	// Detect click outside <aside id="chat-history"></aside>
	var isClickOutsideHistory = detectClickOutside(e, chatHistorySection);
	// Do not close if click is in chat form
	var form = document.getElementById('chat-form');
	var isClickOutsideForm = detectClickOutside(e, form);
	// Do not close if click is on color mode selector
	var isClickOutsideColModeToggler = detectClickOutside(
		e, document.querySelector(
			'.color-mode-toggle.' + (
				document.body.classList.contains('dark') ? 'light' : 'dark'
			)
		)
	);
	// Do not close if click is on player msg bubble
	var isClickOutsideMsgBubble = function () {
		var msgs = Array.from(document.querySelectorAll('.player .last-msg, .player .last-msg *'));
		if (msgs.includes(e.target)) {
			return false;
		}
		return true;
	};

	if (
		isClickOutsideHistory &&
		isClickOutsideForm &&
		isClickOutsideColModeToggler &&
		isClickOutsideMsgBubble()
	) {
		// Close
		toggleChatHistory();
	}
}, true);

// Register to push notifications
(function () {
	var chatHistoryHeader = document.querySelector('#chat-history > header'); // Element on which receive notifications btn will be appended
	if (
		!chatHistoryHeader ||
		!('Notification' in window) ||
		!('serviceWorker' in navigator) 
		|| Notification.permission !== 'default'
	) {
		return;
	}

	var btn = document.createElement('button');
	btn.className = 'receive-notif';
	btn.textContent = 'Receive notifications';
	btn.addEventListener('click', handleClick);
	chatHistoryHeader.appendChild(btn);
	function handleClick (e) {
		e.stopPropagation();
		askPermission();
	}

	async function askPermission () {
		var permission = await Notification.requestPermission();
		if (permission === 'granted') {
			registerServiceWorker();
		}
	}

	async function registerServiceWorker () {
		var swRegistration = await navigator.serviceWorker.ready;
		// Get subscription
		var subscription = await swRegistration.pushManager.getSubscription();
		
		if (!subscription) {
			subscription = await swRegistration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: await getPublicKey()
			});
			await saveSubscription(subscription);
		}

		btn.className = 'receive-notif subscribed';
		btn.disabled = true;
		btn.textContent = 'Subscribed';
		btn.removeEventListener('click', handleClick);
	}

	async function getPublicKey () {
		try {
			var res = await fetch('/api/push/key', {
				method: 'GET',
				headers: {
					Accept: 'application/json'
				}
			});
			var key = await res.json();
			return key;
		} catch (err) {
			return null;
		}
	}

	async function saveSubscription (subscription) {
		await fetch('/api/push/subscribe', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json;charset=UTF-8',
				'Accept': 'application/json',
				mode: 'cors'
			},
			body: JSON.stringify(subscription)
		});
	}
})();


// SOCKET EVENTS
// React to websocket events
window.addEventListener('load', function () {
	// Player joined a room
	socket.on('player join', function (player) {
		player.participates ? addPlayer(player, participantsUL) : addPlayer(player, lurkersUL);
		// Check if there are enough participants for a game
	});

	// Player left a room
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
				return { ...player, name };
			}
			return player
		});
		// Change name in participants list
		participants = participants.map(function (player) {
			if (player.socketID === id) {
				return { ...player, name };
			}
			return player
		});
		// Change name in lurkers list
		lurkers = lurkers.map(function (player) {
			if (player.socketID === id) {
				return { ...player, name };
			}
			return player
		});

		// Overwrite name in chat history
		changePlayerNameInChatHistory(player.socketID, name);
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
			case 'goblets-count':
				settings.goblets = value;
				setGoblets(value);
				break;
			case 'shuffle-count':
				settings.shuffleCount = value;
				break;
			case 'shuffle-speed':
				settings.shuffleSpeed = value;
				break;
			case 'stackGoblets':
			case 'gobletsDiversity':
				settings[type] = value;
				if (type === 'gobletsDiversity') {
					toggleGobletsDiversityClass(value);
				}
				break;
			case 'game-mode':
				settings.gameMode.mode = value;
				switch (value) {
					case GAME_MODE.REACH_SCORE:
						// Hide timer
						if (timeOutput) {
							timeOutput.style.display = 'none';
						}
						addPercentageBars(true);
						break;
					case GAME_MODE.COUNTDOWN:
						// Display timer
						if (timeOutput) {
							timeOutput.style.display = 'block';
							timeOutput.className = 'fade-in';
						}
						addPercentageBars(false);
						break;
					default:
				}
				break;
			case 'score-to-reach':
				settings.gameMode = { mode: GAME_MODE.REACH_SCORE, scoreToReach: value };
				break;
			case 'countdown': {
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
					0, 0,
					false, false, false
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
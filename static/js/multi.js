var participantsUL = document.getElementById('participants-list');
var lurkersUL = document.getElementById('lurkers-list');

function addPlayer (player, ul, addClasses) {
	// Check that player is not already there
	var idAttribute = 'player_' + player.socketID;
	if (!!document.getElementById(idAttribute)) {
		return false;
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
		// Player name is a 4th lvl title
		playerName = document.createElement('h4');
		playerName.textContent = player.name;
	}
	playerName.setAttribute('id', 'player_' + player.socketID + '_name');
	li.appendChild(playerName);

	// Set ID attribute on li (socketID)
	li.setAttribute('id', idAttribute);

	// Append to ul
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
		}
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
		console.log('renamed')
		var playerTitle = document.getElementById('player_' + id + '_name');
		if (playerTitle) {
			playerTitle.textContent = name;
			playerTitle.title = name;
		}
	});

	// Player was accepted as a participant
	socket.on('participates', function (player) {
		console.log('react to\'participates\' event')
		removePlayer(player.socketID);
		addPlayer(player, participantsUL);

	});

	// Player gave up
	socket.on('gave up', function (player) {
		removePlayer(player.socketID);
		addPlayer(player, lurkersUL);
	});
}, false);
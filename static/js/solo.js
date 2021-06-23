var playerName = localStorage['player-name'] || '';
var roomName = localStorage['room-name'] || '';

var isInviteSubmitDisabled = false;
var isInviteSubmitDisabledStr = isInviteSubmitDisabled ? 'disabled' : '';

function getInviteModalHTMLContent () {
	// Compute data
	var isReachScoreMode = settings.gameMode.mode === GAME_MODE.REACH_SCORE;
	var isCountdownMode = settings.gameMode.mode === GAME_MODE.COUNTDOWN;
	var myScoreToReach = settings.gameMode.scoreToReach || localStorage['score-to-reach'] || GAME_CONSTANTS.defaultScoreToReach;
	var countdown = settings.gameMode.countdown || localStorage['countdown'] || GAME_CONSTANTS.defaultCountdown;
	var countdownStr = secondsToTimeStr(countdown);

	// Return template
	return '<form class="invite-form scrollbar scrollbar-black" id="invite-form">' +
		'<fieldset>' +  
			'<legend><i class="fa fa-pen-fancy"></i><span class="underline">About me</span></legend>' +
			'<label><strong class="label">Player name:</strong>&nbsp;&nbsp;' +
			'<input value="' + playerName + '" placeholder="' + getRandomUserName() + '" id="playerName" name="playerName" oninput="handlePlayerNameChange(this)" maxlength="' + GAME_CONSTANTS.maxPlayerNameLength + '"/>' +
			'<span class="button hide500-" onclick="resetPlayerName();"><i class="fa fa-times"></i></span>' +
			'<span class="button round-right hide500-" onclick="randomizePlayerName();">Random</span>' +
			'</label><br/>' +
			'<label><strong class="label">Room name:</strong>&nbsp;&nbsp;' +
			'<input id="roomName" name="roomName" placeholder="Goblet shuffle" oninput="handleRoomNameChange(this)" value="' + roomName + '" maxlength="' + GAME_CONSTANTS.maxRoomNameLength + '"/>' +
			'<span class="button round-right hide500-" onclick="resetRoomName();"><i class="fa fa-times"></i></span>' +
			'</label>' +
		'</fieldset>' +
		'<div class="hr" style="background: white;"></div>' +
		'<fieldset>' +
			'<legend><i class="fa fa-cogs"></i><span class="underline">Settings</span></legend>' +
			'<label><strong class="label center">Goblets:</strong>' +
				'<input id="roomSettingsGoblets" type="number" value="' + (settings.goblets || 4) + '" required="true" min="' + (GAME_CONSTANTS.minGoblets || 3) + '" max="' + (GAME_CONSTANTS.maxGoblets || 12) + '"/>' +
			'</label><br/>' +
			'<label><strong class="label center">Shuffles:</strong>' +
				'<input id="roomSettingsShuffleCount" type="number" value="' + (settings.shuffleCount || 4) + '" required="true" min="' + (GAME_CONSTANTS.minShuffleCount || 2) + '" max="' + (GAME_CONSTANTS.maxShuffleCount || 25) + '" />' +
			'</label><br/>' +
			'<label><strong class="label center">Speed:</strong>' +
				'<input id="roomSettingsShuffleSpeed" type="range" value="' + (settings.shuffleSpeed || .6) + '" required="true" step="0.01" min="' + (GAME_CONSTANTS.minShuffleSpeed || .2) + '" max="' + (GAME_CONSTANTS.maxShuffleSpeed || 1) + '" style="transform: rotate(180deg);" />' +
			'</label>' +
		'</fieldset><br/>' +
		'<fieldset>' + 
			'<legend><span class="underline">Game mode</span></legend>' +
			'<div style="display: flex;">' +
				'<label style="display: inline-flex; align-items: center;">' +
					'<strong class="label">Reach score</strong>' +
					'<input onchange="handleGameModeChangeNewRoom(this);" name="gameMode" checked type="radio" value="' + GAME_MODE.REACH_SCORE + '" ' + (isReachScoreMode ? 'checked' : '') + ' />' +
				'</label>' +
				'<input id="scoreToReach" name="scoreToReach" type="number" min="' + GAME_CONSTANTS.minScoreToReach + '" max="' + GAME_CONSTANTS.maxScoreToReach + '" value="' + myScoreToReach + '" ' + (!isReachScoreMode ? 'disabled' : '') + ' step="10">' +
			'</div>' +
			'<p class="description">The first player who can reach the chosen score wins !</p>' +
			'<br/>' +
			'<div style="display: flex; justify-content: space-between; flex-wrap: wrap;">' +
				'<label style="display: inline-flex; align-items: center;">' +
					'<strong class="label">Countdown</strong>' +
					'<input onchange="handleGameModeChangeNewRoom(this);" name="gameMode" type="radio" value="' + GAME_MODE.COUNTDOWN + '" ' + (isCountdownMode ? 'checked' : '') + ' />' +
				'</label>' +
				'<div class="time-field">' +
					'<input style="max-width: 3rem; display: inline;" id="gameCountdown-m" name="gameCountdown-m" type="number" min="0" max="59" value="' + countdownStr.m + '" ' + (!isCountdownMode ? 'disabled' : '') + '>' +
					'<span class="colon">:</span>' +
					'<input style="max-width: 3rem; display: inline;" id="gameCountdown-s" name="gameCountdown-s" type="number" min="0" max="59" value="' + countdownStr.s + '" ' + (!isCountdownMode ? 'disabled' : '') + '>' +
				'</div>' +
				'<p class="description">Player with the highest score at the end of the countdown wins !</p>' +
			'</div>' +
		'</fieldset>' +
		'<div class="hr" style="background: white;"></div>' +
		'<div id="invite-form-error"></div>' +
		'<fieldset class="invite-form-footer">' +
			'<span onclick="openInviteModal(false)" class="close-btn btn btn-danger"><i class="fa fa-arrow-left"></i></span>' +
			'<button id="submitBtn" class="button submit" ' + isInviteSubmitDisabledStr + '>Ready <i class="fa fa-arrow-right"></i></button>' +
		'</fieldset>' + 
	'</form>';
}

function openInviteModal (open) {
	try {
		if (typeof open !== 'boolean') {
			throw new Error('Invalid parameter passed to openInviteModal');
		}

		var form;
		var modalExists = document.getElementById('invite-modal');
		if (open) {
			// Make sure modal does not already exist
			if (!!modalExists) {
				throw new Error ('Invite modal is already open');
			}

			// Append modal to body
			var modal = document.createElement('div');
			modal.setAttribute('id', 'invite-modal');
			modal.classList.add('my-modal');
			modal.innerHTML = getInviteModalHTMLContent();
			modal.onclick = function () { openInviteModal(false); };

			form = modal.firstElementChild;
			form.onclick = function (e) { e.stopPropagation();}
			form.onsubmit = handleInviteFormSubmit;

			document.body.appendChild(modal);

			// Set focus on player name
			var playerNameInput = document.getElementById('playerName');
			if (playerNameInput && playerNameInput.focus) {
				playerNameInput.focus();
			}
		} else {
			var doesNotExistErr = 'Cannot close invite modal because it is not open';
			if (!modalExists) {
				throw new Error (doesNotExistErr);
			}

			// Remove modal from body (after fade out)
			modalExists.style.opacity = 0;
			form = document.getElementById('invite-form');
			if (form) {
				form.style.transform = 'translateY(-2rem)';
			}
			window.setTimeout(function () {
				modalExists = document.getElementById('invite-modal');
				if (!modalExists) {
					throw new Error (doesNotExistErr);
				}
				document.body.removeChild(modalExists);
			}, 500);
		}
	} catch (err) {
		console.log(err);
		return false;
	}
}

function getRandomUserName () {
	try {
		var lastNames = [
			'Dickinson',
			'Springsteen',
			'Nicks',
			'Smith',
			'Hendrix',
			'Pluck',
			'Sprout',
			'Spring',
			'Hearst'
		];
		var firstNames = [
			'Mary',
			'Kyle',
			'Links',
			'Sandy',
			'Noah',
			'Margaret',
			'Jack',
			'John',
			'Brad'
		];
		var ln = lastNames[randomInt(0, lastNames.length - 1)];
		var fn = firstNames[randomInt(0, firstNames.length - 1)];

		var result = fn + '_' + ln;

		// Add num
		if (!!randomInt(0, 1)) {
			for (var i = 0; i < randomInt(1, 4); i++) {
				result += randomInt(0, 9);
			}
		}

		return result;
	} catch (err) {
		console.log(err)
		return 'John_Doe';
	}
}
function randomizePlayerName () {
	try {
		var playerNameInput = document.getElementById('playerName');
		var newName = getRandomUserName();
		playerName = newName;
		playerNameInput.value = newName;
		handlePlayerNameChange(playerNameInput);
	} catch (err) {
		return false;
	}
}
function resetPlayerName () {
	try {
		var playerNameInput = document.getElementById('playerName');
		// Do nothing if value is already empty
		if (playerNameInput.value === '') {
			return true;
		}

		playerName = '';
		playerNameInput.value = playerName;
		handlePlayerNameChange(playerNameInput);
		return true;
	} catch (err) {
		return false;
	}
}
function resetRoomName () {
	try {
		var roomNameInput = document.getElementById('roomName');
		if (roomName !== '') {
			roomName = '';
			roomNameInput.value = '';
		}
	} catch (err) {
		return false;
	}
}

function handlePlayerNameChange (target) {
	// Update var
	playerName = target.value;

	// Change room name placeholder
	var roomNameInput = document.getElementById('roomName');
    if (playerName) {
    	roomNameInput.setAttribute('placeholder', playerName + '\'s room');
    } else {
    	roomNameInput.setAttribute('placeholder', 'Goblet shuffle');
    	// Change player name placeholder when user deletes value
    	target.setAttribute('placeholder', getRandomUserName());
    }

    // Store player name value in local storage
    localStorage['player-name'] = playerName;

    // Disable submit button when player name is empty
    var submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
    	submitBtn.disabled = !playerName.toString();
    }
}
function handleRoomNameChange (target) {
	roomName = target.value;
	localStorage['room-name'] = target.value;
}

function handleGameModeChangeNewRoom (radio) {
	var gameCountdownM = document.getElementById('gameCountdown-m');
	var gameCountdownS = document.getElementById('gameCountdown-s');
	var scoreToReachInput = document.getElementById('scoreToReach');

	switch (radio.value) {
		case GAME_MODE.REACH_SCORE:
			if (radio.checked) {
				// Disable other inputs
				if (gameCountdownM && gameCountdownS) {
					gameCountdownM.disabled = true;
					gameCountdownM.removeAttribute('required');

					gameCountdownS.disabled = true;
					gameCountdownS.removeAttribute('required');
				}
				// Enable my number input
				if (scoreToReachInput) {
					scoreToReachInput.removeAttribute('disabled');
					scoreToReachInput.required = true;
				}
				// Make colon fixed
				var colon = gameCountdownS.previousElementSibling;
				if (colon && colon.classList.contains('active')) {
					colon.classList.remove('active');
				}
			}
			break;
		case GAME_MODE.COUNTDOWN:
			if (radio.checked) {
				// Disable other inputs
				if (scoreToReachInput) {
					scoreToReachInput.disabled = true;
					scoreToReach.removeAttribute('required');
				}
				// Enable my time field
				if (gameCountdownM && gameCountdownS) {
					gameCountdownM.removeAttribute('disabled');
					gameCountdownM.required = true;

					gameCountdownS.removeAttribute('disabled');
					gameCountdownS.require = true;
				}
				// Make colon blink
				var colon = gameCountdownS.previousElementSibling;
				if (colon && !colon.classList.contains('active')) {
					colon.classList.add('active');
				}
			}
			break;
		default: return false;
	}
} 

function displayInviteFormError (err) {
	var inviteFormErr = document.getElementById('invite-form-error');
	if (inviteFormErr) {
		inviteFormErr.innerHTML = '' +
		'<p class="alert alert-danger" style="animation: blink .333s infinite linear alternate">' + 
		err +
		'<span class="close-btn" onclick="' +
			'(function(btn) { ' + 
				'btn.parentElement.parentElement.removeChild(btn.parentElement)' +
			'})(this)' +
		'">&times;</span></p>';
		// Scroll down to error
		var form = document.getElementById('invite-form');
		if (form) {
			form.scroll({ top: 99999, left: 0, behavior: 'smooth' });
		}
	}
}

async function handleInviteFormSubmit (formEvent) {
	formEvent.preventDefault();
	if (!isInviteSubmitDisabled) {
		try {
			// Validation
			if (!generateRoomID) {
				/*
					In case head script containing the generateRoomID util function
					is missing for some reason, or function was overriden
				*/
				throw new Error('Cannot generate a room; refreshing the page should solve the problem <span class="btn">Refresh</span>');
			}

			// Get values from DOM and validate
			var playerNameInput = document.getElementById('playerName');
			playerName = playerNameInput.value;
			if (playerName.length > GAME_CONSTANTS.maxPlayerNameLength) {
				throw new Error('Please choose a shorter name');
			}

			var myRoomNameInput = document.getElementById('roomName');
			var myRoomName = myRoomNameInput.value;
			
			let gameModes = document.getElementsByName('gameMode');
			let gameMode = null;
			Array.from(gameModes).forEach(function (mode) {
				if (mode.checked) {
					gameMode = mode.value;
				}
			});
			if (!gameMode) {
				throw new Error('Please select a game mode');
			}

			// Validate game settings
			var roomSettingsGoblets = document.getElementById('roomSettingsGoblets');
			var roomSettingsGobletsValue = parseInt(roomSettingsGoblets.value);
			if (!roomSettingsGobletsValue) {
				throw new Error('Invalid number of goblets');
			} else if (roomSettingsGobletsValue < GAME_CONSTANTS.minGoblets) {
				throw new Error('You can only play with minimum ' + GAME_CONSTANTS.minGoblets + ' goblets');
			} else if (roomSettingsGobletsValue > GAME_CONSTANTS.maxGoblets) {
				throw new Error('You cannot play with that many goblets');
			}
			var roomSettingsShuffleCount = document.getElementById('roomSettingsShuffleCount');
			var roomSettingsShuffleCountValue = parseInt(roomSettingsShuffleCount.value);
			if (!roomSettingsShuffleCountValue) {
				throw new Error('Invalid shuffle count');
			} else if (roomSettingsShuffleCountValue < GAME_CONSTANTS.minShuffleCount) {
				throw new Error('You can only play with minimum ' + GAME_CONSTANTS.minShuffleCount + ' shuffles per round');
			} else if (roomSettingsShuffleCountValue > GAME_CONSTANTS.maxShuffleCount) {
				throw new Error('You cannot play with more than ' + GAME_CONSTANTS.maxShuffleCount + ' shuffles per round');
			}
			var roomSettingsShuffleSpeed = document.getElementById('roomSettingsShuffleSpeed');
			var roomSettingsShuffleSpeedValue = parseFloat(roomSettingsShuffleSpeed.value);
			if (!roomSettingsShuffleSpeedValue) {
				throw new Error('Invalid shuffle speed');
			} else if (roomSettingsShuffleSpeedValue < GAME_CONSTANTS.minShuffleSpeed) {
				throw new Error('You cannot play that fast');
			} else if (roomSettingsShuffleSpeedValue > GAME_CONSTANTS.maxShuffleSpeed) {
				throw new Error('You cannot play that slow');
			}

			var mySettings = {
				goblets: roomSettingsGobletsValue,
				shuffleCount: roomSettingsShuffleCountValue,
				shuffleSpeed: roomSettingsShuffleSpeedValue
			};

			// Validate game mode
			switch (gameMode) {
				case 'REACH_SCORE':
					var scoreToReachInput = document.getElementById('scoreToReach');
					var scoreToReach = parseInt(scoreToReachInput.value);
					if (scoreToReach < 0 || Number.isNaN(scoreToReach + 1)) {
						throw new Error('Score to reach is invalid !');
					} else if (scoreToReach < GAME_CONSTANTS.minScoreToReach) {
						throw new Error('Score to reach should be at least ' + minScoreToReach);
					} else if (scoreToReach > GAME_CONSTANTS.maxScoreToReach) {
						throw new Error('Score to reach should be max ' + maxScoreToReach);
					}
					mySettings.gameMode = { mode: 'REACH_SCORE', scoreToReach };
					break;
				case 'COUNTDOWN':
					// Compute countdown timer value
					var cdInputS = document.getElementById('gameCountdown-s');
					var cdInputM = document.getElementById('gameCountdown-m');
					var seconds = parseInt(cdInputS.value);
					var minutes = parseInt(cdInputM.value);
					if (seconds > 59) {
						throw new Error('Countdown timer value is invalid !');
					}
					var secondsInMins = minutes*60;
					var countdown = secondsInMins + seconds;

					if (!countdown) {
						throw new Error('Countdown timer value is invalid !');
					}
					if (countdown < GAME_CONSTANTS.minCountdown) {
						throw new Error('Cannot set countdown lower than 2 seconds');
					}
					if (countdown > GAME_CONSTANTS.maxCountdown) {
						throw new Error('Cannot set countdown higher than 30 minutes');
					}

					mySettings.gameMode = { mode: 'COUNTDOWN', countdown };
					break;
				default:
					mySettings.gameMode = { mode: 'REACH_SCORE', scoreToReach: GAME_CONSTANTS.defaultScoreToReach };
			}

			// Generate room id
			var roomID = generateRoomID();

			// Build room object
			var room = {
				id: roomID,
				name: myRoomName,
				admin: {
					name: playerName
				},
				settings: mySettings
			}

			// Request room creation to API
			var config = {
				headers: {
					'Content-Type': 'application/json'
				}
			};
			var res = await axios.post('/api/multiplayer/create-room', room, config);

			// Save room URL to clipboard
			if (saveToClipboard) {
				saveToClipboard(location.href + roomID);
			}

			// Open multiplayer room in new tab
			location.assign('/' + roomID, '_blank');

			// Close invite modal
			openInviteModal(false);

			// Memorize game settings
			localStorage['currentGoblets'] = mySettings.goblets;
			localStorage['shuffleCount'] = mySettings.shuffleCount;
			localStorage['shuffleSpeed'] = mySettings.shuffleSpeed;
			localStorage['game-mode'] = mySettings.gameMode.mode;
			if (mySettings.gameMode.scoreToReach) {
				localStorage['score-to-reach'] = mySettings.gameMode.scoreToReach;
			}
			if (mySettings.gameMode.countdown) {
				localStorage['countdown'] = mySettings.gameMode.countdown;
			}

		} catch (err) {
			console.log({err});
			if (err.response && err.response.data) {

				if (err.response.data.success && err.response.data.roomID && err.response.data.errcode) {
					// Redirect to room owned by user
					location.assign(
						'/'+err.response.data.roomID+'?err='+err.response.data.errcode,
					);
					// Close invite modal
					openInviteModal(false);

				} else if (err.response.data.msg) {
					// Display error msg from server
					displayInviteFormError(err.response.data.msg);
				}
			} else if (err.message) displayInviteFormError(err.message);
		}
	}
}
'use strict';

// Client utils
function randomizeTheme () {
	var purpleR = randomInt(30, 255);
	var purpleG = randomInt(30, 255);
	var purpleB = randomInt(30, 255);
	var violetR = randomInt(30, 255);
	var violetG = randomInt(30, 255);
	var violetB = randomInt(30, 255);
	
	var lighten = 20;
	var lpR = purpleR + lighten;
	var lpG = purpleG + lighten;
	var lpB = purpleB + lighten;
	var pinkR = violetR + lighten;
	var pinkG = violetG + lighten;
	var pinkB = violetB + lighten;
	
	document.documentElement.style.setProperty('--purple', 'rgb(' + purpleR + ', ' + purpleG + ', ' + purpleB + ')');
	document.documentElement.style.setProperty('--violet', 'rgb(' + violetR + ', ' + violetG + ', ' + violetB + ')');
	document.documentElement.style.setProperty('--light-purple', 'rgb(' + lpR + ', ' + lpG + ', ' + lpB + ')');
	document.documentElement.style.setProperty('--pink', 'rgb(' + pinkR + ', ' + pinkG + ', ' + pinkB + ')');
	document.documentElement.style.setProperty('--pink-tp', 'rgba(' + pinkR + ', ' + pinkG + ', ' + pinkB + ', .333)');
	document.documentElement.style.setProperty('--violet-dark', 'rgb(' + (violetR - lighten) + ', ' + (violetG - lighten) + ', ' + (violetB - lighten) + ')');

	// --pink-yellow-blend is a blend between --light-yellow & --violet
	var pyR = Math.round(avg(violetR, 255));
	var pyG = Math.round(avg(violetG, 238));
	var pyB = Math.round(avg(violetB, 153));
	document.documentElement.style.setProperty('--pink-yellow-blend', 'rgb(' + pyR + ', ' + pyG + ', ' + pyB + ')');
}

function saveToClipboard (text) {
	try {
		var copyText = document.createElement('input');
		copyText.value = text;
		document.body.appendChild(copyText);
		copyText.select();
		copyText.setSelectionRange(0, 99999); /* For mobile devices */
		document.execCommand('copy');
		document.body.removeChild(copyText);
		return true;
	} catch {
		return false;
	}
}

function getOffsetPage (el) {
    var x = 0;
    var y = 0;
    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
		x += el.offsetLeft - el.scrollLeft;
		y += el.offsetTop - el.scrollTop;
		el = el.offsetParent;
    }
    return { top: y, left: x };
}

function detectClickOutside (clickEvent, container) {
	var isClickOutside = true;
	var targetEl = clickEvent.target;
	do {
		if (targetEl == container) {
			// This is a click inside
			isClickOutside = false;
        }
        // Go up the DOM
        targetEl = targetEl.parentNode;
	} while (targetEl);

	// Return result
	return isClickOutside;
}

function toggleColorMode () {
	var isDark = document.body.classList.contains('dark');
	if (isDark) {
		// Set to light mode
		document.body.classList.remove('dark');
		localStorage['color-mode'] = 'light';
	} else {
		// Set to dark mode
		document.body.classList.add('dark');
		localStorage['color-mode'] = 'dark';
	}
	// Add animation to toggle btns
	Array.from(document.getElementsByClassName('color-mode-toggle')).forEach(function (btn) {
		if (!btn.style.animation) {
			btn.style.animation = 'fade-rotate .3s ease-out';
		}
	});
}


// DOM
var gobletsContainer = document.getElementById('goblets-container');
var goblets = document.getElementsByClassName('goblet');

var gobletsNumSelector = document.getElementById('gobletsNumSelector');
var shuffleCountSelector = document.getElementById('shuffleCountSelector');
var shuffleSpeedSelector = document.getElementById('shuffleSpeedSelector');
var reachScoreModeSelector = document.getElementById('reach-score-mode');
var scoreToReachSelector = document.getElementById('score-to-reach')
var countdownModeSelector = document.getElementById('countdown-mode');
var countdownSelectorM = document.getElementById('countdown-mode-m');
var countdownSelectorS = document.getElementById('countdown-mode-s');
var gameSettingsSelectors = [
	gobletsNumSelector, 
	shuffleCountSelector, 
	shuffleSpeedSelector, 
	reachScoreModeSelector, 
	scoreToReachSelector,
	countdownModeSelector,
	countdownSelectorM,
	countdownSelectorS
];

var playBTN = document.getElementById('playBTN');
var skipTurnBtn = document.getElementById('skip-turn-btn');
var scoreOutput = document.getElementById('score');
var timeOutput = document.getElementById('time-output');
var timeOutputPara = document.getElementById('time-output-para');
var timeOutputM = document.getElementById('time-output-m');
var timeOutputS = document.getElementById('time-output-s');

// Global variables
var ballStr = '<div class="ball init" id="ball"></div>';
var ballOffset = { left: 0, top: 0 };

var isInGame = false;
var canPickGoblet = false;
var correctGoblet = null;
var scoreGainDefault = 100;
var scoreLossDefault = 50;
var score = 0;
var successes = 0; var fails = 0;

// Timers
var ballZIndexTM = null;
var ballScaleTM = null;
var gobletAnimTM = null;
var shuffleTM = null;
var gameTimeInterval = null; var gameTime = 0;
var countdownTimer = null;
var timers = [ballZIndexTM, ballScaleTM, gobletAnimTM, shuffleTM, countdownTimer, gameTimeInterval];
function clearTimers () {
	timers.forEach(function (timer) {
		window.clearTimeout(timer);
	});
}
var countdownInterval = null;

// Sound effects
var successSE = new Audio('/static/audio/success.mp3');
var victorySE = new Audio('/static/audio/victory.mp3');
victorySE.volume = .75;

// Goblet related functions
function setGoblets (n) {
	if (!isInGame) {	
		// Override global var (side effect)
		settings.goblets = n;

		// Replace HTML
		var gobletsStr = '';
		for (var i = 0; i < n; i++) {
			gobletsStr += '<div class="goblet" data-offset-x="0" data-offset-y="0" onclick="pickGoblet();" style="animation-delay: ' + i/20 + 's"></div>';
		}
		gobletsStr += ballStr;
		gobletsContainer.innerHTML = gobletsStr;

		// Make grid responsive
		var cols = Math.ceil(Math.sqrt(n));
		gobletsContainer.className = cols + '-cols';
		gobletsContainer.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
		function resizeGoblets () {
			if (window.matchMedia('( max-width: 450px )').matches ) {
				// Until 500px viewport width
				var vw = 40 - (cols*5);
				gobletsContainer.style.fontSize = vw + 'vw';
			} else {
				// 500px and over viewport width
				var rem = 10 - cols;
				gobletsContainer.style.fontSize = rem + 'rem';
			}
		}
		resizeGoblets();
		window.onresize = resizeGoblets;
		
		// Initialize each goblet
		var totalDelay = 0;
		var delayDuration = .4/(cols**2);

		Array.from(goblets).forEach(function (goblet, index) {
			// Mark index
			goblet.setAttribute('data-index', index);
			// Attach event listeners
			goblet.onclick = pickGoblet;
			// Style
			goblet.style.animationDelay = totalDelay + 's';
			totalDelay += delayDuration;
		});
	}
}
function getGobletOffset (goblet) {
	if (goblet) {
		var gobletBoundingRect = goblet.getBoundingClientRect();
		var offset = gobletsContainer.getBoundingClientRect();
		var left = gobletBoundingRect.left - offset.left; // distance between goblet and the left border of its container
		var top = gobletBoundingRect.top - offset.top; // distance between goblet and the top border of its container
		return {
			left: left,
			top: top,
			width: gobletBoundingRect.width,
			height: gobletBoundingRect.height
		};
	} else {
		return null;
	}
}
function turnDownGoblets (down) {
	var arr = Array.from(goblets);
	if (down) {
		arr.forEach(function (goblet) {
			goblet.classList.add('down');
			goblet.classList.remove('hidden');
		});
	} else {
		arr.forEach(function (goblet) {
			goblet.classList.remove('down');
			goblet.style.transform = null;
			goblet.setAttribute('data-offset-x', 0);
			goblet.setAttribute('data-offset-y', 0);
		});
	}
}
function getRandomGoblet () {
	var randomGobletNum = randomInt(0, settings.goblets - 1);
	return Array.from(goblets)[randomGobletNum];
}
function shuffleGoblets () {
	return new Promise (function (resolve, reject) {
		if (!isInGame) return reject('Game was aborted');

		// Pick random goblets for permutation
		var fromGoblet = getRandomGoblet();
		var toGoblet = getRandomGoblet();
		// If "from" goblet was picked twice, try again until a different one was picked
		while (toGoblet.dataset.index === fromGoblet.dataset.index) {
			toGoblet = getRandomGoblet();
		}

		// Interchange goblets' data-index attribute
		var fromIndex = fromGoblet.dataset.index;
		fromGoblet.setAttribute('data-index', toGoblet.dataset.index);
		toGoblet.setAttribute('data-index', fromIndex);

		// Get each goblet's coords
		var from = getGobletOffset(fromGoblet);
		var to = getGobletOffset(toGoblet);

		// Calculate the translation to each other's position
		var fromGobletTranslateX, fromGobletTranslateY,
		toGobletTranslateX, toGobletTranslateY;

		if (settings.stackGoblets !== true) {
			// Prevent goblets from being stacked on the same position
			// x axis
			fromGobletTranslateX = to.left - from.left + parseInt(fromGoblet.dataset.offsetX || 0);
			toGobletTranslateX = from.left - to.left + parseInt(toGoblet.dataset.offsetX || 0);
			// y axis
			fromGobletTranslateY = to.top - from.top + parseInt(fromGoblet.dataset.offsetY || 0);
			toGobletTranslateY = from.top - to.top + parseInt(toGoblet.dataset.offsetY || 0);

			if (from.top === to.top) {
				// Do not move on the y axis
				fromGobletTranslateY = parseInt(fromGoblet.dataset.offsetY || 0);
				toGobletTranslateY = parseInt(toGoblet.dataset.offsetY || 0);
			}
			if (from.left === to.left) {
				// Do not move on the x axis
				fromGobletTranslateX = parseInt(fromGoblet.dataset.offsetX || 0);
				toGobletTranslateX = parseInt(toGoblet.dataset.offsetX || 0);
			}
		} else {
			// Goblets can get stacked on the same position
			var fromLeft = from.left - parseInt(fromGoblet.dataset.offsetX || 0);
			var toLeft = to.left - parseInt(toGoblet.dataset.offsetX || 0);
			fromGobletTranslateX = toLeft - fromLeft;
			toGobletTranslateX = -1*(toLeft - fromLeft);
			if (fromLeft > toLeft) {
				fromGobletTranslateX = -1*(fromLeft - toLeft);
				toGobletTranslateX = fromLeft - toLeft;
			}

			var fromTop = from.top - parseInt(fromGoblet.dataset.offsetY || 0);
			var toTop = to.top - parseInt(toGoblet.dataset.offsetY || 0);
			fromGobletTranslateY = toTop - fromTop;
			toGobletTranslateY = -1*(toTop - fromTop);
			if (fromTop > toTop) {
				fromGobletTranslateY = -1*(fromTop - toTop);
				toGobletTranslateY = fromTop - toTop;
			}
		}

		// Memorize new offset
		fromGoblet.setAttribute('data-offset-x', fromGobletTranslateX);
		toGoblet.setAttribute('data-offset-x', toGobletTranslateX);
		fromGoblet.setAttribute('data-offset-y', fromGobletTranslateY);
		toGoblet.setAttribute('data-offset-y', toGobletTranslateY);

		// Apply translations
		fromGoblet.style.transform = 'translate(' + fromGobletTranslateX + 'px, ' + fromGobletTranslateY + 'px) rotate(180deg)';
		toGoblet.style.transform = 'translate(' + toGobletTranslateX + 'px, ' + toGobletTranslateY + 'px) rotate(180deg)';

		// Move ball if one of the goblets has it (after goblet translation)
		var oneGobletHasIt;
		try {
			oneGobletHasIt = (
				correctGoblet.dataset.index === fromGoblet.dataset.index || 
				correctGoblet.dataset.index === toGobletfromGoblet.dataset.index
			);
		} catch {
			oneGobletHasIt = false;
		}
		if ( oneGobletHasIt ) {
			ballScaleTM = window.setTimeout(function () {
				var clientRect = getGobletOffset(correctGoblet);
				ballOffset.left = clientRect.left;
				ballOffset.top = clientRect.top;
				// Move ball
				var ballElem = document.getElementById('ball');
				if (ballElem) {
					ballElem.style.transform = 'translate(' + ballOffset.left + 'px, ' + ballOffset.top + 'px)';
				}
			}, 500 * settings.shuffleSpeed);
		}

		// Resolve promise
		shuffleTM = window.setTimeout(resolve, (1000 * settings.shuffleSpeed) + 70);
	});
}
// Pick goblet
async function pickGoblet (clickEvent) {
	if (canPickGoblet) {
		canPickGoblet = false;

		// Get all goblets that are in the same position
		var targetOffset = getGobletOffset(clickEvent.target);
		var targetGoblets = [];
		Array.from(goblets).forEach(function (goblet) {
			var gobletOffset = getGobletOffset(goblet);
			var errorBoundary = 10; // Will still consider goblet has same position if it does not has the exact same coordinates
			var errorBoundaryMg = errorBoundary/2;
			var haveGobletsSamePosition = (
				isValidNum( // left coord
					gobletOffset.left, // value
					targetOffset.left - errorBoundaryMg, // min
					targetOffset.left + errorBoundaryMg // max
				) && 
				isValidNum( // top coord
					gobletOffset.top, // value
					targetOffset.top - errorBoundaryMg, // min
					targetOffset.top + errorBoundaryMg // max
				)
			);

			if (haveGobletsSamePosition) {
				/* 
					This goblet has the same position has clicked goblet,
					and thus must be targeted too
				*/
				targetGoblets.push(goblet);
			}
		});

		// Find out if one of the target goblets has the ball
		targetGoblets.includes(correctGoblet) ? await succeed(targetGoblets) : await fail(targetGoblets);
	}
}

// Reset ball
function resetBall (init = true) {
	var ballElem = document.getElementById('ball');
	if (ballElem) {
		ballElem.style.zIndex = 4;
		ballElem.style.opacity = 1;
		if (init) {
			ballElem.classList.add('init');
		}
	}
}

// Score gain/loss animation
function scoreAnimation (
		className, 
		element, 
		value, 
		duration = 1000
	) {
	if ( !className || !element || value === 0 ) {
		return;
	}
	var span = document.createElement('span');
	span.className = 'score-anim ' + className;
	span.textContent = value;
	span.style.animationDuration = duration/4 + 'ms'; // Fade in

	element.appendChild(span);

	window.setTimeout(function () { // Fade out
		span.classList.add('fade-out');
		span.style.transition = duration/4 + 'ms all ease-out';
	}, 3*duration/4);
	window.setTimeout(function () { // Remove element
		element.removeChild(span);
	}, duration);
}

// Game processes
function enableOptions (enable) {
	if (typeof enable !== 'boolean') {
		return false;
	}
	gameSettingsSelectors.forEach(function (input) {
		if (input) {
			// Do not enable game mode specific selectors of unselected mode
			const isModeSpecificSelector = Object.values(GAME_MODE).includes(input.name);
			if (
				enable &&
				isModeSpecificSelector &&
				settings.gameMode.mode !== input.name
			) {
				return;
			} else {
				input.disabled = !enable;
			}
		}
	});
}

function changeSetting(type, element) {
	if (isAdmin && !isInGame) {
		var value = element.value;

		switch (type) {
			case 'goblets-count': {
				// Limit goblets
				value = limitNum(
					parseInt(value),
					GAME_CONSTANTS.minGoblets,
					GAME_CONSTANTS.maxGoblets
				);
				setGoblets(value);
				// Memorize number of goblets
				if (!MULTIPLAYER) {
					localStorage.setItem('currentGoblets', value);
				} else if (isAdmin && socket) {
					// In multiplayer mode, emit event
					socket.emit('room setting change', { type, value });
				}
				break;
			} case 'shuffle-count': {
				// Validate value
				value = limitNum(
					parseInt(value),
					GAME_CONSTANTS.minShuffleCount,
					GAME_CONSTANTS.maxShuffleCount
				);
				if (value !== false) {
					settings.shuffleCount = value;
					// Memorize setting
					if (!MULTIPLAYER) {
						localStorage['shuffleCount'] = value;
					} else if (isAdmin && socket) {
						// In multiplayer mode, emit event
						socket.emit('room setting change', { type, value });
					}
				}
				break;
			} case 'shuffle-speed': {
				// Validate value
				value = limitNum(
					parseFloat(value),
					GAME_CONSTANTS.minShuffleSpeed,
					GAME_CONSTANTS.maxShuffleSpeed
				);
				if (value !== false) {
					settings.shuffleSpeed = value;
					
					if (!MULTIPLAYER) {
						// Memorize setting
						localStorage['shuffleSpeed'] = value;
					} else if (isAdmin && socket) {
						// In multiplayer mode, emit event
						socket.emit('room setting change', { type, value });
					}
				}
				break;
			} case 'game-mode': {
				switch (value) {
					case GAME_MODE.REACH_SCORE: {
						if (element.checked) {
							// Disable other inputs
							if (countdownSelectorM && countdownSelectorS) {
								countdownSelectorM.disabled = true;
								countdownSelectorS.disabled = true;
							}
							// Enable my number input
							if (scoreToReachSelector) {
								scoreToReachSelector.removeAttribute('disabled');
							}
							// Make time field inactive
							var timeField = countdownSelectorM.parentElement;
							if (timeField && timeField.classList.contains('active')) {
								timeField.classList.remove('active');
							}
							// Hide timer
							if (timeOutput) {
								timeOutput.style.display = 'none';
							}
							// Update gameMode
							var scoreToReach = parseInt(scoreToReachSelector.value);
							settings.gameMode = {
								mode: GAME_MODE.REACH_SCORE,
								scoreToReach
							};
							if (!MULTIPLAYER) {
								// Memorize settings
								localStorage['game-mode'] = GAME_MODE.REACH_SCORE;
								localStorage['score-to-reach'] = scoreToReach;
							} else if (isAdmin && socket) {
								// In multiplayer mode, emit event
								socket.emit('room setting change', { type: 'game-mode', value: GAME_MODE.REACH_SCORE });
								socket.emit('room setting change', { type: 'score-to-reach', value: scoreToReach });
							}
						}
						break;
					} case GAME_MODE.COUNTDOWN: {
						if (element.checked) {
							// Disable other inputs
							if (scoreToReachSelector) {
								scoreToReachSelector.disabled = true;
							}
							// Enable my time field
							if (countdownSelectorM && countdownSelectorS) {
								countdownSelectorM.removeAttribute('disabled');
								countdownSelectorS.removeAttribute('disabled');
							}
							// Make time field blink
							var timeField = countdownSelectorM.parentElement;
							if (timeField && !timeField.classList.contains('active')) {
								timeField.classList.add('active');
							}
							// Update gameMode
							var m = parseInt(countdownSelectorM.value); 
							var s = parseInt(countdownSelectorS.value);
							var countdown = limitNum(
								60*m + s,
								GAME_CONSTANTS.minCountdown,
								GAME_CONSTANTS.maxCountdown
							);

							// Validation
							if (countdown === false) {
								countdown = GAME_CONSTANTS.defaultCountdown;
							}
							settings.gameMode = { mode: GAME_MODE.COUNTDOWN, countdown };
							
							// Display timer
							if (timeOutput) {
								timeOutput.style.display = 'block';
								timeOutput.className = 'fade-in';
							}

							if (!MULTIPLAYER) {
								// Memorize settings
								localStorage['game-mode'] = GAME_MODE.COUNTDOWN;
								localStorage['countdown'] = countdown;
							} else if (isAdmin && socket) {
								// In multiplayer mode, emit event
								socket.emit('room setting change', { type: 'game-mode', value: GAME_MODE.COUNTDOWN });
								socket.emit('room setting change', { type: 'countdown', value: countdown });
							}
						}
						break;
					} default: return;
				}
				break;
			} case 'score-to-reach': {
				value = limitNum(
					parseInt(value),
					GAME_CONSTANTS.minScoreToReach,
					GAME_CONSTANTS.maxScoreToReach
				);
				if (value === false) {
					break;
				}

				// Update settings
				settings.gameMode = { 
					mode: GAME_MODE.REACH_SCORE,
					scoreToReach: value
				};
				if (!MULTIPLAYER) {
					// Memorize settings
					localStorage['score-to-reach'] = value;
				} else if (isAdmin && socket) {
					// In multiplayer mode, emit event
					socket.emit('room setting change', { type, value });
				}
				break;
			} case 'countdown': {
				if (!countdownSelectorM || !countdownSelectorS) {
					break;
				}
				// Get seconds
				var m = window.parseInt(countdownSelectorM.value);
				var s = window.parseInt(countdownSelectorS.value);
				var countdown = limitNum(
					m*60 + s,
					GAME_CONSTANTS.minCountdown,
					GAME_CONSTANTS.maxCountdown
				);

				// Validation
				if (countdown === false) {
					break;
				}
				
				// Update settings
				settings.gameMode = { mode: GAME_MODE.COUNTDOWN, countdown };
				initialTime = countdown;

				// Update user interface timer
				if (timeOutputM && timeOutputS) {
					var timeString = secondsToTimeStr(countdown);
					timeOutputM.textContent = timeString.m;
					timeOutputS.textContent = timeString.s;
				}

				if (!MULTIPLAYER) {
					// Memorize settings
					localStorage['countdown'] = countdown;
				} else if (isAdmin && socket) {
					// In multiplayer mode, emit event
					socket.emit('room setting change', { type, value: countdown });
				}
				break;
			} default: return;
		}
	}
}

function startCountDown (boolean) {
	if (settings.gameMode.mode === GAME_MODE.COUNTDOWN) {
		function updateUI (seconds) {
			// Update time output
			var timeStr = secondsToTimeStr(seconds);
			timeOutputM.textContent = timeStr.m;
			timeOutputS.textContent = timeStr.s;

			// Make output blink when remaining time is low
			if (
				seconds <= 60 && 
				seconds < settings.gameMode.countdown/3 && 
				!timeOutputPara.classList.contains('active')
			) {
				timeOutputPara.classList.add('active')
			}
		}
		function stopCountdown () {
			// Clear and reset timeout and interval
			window.clearTimeout(countdownTimer);
			window.clearInterval(countdownInterval);
			countdownTimer = null; countdownInterval = null;
			// User interface
			updateUI(settings.gameMode.countdown);
			timeOutputPara.classList.remove('active');
		}

		if (boolean) {
			// Start countdown
			let currentSec = initialTime;

			countdownTimer = window.setTimeout(function () {
				// Countdown is over
				stopCountdown();
				if (!MULTIPLAYER) {
					/*
						Call end game in SOLO mode
						(in multiplayer mode, timer is handled
						by the server and sends victory event)
					*/
					endGame();
				}
			}, initialTime * 1000);

			// Start interval
			countdownInterval = window.setInterval(function () {
				// Update user interface every second
				currentSec--;
				updateUI(currentSec);
			}, 1000);
		} else {
			stopCountdown();
		}
	}
}


// Success or fail
function succeed (targetGoblets) {
	return new Promise (function (resolve, reject) {
		try {
			// Disable skip turn btn and prevent picking goblets
			canPickGoblet = false;
			if (skipTurnBtn) {
				skipTurnBtn.disabled = true;
			}
			
			// Play SE
			try {
				successSE.play();
			} catch {
				console.log('Failed to play success sound effect');
			}

			// Increment successes
			successes++

			// Add to score
			var gainCoeff = targetGoblets.length/settings.shuffleSpeed  || 1;
			var scoreGain = Math.round(scoreGainDefault * gainCoeff);
			score += scoreGain;
			scoreOutput.textContent = score;

			// Display score gain animation
			scoreAnimation('gain', scoreOutput, scoreGain);

			// Notify other players (multiplayer)
			if (MULTIPLAYER && socket) {
				socket.emit('player change', {
					type: 'score',
					payload: score
				});
			}

			// Reveal ball
			var ball = document.getElementById('ball');
			ball.style.opacity = 1;
			ball.style.zIndex = 4;
			// Hide all goblets
			Array.from(goblets).forEach(function (goblet) {
				goblet.classList.remove('pickable');
				goblet.classList.add('hidden');
			})

			// Reset ball and goblets DOM
			ballZIndexTM = window.setTimeout(function () {
				setGoblets(settings.goblets);
				resetBall();
			}, 500);

			// If player reached sufficient score
			if (
				settings.gameMode.mode === GAME_MODE.REACH_SCORE &&
				score >= settings.gameMode.scoreToReach
			) {
				// Limit score
				score = settings.gameMode.scoreToReach;
				// End this game
				if (MULTIPLAYER === false) {
					// In multiplayer mode, victory is triggered by an event sent from the server
					endGame();
				}
			} else {
				// Go to next turn
				ballScaleTM = window.setTimeout(function () {
					turnDownGoblets(); randomizeTheme();
					startNewTurn();
				}, 800);
			}

			resolve();
		} catch (err) {
			reject();
		}
	});
}
function fail (goblets) {
	return new Promise (function (resolve, reject) {
		try {
			// Increment fails
			fails++;

			// Lose score
			var lossCoeff = 1/settings.shuffleSpeed || 1;
			var scoreLoss = scoreLossDefault * lossCoeff;
			// Player should lose less points the more goblets there are
			// Take away some percentage of the loss
			var percentage = ((settings.goblets / GAME_CONSTANTS.minGoblets) - 1) * 4; // minGoblets: 0%
			scoreLoss -= (scoreLoss * percentage/100);

			// Remove from score
			score = limitNum(
				Math.floor(score - scoreLoss),
				0,
				GAME_CONSTANTS.maxScoreToReach
			)
			scoreOutput.textContent = score;

			// Display score loss animation
			scoreAnimation('loss', scoreOutput, Math.floor(scoreLoss));

			// Notify other players (multiplayer)
			if (MULTIPLAYER && socket) {
				socket.emit('player change', {
					type: 'score',
					payload: score
				});
			}

			// Fade picked goblets
			goblets.forEach(function (goblet) {
				// Fail animation
				var animTime = 500;
				var animDelay = 10;
				goblet.classList.add('fail');

				window.setTimeout(function () {
					goblet.style.transition = animTime + 'ms all cubic-bezier(.29,.36,.2,.99)';
					var rotation = randomInt(0, 719);
					var translationX = randomInt(-25, 25);
					var translationY = randomInt(-25, 25);
					var offsetX = parseInt(goblet.dataset.offsetX) || 0;
					var offsetY = parseInt(goblet.dataset.offsetY) || 0;
					var translation = (offsetX + translationX) + 'px, ' + (offsetY + translationY) + 'px';
					goblet.style.transform = 'translate(' + translation + ') ' + 
						'rotate(' + rotation + 'deg) ' + 
						'scale(.5)';
					goblet.style.opacity = 0;
				}, animDelay);

				// Add/remove classes after animation
				window.setTimeout(function () {
					goblet.classList.remove('pickable');
					goblet.classList.remove('fail');
					if (!goblet.classList.contains('hidden')) {
						goblet.classList.add('hidden');
					}
				}, animTime + animDelay);
			});

			// Allow picking goblets
			canPickGoblet = true;

			// Enable skip turn button
			if (skipTurnBtn) {
				skipTurnBtn.removeAttribute('disabled');
			}

			resolve()
		} catch (err) {
			reject();
		}
	});
}

function startNewTurn () {
	window.setTimeout(function () {
		// Rotate all goblets
		turnDownGoblets(true)

		// Pick random goblet
		correctGoblet = getRandomGoblet();

		// Calculate goblet position
		var offset = getGobletOffset(correctGoblet);
		var left = offset.left;
		var top = offset.top;
		ballOffset = { left: left, top: top };
		var translate = 'translate(' + left + 'px, calc(' + top + 'px + .25em))';

		// Move the ball to that goblet
		var ballElem = document.getElementById('ball');
		if (ballElem) {
			ballElem.classList.remove('init');
			ballElem.style.transform = translate;
			ballScaleTM = window.setTimeout(function () {
				ballElem.style.transform = translate + ' scale(1.5)';
			}, 600);
		}

		// Lift goblet
		correctGoblet.style.transition = '.6s ease all';
		correctGoblet.style.animation = 'blink .25s linear infinite alternate';
		correctGoblet.style.transform = 'rotate(180deg) translateY(.5em)';
		ballZIndexTM = window.setTimeout(function () {
			ballElem.style.zIndex = 2;
			ballElem.style.transform = 'translate(' + left + 'px, ' + top + 'px)';
			ballElem.style.opacity = 0;
			correctGoblet.style.transform = null;
		}, 900);

		// Put goblet down
		gobletAnimTM = window.setTimeout(function () {
			correctGoblet.style.animation = null;
			correctGoblet.style.transition = '.3s ease all';
		}, 1500);

		// Set appropriate translation speed
		Array.from(goblets).forEach(function (goblet) {
			goblet.style.transition = .5*settings.shuffleSpeed + 's all ease';
			goblet.style.opacity = .5;
		});

		// Shuffle goblets
		var currentCount = settings.shuffleCount; // Amount of shuffles that still need to be done
		function shuffleGobletsAtLeastOnce () {
			shuffleGoblets().then(function () {
				currentCount--;
				if (currentCount > 0 && isInGame) {
					shuffleGobletsAtLeastOnce();
				} else {
					// Shuffling is completed
					// Make all goblets opaque
					Array.from(goblets).forEach(function (goblet) {
						goblet.style.opacity = 1;
					});
					if (isInGame) {
						// Game is not aborted
						canPickGoblet = true;
						Array.from(goblets).forEach(function (goblet) {
							goblet.classList.add('pickable');
						});
						// Enable skip button
						if (skipTurnBtn) {
							skipTurnBtn.removeAttribute('disabled');
						}
					}
				}
			});
		}
		// Shuffle
		shuffleTM = window.setTimeout(shuffleGobletsAtLeastOnce, 1800);
	}, 300);
}

function skipThisTurn () {
	if (canPickGoblet) {
		// Prevent picking goblets and disable skip turn button
		canPickGoblet = false;
		if (skipTurnBtn) {
			skipTurnBtn.disabled = true;
		}

		// Make ball visible without moving it to its initial position
		resetBall(false);

		// Go to next turn without changing theme color
		turnDownGoblets();
		startNewTurn();
	}
}

function onPlay () {
	clearTimers();
	if (isInGame) {
		// Stop game / give up
		isInGame = false;
		canPickGoblet = false;
		enableOptions(true);
		turnDownGoblets(false);
		setGoblets(settings.goblets);
		resetBall();
		if (playBTN) {
			playBTN.innerHTML = '<span>Start</span>';
		}
		if (skipTurnBtn) {
			skipTurnBtn.disabled = true;
		}

		// Reset game stats
		score = 0;
		scoreOutput.textContent = 0;
		successes = 0;
		fails = 0;
		gameTime = 0;
		window.clearInterval(gameTimeInterval);
		gameTimeInterval = null;

		// Reset goblets translation speed
		Array.from(goblets).forEach(function (goblet) {
			goblet.style.transition = '.3s all ease';
			goblet.classList.remove('pickable');
		});
		
		// Reset countdown
		startCountDown(false);
	} else {
		// New game
		isInGame = true;
		enableOptions(false);
		startCountDown(true);
		startNewTurn();
		if (playBTN) {
			playBTN.innerHTML = '<span>Give up</span>';
		}

		// Scroll to goblets container
		if (gobletsContainer) {
			gobletsContainer.scrollIntoView({
				behaviour: 'smooth',
				inline: 'start',
				block: 'nearest'
			});
		}

		// Measure game time
		if (settings.gameMode.mode === GAME_MODE.REACH_SCORE) {
			gameTimeInterval = window.setInterval(function () {
				gameTime++;
			}, 1000);
		}
	}
}

function endGame (winner) {
	// Play sound effect
	try {
		victorySE.play();
	} catch {
		console.log('Failed to play victory sound effect');
	}
	if (!MULTIPLAYER) {
		// SOLO
		switch (settings.gameMode.mode) {
			case GAME_MODE.REACH_SCORE: {
				// REACH_SCORE
				var timeStr = secondsToTimeStr(gameTime);
				var msg = '<h3 class="title" style="--n: 0">Finish !</h3>' + 
				'<p class="msg" style="--n: 1">It took you <strong>' + timeStr.m + '\'' + timeStr.s + 
				'\'\'</strong> to reach <strong>' + settings.gameMode.scoreToReach + 'pts</strong></p>' +
				'<div class="hr"></div>' + 
				'<p class="result-row" style="--n: 2">' + 
					'<span>Successes:</span><strong class="successes">' + successes + '</strong>' + 
				'</p>' +
				'<p class="result-row" style="--n: 3">' + 
					'<span>Fails:</span><strong class="fails">' + fails + '</strong>' + 
				'</p>' +
				'<div class="hr"></div>' + 
				'<button ' + 
					'class="btn btn-primary ok" ' + 
					'onclick="openEndGameModal(false);" ' +
					'style="--n: 4"' +
				'>Got it</button>';
				openEndGameModal(true, msg);
				break;
			} case GAME_MODE.COUNTDOWN: {
				// COUNTDOWN
				var timeStr = secondsToTimeStr(settings.gameMode.countdown);
				var msg = '<h3 class="title" style="--n: 0">Finish !</h3>' +
				'<p class="msg" style="--n: 1">In <strong>' + timeStr.m + '\'' + timeStr.s + '\'\'' +
				'</strong> you\'ve managed to earn <strong>' + score + 'pts</strong></p>' +
				'<div class="hr"></div>' + 
				'<p class="result-row" style="--n: 2">' + 
					'<span>Successes:</span><strong class="successes">' + successes + '</strong>' + 
				'</p>' +
				'<p class="result-row" style="--n: 3">' + 
					'<span>Fails:</span><strong class="fails">' + fails + '</strong>' + 
				'</p>' +
				'<div class="hr"></div>' + 
				'<button ' + 
					'class="btn btn-primary ok" ' + 
					'onclick="openEndGameModal(false);" ' +
					'style="--n: 4"' +
				'>Got it</button>';
				openEndGameModal(true, msg);
				break;
			} default: return;
		}
	} else {
		// MULTIPLAYER
		// Called after receiving 'victory' websocket event
		if (winner) {
			switch (settings.gameMode.mode) {
				case GAME_MODE.REACH_SCORE: {
					var timeStr = secondsToTimeStr(gameTime);
					var msg = '<h3 class="title" style="--n: 0">' + winner.name + ' has won !</h3>' +
					'<p class="msg" style="--n: 1">Reached <strong>' + settings.gameMode.scoreToReach +
					'</strong> in <strong>' + timeStr.m + '\'' + timeStr.s + '\'\'</strong></p>' +
					'<div class="hr"></div>' + 
					'<button ' + 
						'class="btn btn-primary ok" ' + 
						'onclick="openEndGameModal(false);" ' +
						'style="--n: 2"' +
					'>Got it</button>';
					openEndGameModal(true, msg);
					break;
				} case GAME_MODE.COUNTDOWN: {
					var timeStr = secondsToTimeStr(settings.gameMode.countdown);
					var msg = '<h3 class="title" style="--n: 0">' + winner.name + ' has won !</h3>' +
					'<p class="msg" style="--n: 1">with <strong>' + winner.score + 'pts !</strong></p>' +
					'<div class="hr"></div>' + 
					'<button ' + 
						'class="btn btn-primary ok" ' + 
						'onclick="openEndGameModal(false);" ' +
						'style="--n: 2"' +
					'>Got it</button>';
					openEndGameModal(true, msg);
					break;
				} default: return;
			}
		}
	}
	onPlay();
}
function openEndGameModal (boolean, msg) {
	var modalID = 'game-end-modal';
	if (boolean) {
		// Open modal
		// Check if modal is already open; if so, close it first
		if (!!document.getElementById(modalID)) {
			var modal = document.getElementById(modalID);
			modal.parentElement.removeChild(modal);
		}
		var modal = document.createElement('div');
		modal.className = 'my-modal';
		modal.setAttribute('id', modalID);
		var win = document.createElement('div');
		win.className = 'game-end-msg';
		win.addEventListener('mousedown', function (e) {
			e.stopPropagation();
		}, false);
		modal.addEventListener('mousedown', function () {
			win.classList.add('modal-clicked');
			window.setTimeout(function () {
				win.classList.remove('modal-clicked');
			}, 75);
		}, false);

		win.innerHTML = msg;

		modal.appendChild(win);
		document.body.appendChild(modal);
	} else {
		// Close modal
		var modal = document.getElementById(modalID);
		// Fade out transition during 500ms
		modal.style.opacity = 0;
		modal.style.pointerEvents = 'none';
		window.setTimeout(function () {
			modal.parentElement.removeChild(modal);
		}, 500);
	}
}

// Initialize game
(function () {
	// Initialize DOM
	// Settings
	if (gobletsNumSelector) {
		gobletsNumSelector.min = GAME_CONSTANTS.minGoblets;
		gobletsNumSelector.max = GAME_CONSTANTS.maxGoblets;
	}
	if (shuffleCountSelector) {
		shuffleCountSelector.min = GAME_CONSTANTS.minShuffleCount;
		shuffleCountSelector.max = GAME_CONSTANTS.maxShuffleCount;
	}
	if (shuffleSpeedSelector) {
		shuffleSpeedSelector.min = GAME_CONSTANTS.minShuffleSpeed;
		shuffleSpeedSelector.max = GAME_CONSTANTS.maxShuffleSpeed;
	}

	// Reset memorized game settings (in solo mode only)
	if (!MULTIPLAYER) {
		// Goblets count
		var lsCurrentGoblets = parseInt(localStorage['currentGoblets']);
		if (isValidNum(
			lsCurrentGoblets, 
			GAME_CONSTANTS.minGoblets, 
			GAME_CONSTANTS.maxGoblets
		)) {
			settings.goblets = lsCurrentGoblets;
			gobletsNumSelector.value = lsCurrentGoblets;
		}
		// Shuffle count
		var lsShuffleCount = parseInt(localStorage['shuffleCount']);
		if (isValidNum(
			lsShuffleCount,
			GAME_CONSTANTS.minShuffleCount,
			GAME_CONSTANTS.maxShuffleCount
		)) {
			settings.shuffleCount = lsShuffleCount;
			shuffleCountSelector.value = lsShuffleCount;
		}
		// Speed
		var lsShuffleSpeed = parseFloat(localStorage['shuffleSpeed']);
		if (isValidNum(
			lsShuffleSpeed,
			GAME_CONSTANTS.minShuffleSpeed,
			GAME_CONSTANTS.maxShuffleSpeed
		)) {
			settings.shuffleSpeed = lsShuffleSpeed;
			shuffleSpeedSelector.value = lsShuffleSpeed;
		}
		// Score
		var lsScoreToReach = parseInt(localStorage['score-to-reach']);
		if (isValidNum(
			lsScoreToReach,
			GAME_CONSTANTS.minScoreToReach,
			GAME_CONSTANTS.maxScoreToReach
		)) {
			settings.gameMode.scoreToReach = lsScoreToReach;
			scoreToReachSelector.value = lsScoreToReach;
		}
		// Countdown
		var lsCountdown = parseInt(localStorage['countdown']);
		if (isValidNum(
			lsCountdown,
			GAME_CONSTANTS.minCountdown,
			GAME_CONSTANTS.maxCountdown
		)) {
			settings.gameMode.countdown = lsCountdown;
			// Update input values
			var timeStr = secondsToTimeStr(lsCountdown);
			countdownSelectorM.value = timeStr.m;
			countdownSelectorS.value = timeStr.s;
			// Update output
			changeSetting('countdown', countdownSelectorM);
		}
		// Game mode
		var lsGameMode = localStorage['game-mode'];
		if (Object.values(GAME_MODE).includes(lsGameMode)) {
			// Check corresponding radio input
			var radios = Array.from(document.getElementsByName('game-mode'));
			radios.forEach(function (radio) {
				if (radio.value === lsGameMode) {
					radio.checked = true;
					changeSetting('game-mode', radio);
				} else {
					radio.removeAttribute('checked');
				}
			});
		}
	}

	// Set initial color-mode
	var useDark = localStorage['color-mode'] === 'dark' || window.matchMedia("(prefers-color-scheme: dark)").matches;
	if (useDark) {
		document.body.classList.add('dark');
	}

	// Set initial goblets
	setGoblets(lsCurrentGoblets || settings.goblets);

	// Attach event handlers
	Array.from(goblets).forEach(function (goblet) {
		goblet.onclick = pickGoblet;
	});
})();

// Register to service worker
if ('serviceWorker' in navigator) {
	console.log('Service worker registration in progress');
	navigator.serviceWorker.register('/static/serviceWorker.js', { scope: '/' })
		.then(function (registration) {
			console.log('Service worker registration complete');
		})
		.catch(function (e) {
			console.log('Service worker registration failure');
		});
} else {
	console.log('Service worker is not supported');
}
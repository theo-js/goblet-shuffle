const DOMAIN = process.env.NODE_ENV === 'production' ? process.env.DOMAIN_NAME : 'http://localhost:4000';

const GAME_CONSTANTS = {
	// Limit game settings
	maxPlayerNameLength: 40,
	maxRoomNameLength: 50,
	minGoblets: 3,
	maxGoblets: 12,
	minShuffleCount: 2,
	maxShuffleCount: 25,
	minShuffleSpeed: .2,
	maxShuffleSpeed: 1,
	minScoreToReach: 100,
	defaultScoreToReach: 2000,
	maxScoreToReach: 999999,
	minCountdown: 5, // seconds
	defaultCountdown: 30, // seconds
	maxCountdown:  30*60, // seconds
	maxScoreLoss: -1500,
	maxScoreGain: 1500
};

const GAME_MODE = {
	REACH_SCORE: 'REACH_SCORE', // Goal is to reach a chosen score (before others in multiplayer)
	COUNTDOWN: 'COUNTDOWN' // Goal is to have the highest score after a chosen time span
};

const PLAYER_ROLE = {
	ADMIN: 'ADMIN',
	BASIC: 'BASIC'
};

const ROOM_ID_LENGTH = 10;
const GAME_START_COUNTDOWN = 10;

module.exports = {
	DOMAIN,
	GAME_CONSTANTS,
	GAME_MODE,
	PLAYER_ROLE,
	ROOM_ID_LENGTH,
	GAME_START_COUNTDOWN
};
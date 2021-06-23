const { GAME_CONSTANTS } = require('../../constants');

function secondsToTime (number)/*: number*/ /*: { m, s } */ {
	// Validate param and prevent negative time
	if (
		typeof number !== 'number' || 
		Number.isNaN(number) ||
		number < 0
	) {
		return { m: 1, s: 0 };
	}
	// Ceil result
	if (number > GAME_CONSTANTS.maxCountdown) {
		number = GAME_CONSTANTS.maxCountdown;
	}

	const date = new Date(number*1000);
	const m = date.getMinutes();
	const s = date.getSeconds();
	const result = { m, s };

	if (Number.isNaN(result)) return { m: 0, s: 0 };
	return result;
};

function timeToStr (mAndS/*: { m: number, s: number } */) /*: { m: string, s: string } */ {
	if (
		typeof mAndS.m !== 'number' ||
		Number.isNaN(mAndS.m) ||
		typeof mAndS.s !== 'number' ||
		Number.isNaN(mAndS.s)
	) {
		return { m: '01', s: '00' };
	}

	let m = mAndS.m.toString();
	let s = mAndS.s.toString();

	// Add zero
	if (m.length === 1) m = '0' + m;
	if (s.length === 1) s = '0' + s;

	return { m, s };
};

function secondsToTimeStr (number/*: number */) /*: { m: string, s: string, time: number } */ {
	const str = timeToStr(secondsToTime(parseFloat(number)));
	return { ...str, time: number };
};

module.exports = {
	secondsToTime,
	timeToStr,
	secondsToTimeStr
};
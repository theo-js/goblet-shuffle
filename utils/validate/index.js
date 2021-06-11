function validateStr (str) {
	if (str.match(/['"/\\<>(){};:`´]/)) {
		return false;
	}

	return true;
}

function sanitizeStr (str) {
	const re = new RegExp(/['"/\\<>(){}]/, 'g');
	return str.replaceAll(re, '');
}

function isValidNum (value, min, max, included = true) {
	if (
		typeof value !== 'number' ||
		Number.isNaN(value)
	) {
		return false;
	}
	if (included) {
		if (value < min) return false;
		else if (value > max) return false;
		return true;
	} else {
		if (value <= min) return false;
		else if (value >= max) return false;
		return true;
	}
}

function limitNum (value, min, max) {
	if (
		typeof value !== 'number' ||
		Number.isNaN(value)
	) {
		return false;
	}
	if (value < min) return min;
	else if (value > max) return max;
	return value;
}

module.exports = {
	validateStr,
	sanitizeStr,
	isValidNum,
	limitNum
}
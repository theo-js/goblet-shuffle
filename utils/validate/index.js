function validateStr (str) {
	if (typeof str !== 'string') return false;
	if (str.match(/['"/\\<>(){};:`´]/)) {
		return false;
	}

	return true;
}

function sanitizeStr (str) {
	if (typeof str !== 'string') return false;
	const re = new RegExp(/['"/\\<>(){}]/, 'g');
	return str.replace(re, '');
}

function isValidNum (value, min, max, included = true) {
	if (
		typeof value !== 'number' ||
		Number.isNaN(parseFloat(value))
	) {
		return false;
	}
	if (
		Number.isNaN(parseFloat(min)) || 
		Number.isNaN(parseFloat(max))
	) {
		// Value does not have to be within a certain range
		return true;
	}

	// Min and max params were provided; value has to be within this range
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
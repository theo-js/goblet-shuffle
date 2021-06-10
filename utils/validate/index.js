function validateStr (str) {
	if (str.match(/['"/\\<>(){};:`´]/)) {
		return false;
	}

	return true;
}

function sanitizeStr (str) {const re = new RegExp(/['"/\\<>(){}]/, 'g');
	return str.replaceAll(re, '');
}

module.exports = {
	validateStr, sanitizeStr
}
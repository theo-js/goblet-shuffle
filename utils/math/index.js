function avg (v1, v2) {
	return (v1 + v2) /2;
}
function randomInt (min, max) {
	return Math.round(Math.random() * (max - min) + min);
}

module.exports = {
	avg,
	randomInt
}
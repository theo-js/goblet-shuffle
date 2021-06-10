const { PLAYER_ROLE } = require('../../constants')

function hasRole (role) {
	return (req, res, next) => {
		if (req.user.role === role) {
			next();
		}
		return res.status(401).send('Not allowed');
	};
}

module.exports = {
	hasRole
};
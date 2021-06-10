const urlErrMsg = errcode => {
	switch (errcode) {
		case '0':
			return 'Invalid room ID';
			break;
		case '1':
			return 'This room does not exist';
			break;
		case '2':
			return 'You can only own one room';
			break;
		default: return null;
	}
}

module.exports = {
	urlErrMsg
};
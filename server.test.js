const app = require('./server');
const supertest = require('supertest');
const { ROOM_ID_LENGTH } = './constants';

describe('/:roomID', () => {
	test(`redirects to root when given an invalid room id`, async () => {
		const invalidRoomID1 = 'a'.repeat(ROOM_ID_LENGTH + 1);
		const invalidRoomID2 = 'a'.repeat(ROOM_ID_LENGTH - 1);

		await supertest(app).get(`/${invalidRoomID1}`)
		.expect(200)
	});
});
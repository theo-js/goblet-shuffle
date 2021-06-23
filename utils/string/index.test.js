const { randomColor, generateRoomID } = require('./index');
const { ROOM_ID_LENGTH } = require('../../constants');

describe('string', () => {
    test('randomColor', () => {
        const rc3 = randomColor(0, 255); // color has between 1 and 3 digits
        expect(typeof rc3 === 'string').toBeTruthy();
        expect(rc3.match(/rgb\(\d{1,3}, \d{1,3}, \d{1,3}\)/)).toBeTruthy();

        const rc4 = randomColor(1000, 1500); // color has 4 digits
        expect(rc4.match(/rgb\(\d{4}, \d{4}, \d{4}\)/)).toBeTruthy();
    });

    test('generateRoomID', () => {
        const roomID = generateRoomID();
        expect(typeof roomID === 'string').toBeTruthy();
        expect(roomID.length).toBe(ROOM_ID_LENGTH);
        // Test explicitly giving another ID length through parameters
        expect(generateRoomID(5).length).toBe(5);
    });
});
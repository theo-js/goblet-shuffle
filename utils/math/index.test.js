const { avg, randomInt } = require('./index');

describe('math', () => {
    test('avg', () => {
        expect(avg(-100, 100)).toBe(0);
        expect(avg(-10, 0)).toBe(-5);
        expect(avg(0, 10)).toBe(5);
        expect(avg(5, 10)).toBe(7.5);
        let n = 9.2405;
        expect(avg(0, n)).toBe(n/2);
    });

    test ('randomInt', () => {
        // Mock Math.random
        Math.random = jest.fn(() => .5);
        expect(randomInt(0, 4) === 2).toBeTruthy();
        expect(randomInt(2, 4) === 3).toBeTruthy();
        expect(randomInt(0, 100) === 50).toBeTruthy();
        Math.random = jest.fn(() => 1/3);
        expect(randomInt(0, 100) === 33).toBeTruthy();
    });
});
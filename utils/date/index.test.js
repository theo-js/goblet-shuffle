const { secondsToTime, timeToStr, secondsToTimeStr } = require('./index');
const { GAME_CONSTANTS } = require('../../constants');

describe('date', () => {
    test('secondsToTime should return 1 minute (default time) if given invalid number of seconds', () => {
        const defaultTime = { m: 1, s: 0 };
        expect(secondsToTime(null)).toEqual(defaultTime);
        expect(secondsToTime(-1)).toEqual(defaultTime);
    });
    test('secondsToTime ceils result to max countdown', () => {
        const maxTime = secondsToTime(GAME_CONSTANTS.maxCountdown);
        expect(secondsToTime(GAME_CONSTANTS.maxCountdown + 1)).toEqual(maxTime);
    });
    test('secondsToTime', () => {
        expect(secondsToTime(60)).toEqual({ m: 1, s: 0 });
        expect(secondsToTime(92)).toEqual({ m: 1, s: 32 });
        expect(secondsToTime(120)).toEqual({ m: 2, s: 0 });
    });

    test('timeToStr', () => {
        const defaultStr = { m: '01', s: '00' };
        expect(timeToStr()).toEqual(defaultStr); // falsy param
        expect(timeToStr({ m: -1, s: 1 })).toEqual(defaultStr); // negative minutes
        expect(timeToStr({ m: 1, s: -1 })).toEqual(defaultStr); // negative seconds
        expect(timeToStr({ m: 1 })).toEqual(defaultStr); // undefined minutes
        expect(timeToStr({ s: 1 })).toEqual(defaultStr); // undefined seconds
        expect(timeToStr({ m: '1', s: '9' })).toEqual(defaultStr); // NaN parameters
        
        expect(timeToStr({ m: 0, s: 15 })).toEqual({ m: '00', s: '15' });
        expect(timeToStr({ m: 10, s: 0 })).toEqual({ m: '10', s: '00' });
    });

    test('secondsToTimeStr', () => {
        expect(secondsToTimeStr(0)).toEqual({ m: '00', s: '00', time: 0 });
        expect(secondsToTimeStr(59)).toEqual({ m: '00', s: '59', time: 59 });
        expect(secondsToTimeStr(90)).toEqual({ m: '01', s: '30', time: 90 });
        expect(secondsToTimeStr(360)).toEqual({ m: '06', s: '00', time: 360 });
    });
});
const { validateStr, sanitizeStr, isValidNum, limitNum } = require('./index');

describe('validate', () => {
    test('isValidNum should check value type', () => {
        // Test with any range
        expect(isValidNum('a')).toBe(false);
        expect(isValidNum(null)).toBe(false);
        expect(isValidNum(undefined)).toBe(false);
        expect(isValidNum(NaN)).toBe(false);
        expect(isValidNum('1')).toBe(false);
        expect(isValidNum(1)).toBe(true);
        expect(isValidNum(1/3)).toBe(true);
        expect(isValidNum(-1)).toBe(true);
        expect(isValidNum(Infinity)).toBe(true);
    });
    test('isValidNum should check if number falls within defined range', () => {
        // Test with defined range
        expect(isValidNum(10, 0)).toBe(true); // Max is not defined
        expect(isValidNum(10, null, 20)).toBe(true); // Min is not defined
        expect(isValidNum(10, 0, 20)).toBe(true);
        expect(isValidNum(10, 1, 4)).toBe(false); // Value is outside of range
        expect(isValidNum(10, 0, 10)).toBe(true); // Max value is included by default
        expect(isValidNum(10, 0, 10, false)).toBe(false); // Max value is excluded here
        expect(isValidNum(5, 5, 10)).toBe(true); // Min value is included by default
        expect(isValidNum(5, 5, 10, false)).toBe(false); // Min value is excluded here
    });

    test('limitNum should return false when value type is not a number', () => {
        expect(limitNum('a')).toBe(false);
        expect(limitNum(null)).toBe(false);
        expect(limitNum(undefined)).toBe(false);
        expect(limitNum(NaN)).toBe(false);
        expect(limitNum('1')).toBe(false);
    });
    test('limitNum should limit value to defined range', () => {
        // The absence of min/max params cancels the limit
        expect(limitNum(0)).toBe(0);
        expect(limitNum(0, -2)).toBe(0);
        expect(limitNum(0, 2)).toBe(2);
        expect(limitNum(10, undefined, 12)).toBe(10);
        expect(limitNum(10, undefined, 5)).toBe(5);
        expect(limitNum(10, 0, 12)).toBe(10);
        expect(limitNum(100, 0, 12)).toBe(12);
        expect(limitNum(-10, 0, 12)).toBe(0);
    });

    test('validateStr', () => {
        expect(validateStr('Hello world !')).toBe(true);
        expect(validateStr('\'')).toBe(false);
        expect(validateStr('\"')).toBe(false);
        expect(validateStr('\\')).toBe(false);
        expect(validateStr('(')).toBe(false);
        expect(validateStr(')')).toBe(false);
        expect(validateStr(6)).toBe(false);
    });
    test('sanitizeStr', () => {
        expect(sanitizeStr(8)).toBe(false);
        expect(sanitizeStr('Hello world !')).toBe('Hello world !');
        expect(sanitizeStr('Hello \'world !')).toBe('Hello world !');
    });
});
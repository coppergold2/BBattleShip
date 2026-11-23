const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
    getShipPlacement,
    isValidShipPlacement,
    checkAdjacentCells
} = require('./battleshipRules');

const validFleet = {
    carrier: [0, 1, 2, 3, 4],
    battleship: [10, 11, 12, 13],
    cruiser: [20, 21, 22],
    submarine: [30, 31, 32],
    destroyer: [40, 41]
};

test('builds placements horizontally and vertically without wrapping across board edges', () => {
    assert.deepEqual(getShipPlacement(7, false, 3), [7, 8, 9]);
    assert.deepEqual(getShipPlacement(77, true, 3), [77, 87, 97]);
    assert.equal(getShipPlacement(8, false, 3), null);
    assert.equal(getShipPlacement(87, true, 3), null);
});

test('rejects invalid starts and ship lengths', () => {
    assert.equal(getShipPlacement(-1, false, 2), null);
    assert.equal(getShipPlacement(100, false, 2), null);
    assert.equal(getShipPlacement(0, false, 0), null);
    assert.equal(getShipPlacement(0, false, 11), null);
    assert.equal(getShipPlacement(0, false, 2.5), null);
});

test('accepts a complete fleet with straight horizontal or vertical ships', () => {
    const verticalFleet = {
        ...validFleet,
        carrier: [4, 14, 24, 34, 44]
    };

    assert.equal(isValidShipPlacement(validFleet), true);
    assert.equal(isValidShipPlacement(verticalFleet), true);
});

test('accepts the documented ship-placement command format', () => {
    const command = {
        destroyer: [7, 8],
        submarine: [30, 40, 50],
        cruiser: [69, 79, 89],
        battleship: [1, 2, 3, 4],
        carrier: [90, 91, 92, 93, 94]
    };

    assert.equal(isValidShipPlacement(command), true);
});

test('rejects incomplete fleets, incorrect lengths, and invalid cell values', () => {
    const missingShip = { ...validFleet };
    delete missingShip.destroyer;
    const wrongLength = { ...validFleet, carrier: [0, 1, 2, 3] };
    const invalidCell = { ...validFleet, carrier: [0, 1, 2, 3, 100] };
    const fractionalCell = { ...validFleet, carrier: [0, 1, 2, 3, 4.5] };

    assert.equal(isValidShipPlacement(null), false);
    assert.equal(isValidShipPlacement([]), false);
    assert.equal(isValidShipPlacement(missingShip), false);
    assert.equal(isValidShipPlacement(wrongLength), false);
    assert.equal(isValidShipPlacement(invalidCell), false);
    assert.equal(isValidShipPlacement(fractionalCell), false);
});

test('rejects duplicate, overlapping, diagonal, and gapped ship locations', () => {
    const duplicateCell = { ...validFleet, carrier: [0, 1, 2, 3, 3] };
    const overlappingShips = { ...validFleet, destroyer: [3, 4] };
    const diagonalShip = { ...validFleet, carrier: [0, 11, 22, 33, 44] };
    const gappedShip = { ...validFleet, carrier: [0, 1, 3, 4, 5] };
    const wrappedShip = { ...validFleet, carrier: [8, 9, 10, 11, 12] };

    assert.equal(isValidShipPlacement(duplicateCell), false);
    assert.equal(isValidShipPlacement(overlappingShips), false);
    assert.equal(isValidShipPlacement(diagonalShip), false);
    assert.equal(isValidShipPlacement(gappedShip), false);
    assert.equal(isValidShipPlacement(wrappedShip), false);
});

test('keeps AI candidate checks within row and column boundaries', () => {
    assert.equal(checkAdjacentCells(9, new Set([9, 10]), 2, false, []), false);
    assert.equal(checkAdjacentCells(9, new Set([9, 19]), 2, false, []), true);
    assert.equal(checkAdjacentCells(90, new Set([90, 91]), 2, false, []), true);
});

test('returns only valid adjacent directions when extending an AI hit', () => {
    const candidates = checkAdjacentCells(44, new Set([34, 54]), 3, true, [44]);

    assert.deepEqual(candidates, [34, -1, 54, -1]);
});

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { getUnhitShipLocations } = require('./shipReveal');

test('returns unhit locations while omitting ships already fully sunk', () => {
    assert.deepEqual(
        getUnhitShipLocations([1, 2, 8], {
            carrier: [1, 2, 3, 4, 5],
            destroyer: [8, 9]
        }),
        {
            carrier: [3, 4, 5],
            destroyer: [9]
        }
    );
});

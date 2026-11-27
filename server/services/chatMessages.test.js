const test = require('node:test');
const assert = require('node:assert/strict');
const { timestampMessage, createShipLocationMessage } = require('./chatMessages');
const { isValidShipPlacement } = require('./battleshipRules');

test('adds an ISO timestamp without changing the message sender or content', () => {
    const message = { Player: 'Ready to play?' };
    const sentAt = new Date('2026-11-27T03:08:09.000Z');

    assert.deepEqual(timestampMessage(message, sentAt), {
        Player: 'Ready to play?',
        sentAt: '2026-11-27T03:08:09.000Z'
    });
    assert.deepEqual(message, { Player: 'Ready to play?' });
});

test('adds a helpful instruction while preserving reusable ship-placement JSON', () => {
    const shipLocations = {
        destroyer: [7, 8],
        submarine: [30, 40, 50],
        cruiser: [69, 79, 89],
        battleship: [1, 2, 3, 4],
        carrier: [90, 91, 92, 93, 94]
    };
    const message = createShipLocationMessage(shipLocations);
    const json = JSON.stringify(shipLocations);

    assert.equal(
        message.admin,
        `Your ship locations are shown below. Copy the JSON to reuse this fleet: ${json}`
    );

    const reusableJson = message.admin.match(/\{.*\}$/)[0];
    const parsedShipLocations = JSON.parse(reusableJson);
    assert.deepEqual(parsedShipLocations, shipLocations);
    assert.equal(isValidShipPlacement(parsedShipLocations), true);
});

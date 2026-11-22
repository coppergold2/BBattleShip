const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
    getReconnectExpiryAt,
    selectExpiredPlayer
} = require('./reconnectExpiryPolicy');

test('expires from the earliest player disconnect time', () => {
    const disconnectedPlayers = [
        ['first', { disconnectedAt: 1000 }],
        ['second', { disconnectedAt: 4000 }]
    ];

    assert.equal(getReconnectExpiryAt(disconnectedPlayers, 5000), 6000);
});

test('uses the existing first-disconnected player as the forfeit loser', () => {
    const disconnectedPlayers = [
        ['first', { disconnectedAt: 1000 }],
        ['second', { disconnectedAt: 2000 }]
    ];

    assert.deepEqual(selectExpiredPlayer({
        disconnectedPlayers,
        allPlayersDisconnected: true,
        isSinglePlayer: false,
        firstDisconnect: 'first',
        now: 6000,
        gracePeriodMs: 5000
    }), disconnectedPlayers[0]);
});

test('waits for the disconnected player deadline when there is no first-disconnect marker', () => {
    const disconnectedPlayers = [
        ['first', { disconnectedAt: 1000 }],
        ['second', { disconnectedAt: 4000 }]
    ];

    assert.equal(selectExpiredPlayer({
        disconnectedPlayers,
        allPlayersDisconnected: true,
        isSinglePlayer: false,
        firstDisconnect: null,
        now: 5000,
        gracePeriodMs: 5000
    }), null);
});

const {
  getReconnectExpiryAt,
  selectExpiredPlayer,
} = require('../server/reconnectExpiryPolicy');

describe('reconnect expiry policy', () => {
  test('expires from the earliest player disconnect time', () => {
    const disconnectedPlayers = [
      ['first', { disconnectedAt: 1000 }],
      ['second', { disconnectedAt: 4000 }],
    ];

    expect(getReconnectExpiryAt(disconnectedPlayers, 5000)).toBe(6000);
  });

  test('uses the existing first-disconnected player as the forfeit loser', () => {
    const disconnectedPlayers = [
      ['first', { disconnectedAt: 1000 }],
      ['second', { disconnectedAt: 2000 }],
    ];

    expect(selectExpiredPlayer({
      disconnectedPlayers,
      allPlayersDisconnected: true,
      isSinglePlayer: false,
      firstDisconnect: 'first',
      now: 6000,
      gracePeriodMs: 5000,
    })).toEqual(disconnectedPlayers[0]);
  });

  test('waits for the disconnected player deadline when there is no first-disconnect marker', () => {
    const disconnectedPlayers = [
      ['first', { disconnectedAt: 1000 }],
      ['second', { disconnectedAt: 4000 }],
    ];

    expect(selectExpiredPlayer({
      disconnectedPlayers,
      allPlayersDisconnected: true,
      isSinglePlayer: false,
      firstDisconnect: null,
      now: 5000,
      gracePeriodMs: 5000,
    })).toBeNull();
  });
});

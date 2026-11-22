function getReconnectExpiryAt(disconnectedPlayers, gracePeriodMs) {
    const disconnectedAtValues = disconnectedPlayers
        .map(([, player]) => player.disconnectedAt)
        .filter(Number.isFinite);
    if (disconnectedAtValues.length === 0) {
        return null;
    }

    return Math.min(...disconnectedAtValues) + gracePeriodMs;
}

function selectExpiredPlayer({
    disconnectedPlayers,
    allPlayersDisconnected,
    isSinglePlayer,
    firstDisconnect,
    now,
    gracePeriodMs
}) {
    if (allPlayersDisconnected && !isSinglePlayer) {
        const firstDisconnectedPlayer = disconnectedPlayers.find(([userId]) => userId === firstDisconnect);
        if (firstDisconnectedPlayer &&
            now - firstDisconnectedPlayer[1].disconnectedAt >= gracePeriodMs) {
            return firstDisconnectedPlayer;
        }
    }

    return disconnectedPlayers
        .filter(([, player]) => now - player.disconnectedAt >= gracePeriodMs)
        .sort(([, first], [, second]) => first.disconnectedAt - second.disconnectedAt)[0] || null;
}

module.exports = {
    getReconnectExpiryAt,
    selectExpiredPlayer
};

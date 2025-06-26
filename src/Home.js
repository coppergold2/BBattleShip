import React from "react";

const Home = ({ handleLogout, handleSinglePlayerClick, handleMultiPlayerClick, homeStats, numMultiPlayer }) => {
    const calculateWinLoss = () => {
        const games = homeStats.lastTenGames;
        const userId = homeStats.id;
        let wins = 0;
        let losses = 0;
        games.forEach(game => {
            if (game.winner.user && game.winner.user.id.toString() === userId) {
                wins++;
            }
            if (game.loser.user && game.loser.user.id.toString() === userId) {
                losses++;
            }
        });
        const winRate = wins / (wins + losses) || 0; // Avoid division by zero
        return { wins, losses, winRate };
    };

    const { wins, losses, winRate } = calculateWinLoss();

    return (
        <>
            <h2 style={{ textAlign: 'center', color: 'white' }}>User: {homeStats.userName}</h2>
            <div className="home-stats-container">
                <div className="home-stats">
                    <h2>Last 10 Games Stats</h2>
                    <p>Wins: {wins}</p>
                    <p>Losses: {losses}</p>
                    <p className="win-rate">Win Rate: {(winRate * 100).toFixed(2)}%</p>
                </div>
                <div className="home-stats">
                    <h2>Total Game Stats</h2>
                    <p>Wins: {homeStats.allGameStats.wins}</p>
                    <p>Losses: {homeStats.allGameStats.losses}</p>
                    <p className="win-rate">Win Rate: {homeStats.allGameStats.winRate}%</p>
                </div>
            </div>
            <h2 className="match-history-heading">Match History</h2>
            <div className="match-history">
                {homeStats.lastTenGames.map((match, index) => {
                    const isCurrentPlayerWinner = match.winner.user && match.winner.user.id.toString() === homeStats.id;
                    const opponent = isCurrentPlayerWinner ? match.loser.user : match.winner.user;
                    const result = isCurrentPlayerWinner ? 'Won' : 'Lost';
                    return (
                        <div key={index} className={`match-history-item ${result.toLowerCase()}`}>
                            <p><strong>Game Date:</strong> {new Date(match.createdAt).toLocaleString()}</p>
                            <p><strong>Opponent:</strong> {opponent ? opponent.userName : "Computer"}</p>
                            <p><strong>Result:</strong> {result}</p>
                            <p><strong>Duration:</strong> {match.duration.toFixed(2)} seconds</p>
                            <div className="match-history-stats-container">
                                <div className="player-stats">
                                    <p><strong>Player Hits:</strong> {isCurrentPlayerWinner ? match.winner.numHits : match.loser.numHits}</p>
                                    <p><strong>Player Misses:</strong> {isCurrentPlayerWinner ? match.winner.numMisses : match.loser.numMisses}</p>
                                </div>
                                <div className="opponent-stats">
                                    <p><strong>Opponent Hits:</strong> {isCurrentPlayerWinner ? match.loser.numHits : match.winner.numHits}</p>
                                    <p><strong>Opponent Misses:</strong> {isCurrentPlayerWinner ? match.loser.numMisses : match.winner.numMisses}</p>
                                </div>
                            </div>
                            <p><strong>Game Type:</strong> {match.loser.isComputer || match.winner.isComputer ? 'Player vs Computer' : 'Player vs Player'}</p>
                            <p><strong>Status:</strong> {match.isCompleted ? 'Completed' : 'Incomplete'}</p>
                        </div>
                    );
                })}
            </div>
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center'
            }}>
                <button onClick={handleSinglePlayerClick}>Single Player vs Computer</button>
                <button onClick={handleMultiPlayerClick}>Two Player Mode</button>
            </div>
        </>
    );
}

export default Home;
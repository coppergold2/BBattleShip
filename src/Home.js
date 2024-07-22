import React from "react";

const Home = ({ handleLogout, handleSinglePlayerClick, handleMultiPlayerClick, homeStats }) => {
    const calculateWinLoss = () => {
        const {wins: win, losses: loss} = homeStats.lastTenWinRate;
        const winRate = win / (win + loss) || 0; // Avoid division by zero
        return { win, loss, winRate };
    };
    
    const { win, loss, winRate } = calculateWinLoss();
    
    return (
        <>
            <button className="home-button" onClick={handleLogout}>
                Logout
            </button>                
            <h2 style = {{textAlign : 'center', color : 'white'}}>User: {homeStats.userName}</h2>
            <div className="home-stats">
                <h2>Last 10 Games Stats</h2>
                <p>Wins: {win}</p>
                <p>Losses: {loss}</p>
                <p className="win-rate">Win Rate: {(winRate * 100).toFixed(2)}%</p>
            </div>
            <div className = "match-history">

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
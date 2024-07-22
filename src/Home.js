import React from "react";

const Home = ({ handleLogout, handleSinglePlayerClick, handleMultiPlayerClick, homeStats }) => {
    const calculateWinLoss = () => {
        let win = 0;
        let loss = 0;
        const lastTenWinRate = homeStats.lastTenWinRate;
        // Loop through the statArr
        for (let i = 0; i < lastTenWinRate.length; i++) {
            if (lastTenWinRate[i] === "win") {
                win++;
            } else if (lastTenWinRate[i] === "loss") {
                loss++;
            }
        }
    
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
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                textAlign: 'center'
            }}>
                <button onClick={handleSinglePlayerClick}>Single Player vs Computer</button>
                <button onClick={handleMultiPlayerClick}>Two Player Mode</button>
            </div>
        </>
    );
}

export default Home;
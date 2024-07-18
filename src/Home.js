import React from "react";

const Home = ({ handleLogout, handleSinglePlayerClick, handleMultiPlayerClick, lastTenWinRate}) => {
    const calculateWinLoss = () => {
        console.log("Memo ran", lastTenWinRate);
        let win = 0;
        let loss = 0;
    
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
            <div className="home-stats">
                <h2>Last 10 Games Stats</h2>
                <p>Wins: {win}</p>
                <p>Losses: {loss}</p>
                <p>Win Rate: {(winRate * 100).toFixed(2)}%</p>
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
    )
}

export default Home;


import React from "react";

const Home = ({ handleLogout, handleSinglePlayerClick, handleMultiPlayerClick, lastTenWinRate}) => {
    let win = 0 ;
    let loss = 0;
    let winRate;
    const calculateWinRate = (statArr) => {

        // Loop through the statArr
        for (let i = 0; i < statArr.length; i++) {
            if (statArr[i] === "win") {
                win++;
            } else if (statArr[i] === "loss") {
                loss++;
            }
        }
        // Calculate win rate
        winRate = win / (win + loss);
    };
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


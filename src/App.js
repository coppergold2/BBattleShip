import React from 'react';
import Board from './EmptyBoard';
import './App.css'

const App = () => {
  return (
    <>
    <h1>BattleShip</h1>
      <div className='boards'>
        <Board className="player-board" />
        <Board className="opponent-boadrd" />
      </div>
    </>
  );
};

export default App;
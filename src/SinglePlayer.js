import React, { useState } from 'react';
import Board from './EmptyBoard';
import ShipOptions from './ShipOption';
import './App.css'

const SinglePlayer = ({socket}) => {
  const [activeShip, setActiveShip] = useState(null); //ship when being dragged
  const [isFlipped, setIsFlipped] = useState(false);
  const flipBoat = () => {
    setIsFlipped(!isFlipped);
    // Add your logic here to flip the boat in your game
  };
  return (
    <> 
      <h1>BattleShip</h1>
        <>
          <div className='boards'>
            <Board className="player-board" />
          </div>
          <ShipOptions isFlipped={isFlipped} setActiveShip={setActiveShip} activeShip={activeShip} />
          <div className='button-container'>
            <button className='flip-button' onClick={flipBoat}>
              {isFlipped ? 'Flip to Horizontal' : 'Flip to Vertical'}
            </button>
            <button className='random-button' onclick = {() => {socket.current.emit("random")}}>place randomly</button>
          </div>
        </>
      <p>{activeShip}</p>
    </>
  );
};

export default SinglePlayer;
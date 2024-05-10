import React, { useState, useEffect, useRef } from 'react';
import Board from './Board';
import ShipOptions from './ShipOption';
import './App.css'

const MultiPlayer = ({ socket, start, turn, pbCellClass, obCellClass, multiPlayerGameFull }) => {

  const [activeShip, setActiveShip] = useState(null); //ship when being dragged
  const [isFlipped, setIsFlipped] = useState(false);
  const flipBoat = () => {
    setIsFlipped(!isFlipped);
    // Add your logic here to flip the boat in your game
  };

  const handleCellClick = (id) => {
    console.log('clicked')
    socket.emit("attack", id);
  }
  return (
    <>
      {multiPlayerGameFull ? (
        <p className='full'>Sorry, the game room is currently full. Please try again later.</p>
      ) : (
    
          <><div className='boards'>
            <Board className="player-board" pbCellClass={pbCellClass} />
            {start && <Board className="opponent-board" handleCellClick={handleCellClick} turn={turn} obCellClass={obCellClass} />}
          </div><ShipOptions isFlipped={isFlipped} setActiveShip={setActiveShip} activeShip={activeShip} /><div className='button-container'>
              <button className='flip-button' onClick={flipBoat}>
                {isFlipped ? 'Flip to Horizontal' : 'Flip to Vertical'}
              </button>
              <button className='random-button' onClick={() => { socket.emit("random"); } }>Place Randomly</button>
              <button className='start-button' onClick={() => { socket.emit("start"); } }>Start Game</button>
            </div><p>{activeShip}</p></>
   )
};
</>
)
}
export default MultiPlayer;
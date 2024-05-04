import React, { useState } from 'react';
import Board from './Board';
import ShipOptions from './ShipOption';
import './App.css'

const SinglePlayer = ({socket, shipLoc, hitPos}) => {
  const [activeShip, setActiveShip] = useState(null); //ship when being dragged
  const [isFlipped, setIsFlipped] = useState(false);
  const [start, setStart] = useState(false)
  const flipBoat = () => {
    setIsFlipped(!isFlipped);
    // Add your logic here to flip the boat in your game
  };
  const handleCellClick = (id) => {
    socket.emit("attack", id);
  }
  return (
    <> 
        <>
          <div className='boards'>
            <Board className="player-board" shipLoc = {shipLoc}/>
            {start && <Board className="opponent-board" handleCellClick = {handleCellClick} hitPos ={hitPos}/>}
          </div>
          <ShipOptions isFlipped={isFlipped} setActiveShip={setActiveShip} activeShip={activeShip}/>
          <div className='button-container'>
            <button className='flip-button' onClick={flipBoat}>
              {isFlipped ? 'Flip to Horizontal' : 'Flip to Vertical'}
            </button>
            <button className='random-button' onClick = {() => {socket.emit("random")}}>Place Randomly</button>
            <button classNAME='start-button' onClick = {() => {socket.emit("start"); setStart(true)}}>Start Game</button>
          </div>
        </>
      <p>{activeShip}</p>
    </>
  );
};

export default SinglePlayer;
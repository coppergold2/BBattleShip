import React, { useState, useEffect, useRef } from 'react';
import Board from './Board';
import ShipOptions from './ShipOption';
import './App.css'

const MultiPlayer = ({shipLoc}) => {
  const socket = useRef();
  const [isGameFull, setIsGameFull] = useState(false);
  const [activeShip, setActiveShip] = useState(null); //ship when being dragged
  const [singlePlayer, setSinglePlayer] = useState(false);
  const [multiPlayer, setMultiPlayer] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const flipBoat = () => {
    setIsFlipped(!isFlipped);
    // Add your logic here to flip the boat in your game
  };
  return (
    <> 
      <h1>BattleShip</h1>
      {isGameFull ? (
        <p className='full'>Sorry, the game room is currently full. Please try again later.</p>
      ) : (
        <>
          <div className='boards'>
            <Board className="player-board" shipLoc = {shipLoc} />
          </div>
          <ShipOptions isFlipped={isFlipped} setActiveShip={setActiveShip} activeShip={activeShip} />
          <div className='button-container'>
            <button className='flip-button' onClick={flipBoat}>
              {isFlipped ? 'Flip to Horizontal' : 'Flip to Vertical'}
            </button>
            <button className='random-button' onclick = {() => {socket.current.emit("random")}}>place randomly</button>
          </div>
        </>
      )}
      <p>{activeShip}</p>
    </>
  );
};

export default MultiPlayer;
import React, { useState, useEffect, useRef } from 'react';
import socketIOClient from "socket.io-client";
import Board from './EmptyBoard';
import ShipOptions from './ShipOption';
import './App.css'

const MultiPlayer = () => {
  const socket = useRef();
  const [isGameFull, setIsGameFull] = useState(false);
  const [activeShip, setActiveShip] = useState(null); //ship when being dragged
  const [singlePlayer, setSinglePlayer] = useState(false);
  const [multiPlayer, setMultiPlayer] = useState(false);
  useEffect(() => {
    // Creates a websocket connection to the server
    socket.current = socketIOClient('http://localhost:3001', { transports: ['websocket'] });
    socket.current.on('connect', () => {
      console.log('Connected to server');
    });
    socket.current.on('disconnect', () => {
      console.log('Disconnected from server');
    });
    socket.current.on('full', () => {
      setIsGameFull(true);
      socket.current.disconnect();
    })
    // Cleanup function to disconnect when the component unmounts
    return () => {
      socket.current.disconnect();
    };
  }, []);
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
      )}
      <p>{activeShip}</p>
    </>
  );
};

export default MultiPlayer;
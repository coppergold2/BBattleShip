import React, { useState, useEffect } from 'react';
import socketIOClient from "socket.io-client";
import Board from './EmptyBoard';
import ShipOptions from './ShipOption';
import './App.css'

const App = () => {
  useEffect(() => {
    // Creates a websocket connection to the server
    const socket = socketIOClient('http://localhost:3001', { transports : ['websocket'] });
    socket.on('connect', () => {
      console.log('Connected to server');
    });
    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    // Cleanup function to disconnect when the component unmounts
    return () => {
      socket.disconnect();
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
      <div className='boards'>
        <Board className="player-board" />
      </div>
      <ShipOptions isFlipped={isFlipped}/>
      <div className='button-container'>
      <button className = 'flip-button' onClick={flipBoat}>
        {isFlipped ? 'Flip to Horizontal' : 'Flip to Vertical'}
      </button>
      </div>
    </>
  );
};

export default App;
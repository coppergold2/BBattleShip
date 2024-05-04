import React, { useState, useEffect, useRef } from 'react';
import socketIOClient from "socket.io-client";
import './App.css'
import SinglePlayer from './SinglePlayer'
import MultiPlayer from './MultiPlayer'

const App = () => {
  const socket = useRef();
  const [singlePlayer, setSinglePlayer] = useState(false);
  const [multiPlayer, setMultiPlayer] = useState(false);
  const [shipLoc,setShipLoc] = useState(null);
  const [hitPos,setHitPos] = useState(null);
  useEffect(() => {
    // Creates a websocket connection to the server
    socket.current = socketIOClient('http://localhost:3001', { transports: ['websocket'] });
    socket.current.on('connect', () => {
      console.log('Connected to server');
    });
    socket.current.on('disconnect', () => {
      console.log('Disconnected from server');
    });
    socket.current.on('randomresult', (shipLoc) => {
      setShipLoc(shipLoc)
    })
    socket.current.on('hit', (pos) => {
      setHitPos(pos);
    })
    // Cleanup function to disconnect when the component unmounts
    return () => {
      socket.current.disconnect();
    };
  }, []);
  const handleSinglePlayerClick = () => {
    setSinglePlayer(true);
    socket.current.emit("singleplayer")
  }
  const handleMultiPlayerClick = () => {
    setMultiPlayer(true);
    socket.current.emit("multiplayer")
  }
  return (
    <>
      <h1>BattleShip {(singlePlayer && "Single Player vs Computer") || (multiPlayer && "Two Player Mode")}</h1>
      {(!singlePlayer && !multiPlayer) ? (
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
      ) : (singlePlayer && !multiPlayer) ? <SinglePlayer socket = {socket.current} shipLoc = {shipLoc} hitPos = {hitPos}/> : <MultiPlayer socket = {socket.current} shipLoc = {shipLoc}/>
    }
    </>
  );
};

export default App;
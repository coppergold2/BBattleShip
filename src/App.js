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
  const [missPos, setMissPos] = useState(null);
  const [info, setInfo] = useState("Select Your Mode");
  const [turn, setTurn] = useState(null); 
  const [start, setStart] = useState(false)
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
      setInfo("Start the game if you are ready")
    })
    socket.current.on('start', () => {
      setStart(true)
    })
    socket.current.on('turn', () => {
      setTurn(true)
      setInfo('Your turn to attack')
    })
    socket.current.on('hit', (pos) => {
      setHitPos(pos);
      setInfo("You hit the opponent's ship")
    })
    socket.current.on('miss', (pos) => {
      setInfo("You did not hit the opponent's ship this time")
      setMissPos(pos)
      setTurn(false);
    })
    socket.current.on("InvalidAttack", () => {
      alert("invalid attack")
    })
    // Cleanup function to disconnect when the component unmounts
    return () => {
      socket.current.disconnect();
    };
  }, []);
  const handleSinglePlayerClick = () => {
    setSinglePlayer(true);
    socket.current.emit("singleplayer")
    setInfo("Please Place your ships")
  }
  const handleMultiPlayerClick = () => {
    setMultiPlayer(true);
    socket.current.emit("multiplayer")
    setInfo("You are in Multiplayer Mode")
  }
  return (
    <>
      <h1>BattleShip {(singlePlayer && "Single Player vs Computer") || (multiPlayer && "Two Player Mode")}</h1>
      <h2>Info: {info}</h2>
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
      ) : 
      (singlePlayer && !multiPlayer) ? 
      <SinglePlayer socket = {socket.current} shipLoc = {shipLoc} start = {start} hitPos = {hitPos} missPos = {missPos} turn = {turn}/> : 
      <MultiPlayer socket = {socket.current} shipLoc = {shipLoc}/>
    }
    </>
  );
};

export default App;
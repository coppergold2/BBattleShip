import React, { useState, useEffect, useRef } from 'react';
import socketIOClient from "socket.io-client";
import './App.css'
import SinglePlayer from './SinglePlayer'
import MultiPlayer from './MultiPlayer'

const App = () => {
  const socket = useRef();
  const [singlePlayer, setSinglePlayer] = useState(false);
  const [multiPlayer, setMultiPlayer] = useState(false);
  const [shipLoc, setShipLoc] = useState(null);
  const [hitPos, setHitPos] = useState(null);
  const [missPos, setMissPos] = useState(null);
  const [info, setInfo] = useState("Select Your Mode");
  const [turn, setTurn] = useState(null);
  const [start, setStart] = useState(false);
  const [ohitPos, setoHitPos] = useState(null);
  const [omissPos, setoMissPos] = useState(null);
  const [destroyShip, setdestroyShip] = useState(null);
  const [obCellClass, setObCellClass] = useState(null);
  const [pbCellClass, setPbCellClass] = useState(null);
  const [multiPlayerGameFull, setGameFull] = useState(false);
  const [serverDown, setServerDown] = useState(true);

  useEffect(() => {
    // Creates a websocket connection to the server
    socket.current = socketIOClient('http://localhost:3001', { transports: ['websocket'] });
    socket.current.on('connect', () => {
      console.log('Connected to server');
      setServerDown(false);
    });
    socket.current.on('disconnect', () => {
      console.log('Disconnected from server');
      setServerDown(true);
      setSinglePlayer(false);
      setMultiPlayer(false);
      setInfo("Select Your Mode");
      setTurn(null);
      setStart(false);
      setObCellClass(null);
      setPbCellClass(null);
      setGameFull(false);
    });
    socket.current.on('randomresult', (shipLoc) => {
      setPbCellClass((oldClass) => {
        const newCellClass = oldClass.map((cell) => ({
          ...cell,
          shipName: null, // Set shipName to null for each element
        }));
      
        // Update ship locations from shipLoc
        Object.entries(shipLoc).forEach(([ship, locations]) => {
          locations.forEach((location) => {
            newCellClass[location].shipName = ship;
          });
        });
      
        return newCellClass;
      });
      setInfo("Start the game if you are ready")
    })
    socket.current.on('start', () => {
      console.log("start response from server")
      setObCellClass(
        Array.from({ length: 100 }, () => (
          {
            shipName: null,
            hit: false,
            miss: false,
            destroy: false
          }))
      )
      setStart(true)
    })
    socket.current.on("full", (msg) => {
      setGameFull(true)
      setInfo(msg)
    })
    socket.current.on("not enough ship", (msg) => {
      setInfo(msg)
    })
    socket.current.on('turn', (msg) => {
      setTurn(true)
      setInfo(msg)
    })
    socket.current.on('hit', (pos) => {
      setObCellClass((oldClass) => {
        // Create a new array by cloning the old state
        const newCellClass = [...oldClass];
      
        // Set hit to true at the specified position
        newCellClass[pos].hit = true;
      
        // Return the updated state
        return newCellClass;
      });
      setInfo("You hit the opponent's ship, please go again")
    })
    socket.current.on('miss', (pos) => {
      setObCellClass((oldClass) => {
        // Create a new array by cloning the old state
        const newCellClass = [...oldClass];
      
        // Set miss to true at the specified position
        newCellClass[pos].miss = true;
      
        // Return the updated state
        return newCellClass;
      });
      setInfo("You did not hit the opponent's ship this time")
      setTurn(false);
    })
    socket.current.on('destroy', (result) => {
      setInfo("You destroyed the " + result[0] + " ship");
      setObCellClass((oldClass) => {
        // Create a new array by cloning the old state
        const newCellClass = [...oldClass];
        
        result[1].forEach((shipLoc) => {
          newCellClass[shipLoc].shipName = result[0];
        })
        // Set hit to true at the specified position
        
      
        // Return the updated state
        return newCellClass;
      });
    })

    socket.current.on("win", () => {
      setInfo("You Won!")
      setTurn(false)
    })
    socket.current.on('omiss', (pos) => {
      setPbCellClass((oldClass) => {
        // Create a new array by cloning the old state
        const newCellClass = [...oldClass];
      
        // Set miss to true at the specified position
        newCellClass[pos].omiss = true;
      
        // Return the updated state
        return newCellClass;
      });
      setInfo("Your oppoenent did not hit your ship this time")
    })
    socket.current.on('ohit', (pos) => {
      setPbCellClass((oldClass) => {
        // Create a new array by cloning the old state
        const newCellClass = [...oldClass];
      
        // Set hit to true at the specified position
        newCellClass[pos].ohit = true;
      
        // Return the updated state
        return newCellClass;
      });
      setInfo("Your oppoenent hit your ship")
      
    })
    socket.current.on("InvalidAttack", () => {
      alert("invalid attack")
    })

    socket.current.on("info", (msg) => {
      setInfo(msg);
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
    setPbCellClass(
      Array.from({ length: 100 }, () => (
      {
        shipName: null,
        ohit: false,
        omiss: false
      })))
  }
  const handleMultiPlayerClick = () => {
    setMultiPlayer(true);
    socket.current.emit("multiplayer")
    setInfo("Please Place your ships")
    setPbCellClass(
      Array.from({ length: 100 }, () => (
      {
        shipName: null,
        ohit: false,
        omiss: false
      })))
  }
  if (serverDown) {
    return <h1>The server is down</h1>;
  }
  return (
    <>
      <h1>{"BattleShip " + (singlePlayer ? "Single Player vs Computer" : multiPlayer ? "Two Player Mode" : "")}</h1>
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
          <SinglePlayer socket={socket.current} start={start} turn={turn} pbCellClass = {pbCellClass} obCellClass = {obCellClass} /> :
          <MultiPlayer socket={socket.current} start={start} turn={turn} pbCellClass = {pbCellClass} obCellClass = {obCellClass} multiPlayerGameFull = {multiPlayerGameFull}/>
      }
    </>
  );
};

export default App;
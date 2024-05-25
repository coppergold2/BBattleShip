import React, { useState, useEffect, useRef } from 'react';
import socketIOClient from "socket.io-client";
import './App.css'
import Game from './Game'

const App = () => {
  const socket = useRef();
  const [singlePlayer, setSinglePlayer] = useState(false);
  const [multiPlayer, setMultiPlayer] = useState(false);
  const [info, setInfo] = useState("Select Your Mode");
  const [turn, setTurn] = useState(null);
  const [start, setStart] = useState(false);
  const [obCellClass, setObCellClass] = useState(null);
  const [pbCellClass, setPbCellClass] = useState(null);
  const [multiPlayerGameFull, setGameFull] = useState(false);
  const [serverDown, setServerDown] = useState(true);
  const [placedShips, setPlacedShips] = useState([]);
  const [activeShip, setActiveShip] = useState(null); //ship when being dragged
  const [isFlipped, setIsFlipped] = useState(false);
  const [shipLocHover, setShipLocHover] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const ships = {
    'carrier': 5, //length of ship 
    'battleship': 4,
    'cruiser': 3,
    'submarine': 3,
    'destroyer': 2
  };
  useEffect(() => {
    // Creates a websocket connection to the server
    socket.current = socketIOClient('http://localhost:3001', { transports: ['websocket'] });
    socket.current.on('connect', () => {
      console.log('Connected to server');
      socket.current.emit("id");
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
      setPlacedShips([]);
      setIsFlipped(false);
      setShipLocHover(null);
      setActiveShip(null);
      setMessages([]);
      setInput('');
    });
    socket.current.on("oquit", (msg) => {
      setInfo(msg);
      setSinglePlayer(false);
      setMultiPlayer(false);
      setTurn(null);
      setStart(false);
      setObCellClass(null);
      setPbCellClass(null);
      setGameFull(false);
      setPlacedShips([]);
      setIsFlipped(false);
      setShipLocHover(null);
      setActiveShip(null);
      setMessages([]);
      setInput('');
      socket.current.emit("oquit");
    })
    socket.current.on("id", (id) => { document.title = id })
    socket.current.on("message", (messages) => {
      setMessages(messages);
    })
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
    socket.current.on("shipPlacement", (shipLocs) => {
      let shipName = null;
      setPbCellClass((oldClass) => {
        const newCellClass = [...oldClass];
        for (const loc of Object.keys(shipLocs)) {
          if (shipName == null) {
            shipName = shipLocs[loc]
          }
          newCellClass[loc].shipName = shipLocs[loc]
        }
        return newCellClass
      })

      setPlacedShips((prevPlacedShips) => [...prevPlacedShips, shipName]);
    })

    socket.current.on("shipReplacement", (shipLocs) => {

      let shipName = null;
      setPbCellClass((oldClass) => {
        const newCellClass = [...oldClass];
        for (const loc of shipLocs) {
          if (shipName == null) {
            shipName = newCellClass[loc].shipName;
          }
          newCellClass[loc].shipName = null;
        }
        return newCellClass;
      });
      setPlacedShips((prevPlacedShips) => prevPlacedShips.filter(ship => ship !== shipName));
    })
    socket.current.on('start', () => {
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
      setInfo("You started the game, it's your turn to attack")
    })
    socket.current.on('ostart', () => {
      socket.current.emit("findOpponent");
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
      setTurn(false)
    })
    socket.current.on("full", (msg) => {
      setGameFull(true)
      setInfo(msg)
    })
    socket.current.on("not enough ship", (msg) => {
      setInfo(msg)
    })
    socket.current.on('turn', () => {
      setTurn(true)
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
    socket.current.on("updatePossHitLocation", (possHitLocations) => {
      const receivedSet = new Set(possHitLocations);
      console.log(receivedSet)
      setPbCellClass((oldClass) => {
        const newCellClass = oldClass.map((cell) => ({
          ...cell,
          possHitLocation: false
        }))
        for(let i = 0; i< 100; i++){
          if (receivedSet.has(i)) {
            newCellClass[i].possHitLocation = true;
          }
        }
        return newCellClass
      })
    })
    socket.current.on("win", (msg) => {
      setInfo(msg)
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
      setInfo("Your opponent did not hit your ship this time, it's your turn to attack")
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

    socket.current.on("owin", (unHitShip) => {
      setInfo("Your opponent has won, you loss")
      setObCellClass((oldClass) => {
        const newCellClass = [...oldClass];
        for (const shipName in unHitShip) {
          unHitShip[shipName].forEach((element) => {
            newCellClass[element].unHitShip = shipName
          })
        }
        return newCellClass;
      })
    })
    socket.current.on("InvalidAttack", (msg) => {
      alert(msg)
    })
    socket.current.on("InvalidPlacement", (msg) => {
      alert(msg)
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
  const handleRandomPlacement = () => {
    socket.current.emit("random")
    setPlacedShips(['carrier', 'battleship', 'cruiser', 'submarine', 'destroyer'])
    setActiveShip(null);
  }
  const flipBoat = () => {
    setIsFlipped(!isFlipped);
  };
  const handleRightClick = (e) => {
    e.preventDefault();
    if (activeShip) {
      flipBoat();
    }
  };

  useEffect(() => {
    if (activeShip) {
      document.addEventListener('contextmenu', handleRightClick);
    }
    return () => {
      document.removeEventListener('contextmenu', handleRightClick);
    };
  })

  const handleCellClick = (id) => {
    console.log('clicked')
    socket.current.emit("attack", id);
  }
  const handleShipPlacement = (shipLocs) => {
    socket.current.emit("shipPlacement", shipLocs)
    setActiveShip(null);
    setShipLocHover(null);
  }
  const handleShipReplacement = (shipName) => {
    socket.current.emit("shipReplacement", shipName)
    setActiveShip(shipName)
  }
  const handleShipHover = (location) => {
    const row = Math.floor(location / 10);
    const col = location % 10;
    const shipSize = ships[activeShip];
    const isValidLocation = (loc) => loc >= 0 && loc < 100;
    const isLocationOccupied = (loc) => pbCellClass[loc].shipName != null;
    let result = {}
    if (isFlipped) {
      if (row + shipSize <= 10) {
        for (let i = 0; i < shipSize; i++) {
          const loc = row * 10 + col + i * 10;
          if (!isValidLocation(loc) || isLocationOccupied(loc)) {
            result = null;
            break;
          }
          result[loc] = activeShip;
        }
      }
    }
    else {
      if (col + shipSize <= 10) {
        for (let i = 0; i < shipSize; i++) {
          const loc = row * 10 + col + i;
          if (!isValidLocation(loc) || isLocationOccupied(loc)) {
            result = null;
            break;
          }
          result[loc] = activeShip;
        }
      }
    }
    if (result != null && Object.keys(result).length != 0) {
      setShipLocHover(result);
    }
  }

  const handleShipOptionClick = (shipName) => {
    setActiveShip(activeShip === shipName ? null : shipName)
  }
  const handleHoverOut = () => {
    setShipLocHover(null);
  }

  const sendMessage = () => {
    if (input.trim()) {
      const message = input.trim();
      socket.current.emit('message', message);
      setInput('');
    }
  }
  const handleInputChange = (msg) => {
    setInput(msg);
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
        (singlePlayer && !multiPlayer) || (!singlePlayer && multiPlayer && !multiPlayerGameFull) ?
          <Game
            socket={socket.current}
            multiPlayer={multiPlayer} mult
            start={start}
            turn={turn}
            pbCellClass={pbCellClass}
            obCellClass={obCellClass}
            placedShips={placedShips}
            activeShip={activeShip}
            shipLocHover={shipLocHover}
            messages={messages}
            input={input}
            isFlipped={isFlipped}
            handleRandomPlacement={handleRandomPlacement}
            handleShipOptionClick={handleShipOptionClick}
            handleCellClick={handleCellClick}
            handleShipPlacement={handleShipPlacement}
            handleShipReplacement={handleShipReplacement}
            handleHoverOut={handleHoverOut}
            handleShipHover={handleShipHover}
            flipBoat={flipBoat}
            sendMessage={sendMessage}
            handleInputChange={handleInputChange}
          /> :
          <p className='full'>Sorry, the game room is currently full. Please try again later.</p>
      }
    </>
  );
};

export default App;
import React, { useState, useEffect, useRef, useMemo } from 'react';
import socketIOClient from "socket.io-client";
import './App.css'
import Game from './Game'
import Home from './Home'
import Login from './Login'
import axios from 'axios'

axios.defaults.baseURL = 'http://localhost:3001';
const App = () => {
  const socket = useRef();
  const [singlePlayer, setSinglePlayer] = useState(false);
  const [multiPlayer, setMultiPlayer] = useState(false);
  const [info, setInfo] = useState("Select Your Mode");
  const [turn, setTurn] = useState(null);
  const [start, setStart] = useState(false);
  const [obCellClass, setObCellClass] = useState(null);
  const [pbCellClass, setPbCellClass] = useState(null);
  //const [multiPlayerGameFull, setGameFull] = useState(false);
  const [chatEnable, setChatEnable] = useState(true);
  const [serverDown, setServerDown] = useState(true);
  const [placedShips, setPlacedShips] = useState([]);
  const [activeShip, setActiveShip] = useState(null); //ship when being dragged
  const [isFlipped, setIsFlipped] = useState(false);
  const [shipLocHover, setShipLocHover] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [hoveredCell, setHoveredCell] = useState(null);
  const [stats, setStats] = useState({
    numHits: 0,
    numMisses: 0,
    onumHits: 0,
    onumMisses: 0,
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [homeStats, setHomeStats] = useState({ id: "", userName: "", lastTenGames: [], allGameStats: {wins: 0, losses: 0, winRate: 0} });
  const [numMultiPlayer, setNumMultiplayer] = useState(0);
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: ""
  })
  const resetForm = () => {
    setForm({
      username: "",
      email: "",
      password: ""
    });
  };
  const ships = {
    'carrier': 5, //length of ship 
    'battleship': 4,
    'cruiser': 3,
    'submarine': 3,
    'destroyer': 2
  };

  const reset = () => {
    setSinglePlayer(false);
    setMultiPlayer(false);
    setInfo("Select Your Mode");
    setTurn(null);
    setStart(false);
    setObCellClass(null);
    setPbCellClass(null);
    //setGameFull(false);
    setPlacedShips([]);
    setActiveShip(null);
    setIsFlipped(false);
    setShipLocHover(null);
    setMessages([]);
    setInput('');
    setHoveredCell(null);
    setStats({
      numHits: 0,
      numMisses: 0,
      onumHits: 0,
      onumMisses: 0,
    });
    setChatEnable(true);
  }

  useEffect(() => {
    // Creates a websocket connection to the server
    socket.current = socketIOClient('http://localhost:3001', { transports: ['websocket'] });
    socket.current.on('connect', () => {
      console.log('Connected to server');
      setServerDown(false);
    });
    const heartbeatInterval = setInterval(() => {
      if (socket.current) {
        socket.current.emit('heartbeat');
      }
    }, 30000);
    // socket.current.on('login', (id, averageGameOverSteps, games, userName, allGameStats) => {
    //   setIsLoggedIn(true);
    //   setHomeStats((prevHomeStats) => ({
    //     ...prevHomeStats,
    //     id: id,
    //     userName: userName,
    //     lastTenGames: games,
    //     allGameStats: allGameStats
    //   }));
    // })

    // socket.current.on('logout', () => {
    //   reset();
    //   setIsLoggedIn(false);
    //   setHomeStats({ id: "", userName: "", lastTenGames: [], allGameStats: {wins: 0, losses: 0, winRate: 0} })
    //   document.title = "BattleShip";
    // })
    socket.current.on('disconnect', () => { // might need to prepare for reconnection
      console.log('Disconnected from server');
      setServerDown(true);
      setIsLoggedIn(false);
      document.title = "BattleShip"
      reset();
      setNumMultiplayer(0);
      setHomeStats({ id: "", userName: "", lastTenGames: [], allGameStats: {wins: 0, losses: 0, winRate: 0} })
      localStorage.removeItem('token');
      console.log("disconnect triggered");
    });
    socket.current.on("oquit", (msg, games, allGameStats) => {
      
      if (msg != null) {
        setInfo(msg);
      }
      if (games != null) {
        setTurn(false);
        setHomeStats((prevHomeStats) => ({
          ...prevHomeStats,
          lastTenGames: games,
          allGameStats: allGameStats
        }));
      }
      socket.current.emit("oquit");
    })
    socket.current.on("home", (games, allGameStats) => {
      if (games != null) {
        setHomeStats((prevHomeStats) => ({
          ...prevHomeStats,
          lastTenGames: games,
          allGameStats: allGameStats
        }));
      }
      reset();
    })
    socket.current.on("updateMultiplayerCount", (connectedMPClients) => {
      console.log("updateMultiplayerCount: ", connectedMPClients);
      setNumMultiplayer(connectedMPClients)
      console.log(numMultiPlayer)
    })
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
      setPlacedShips(['carrier', 'battleship', 'cruiser', 'submarine', 'destroyer'])
      setInfo("Start the game if you are ready")
    })
    socket.current.on("flip", (flip) => {
      setIsFlipped(flip);
    })
    socket.current.on("selectShip", (shipName) => {
      setActiveShip(shipName);
    })
    socket.current.on("shipPlacement", (shipLocs, shipName) => {
      setPbCellClass((oldClass) => {
        const newCellClass = [...oldClass];
        shipLocs.forEach((loc) => {
          newCellClass[loc].shipName = shipName
        }
        )
        return newCellClass
      })

      setPlacedShips((prevPlacedShips) => [...prevPlacedShips, shipName]);
      setActiveShip(null);
      setShipLocHover(null);
    })

    socket.current.on("shipReplacement", (shipLocs, shipName, index) => {
      setPbCellClass((oldClass) => {
        const newCellClass = [...oldClass];
        for (const loc of shipLocs) {
          newCellClass[loc].shipName = null;
        }
        return newCellClass;
      });
      console.log(index);
      setShipLocHover(new Set([index]))
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
      socket.current.emit("ostart");
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
    // socket.current.on("full", (msg) => {
    //   setGameFull(true)
    //   setInfo(msg)
    // })
    socket.current.on("findOpponent", () => {
      socket.current.emit("findOpponent");
    })
    socket.current.on("removeOpponent", () => {
      socket.current.emit("removeOpponent");
    })
    socket.current.on("multiplayer", () => {
      setMultiPlayer(true);
      setInfo("Please Place your ships")
      setPbCellClass(
        Array.from({ length: 100 }, () => (
          {
            shipName: null,
            ohit: false,
            omiss: false
          })))
    })
    socket.current.on("not enough ship", (msg) => {
      setInfo(msg)
    })
    socket.current.on('turn', () => {
      setTurn(true)
    })
    socket.current.on('hit', (pos, num) => {
      setObCellClass((oldClass) => {
        // Create a new array by cloning the old state
        const newCellClass = [...oldClass];

        // Set hit to true at the specified position
        newCellClass[pos].hit = true;

        // Return the updated state
        return newCellClass;
      });
      setStats((prevStats) => ({
        ...prevStats,
        numHits: num
      }))
      setInfo("You hit the opponent's ship, please go again")
    })
    socket.current.on('miss', (pos, num) => {
      setObCellClass((oldClass) => {
        // Create a new array by cloning the old state
        const newCellClass = [...oldClass];

        // Set miss to true at the specified position
        newCellClass[pos].miss = true;

        // Return the updated state
        return newCellClass;
      });
      setStats((prevStats) => ({
        ...prevStats,
        numMisses: num
      }))
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
      setPbCellClass((oldClass) => {
        const newCellClass = oldClass.map((cell) => ({
          ...cell,
          possHitLocation: false
        }))
        for (let i = 0; i < 100; i++) {
          if (receivedSet.has(i)) {
            newCellClass[i].possHitLocation = true;
          }
        }
        return newCellClass
      })
    })
    socket.current.on("win", (msg, games, allGameStats) => {
      if (msg != null) {
        setInfo(msg)
        setTurn(false)
      }
      setHomeStats((prevHomeStats) => ({
        ...prevHomeStats,
        lastTenGames: games,
        allGameStats: allGameStats
      }));
    })
    socket.current.on('omiss', (pos, num) => {
      setPbCellClass((oldClass) => {
        // Create a new array by cloning the old state
        const newCellClass = [...oldClass];

        // Set miss to true at the specified position
        newCellClass[pos].omiss = true;

        // Return the updated state
        return newCellClass;
      });
      setStats((prevStats) => ({
        ...prevStats,
        onumMisses: num
      }))
      setInfo("Your opponent did not hit your ship this time, it's your turn to attack")
    })
    socket.current.on('ohit', (pos, num) => {
      setPbCellClass((oldClass) => {
        // Create a new array by cloning the old state
        const newCellClass = [...oldClass];

        // Set hit to true at the specified position
        newCellClass[pos].ohit = true;

        // Return the updated state
        return newCellClass;
      });
      setInfo("Your opponent hit your ship")
      setStats((prevStats) => ({
        ...prevStats,
        onumHits: num
      }))

    })

    socket.current.on("owin", (unHitShip, games, allGameStats) => {
      setInfo("Your opponent has won, you loss")
      setHomeStats((prevHomeStats) => ({
        ...prevHomeStats,
        lastTenGames: games,
        allGameStats: allGameStats
      }));
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
    socket.current.on("alert", (msg) => {
      alert(msg)
    })
    socket.current.on("info", (msg) => {
      setInfo(msg);
    })
    // Cleanup function to disconnect when the component unmounts
    return () => {
      clearInterval(heartbeatInterval);
      if(homeStats.id != "") {
        socket.current.emit("userId", homeStats.id)
      }
      socket.current.disconnect();
    };
  }, []);

  const handleSinglePlayerClick = () => {
    setSinglePlayer(true);
    socket.current.emit("singleplayer", homeStats.id)
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
    socket.current.emit("multiplayer", homeStats.id)
  }
  const handleHomeClick = () => {
    socket.current.emit("home")
  }
  const handleRandomPlacement = () => {
    socket.current.emit("random")
    setActiveShip(null);
  }
  const handleShipPlacement = (cell) => {
    socket.current.emit("shipPlacement", cell)
  }
  const handleShipReplacement = (shipName, index) => {
    socket.current.emit("shipReplacement", shipName, index)
  }

  const handleShipHover = (location) => {

    const row = Math.floor(location / 10);
    const col = location % 10;
    const shipSize = ships[activeShip];
    const isValidLocation = (loc) => loc >= 0 && loc < 100;
    const isLocationOccupied = (loc) => {
      return pbCellClass != null && pbCellClass[loc] != null && pbCellClass[loc].shipName != null;
    };
    let result = new Set();
    if (isFlipped) {
      if (row + shipSize <= 10) {
        for (let i = 0; i < shipSize; i++) {
          const loc = row * 10 + col + i * 10;
          if (!isValidLocation(loc) || isLocationOccupied(loc)) {
            result = null;
            break;
          }
          result.add(loc)
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
          result.add(loc)
        }
      }
    }
    console.log("result in handleShipHover", result);
    if (result != null && result.size != 0) {
      setShipLocHover(result);
    }
    else {
      setShipLocHover(new Set([location]));  // why did I do this -> put it as an array because to convert to a number
    }
  }
  const handleFlipBoat = () => {
    socket.current.emit("flip")
  };
  const handleRightClick = (e) => {
    e.preventDefault();
    if (activeShip) {
      handleFlipBoat();
    }
  };

  useEffect(() => {
    if (shipLocHover != null) {
      const shipLocs = Array.from(shipLocHover).map(Number);
      const firstShipCell = Math.min(...shipLocs);
      handleShipHover(firstShipCell)
    }
  }, [isFlipped, placedShips])

  useEffect(() => {
    if (activeShip) {
      document.addEventListener('contextmenu', handleRightClick);
    }
    return () => {
      document.removeEventListener('contextmenu', handleRightClick);
    };
  })

  useEffect(() => {
    document.title = isLoggedIn
      ? `BattleShip - ${homeStats.userName}`
      : "BattleShip";
  }, [isLoggedIn]); 

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log("runned")
    if (token) {
        axios.get('/api/verifyToken', { headers: { Authorization: `Bearer ${token}` } })
            .then(res => {
              setIsLoggedIn(true);
              setHomeStats((prevHomeStats) => ({
                ...prevHomeStats,
                id: res.data.id,
                userName: res.data.userName,
                lastTenGames: res.data.games,
                allGameStats: res.data.allGameStats
              }));
              setNumMultiplayer(res.data.connectedMPClients);
            })
            .catch(() => {
                localStorage.removeItem('token');
            });
    }
}, []);

  const handleCellClick = (id) => {
    socket.current.emit("attack", id);
  }

  const handleShipOptionClick = (shipName) => {
    socket.current.emit("selectShip", shipName);
  }
  const handleShipHoverOut = () => {
    setShipLocHover(null);
  }

  // const sendMessage = (type) => {
  //   if (input.trim()) {
  //     const message = input.trim();
  //     socket.current.emit(type, message);
  //     setInput('');
  //     if (type == "new") {
  //       setRegister(false);
  //     }
  //     if (type == "login") {

  //     }
  //   }
  // }

  const sendMessage = (type) => {
    if (input.trim()) {
      if (!(type == 'message' && chatEnable == false)){
      const message = input.trim();
      socket.current.emit(type, message);
      setInput('');
    }
  }
  }

  // const sendForm = (type) => {
  //   if (type == "login") {
  //     if (form.email.trim() && form.password.trim()){
  //     socket.current("login", form)
  //     }

  //   }

  // }

  const handleNewUserClick = () => {
    if (register == false) {
      setRegister(true)
      resetForm()
    }
  }

  const handleInputChange = (msg) => {
    console.log("msg", msg)
    setInput(msg);
  }

  const handleFormChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }
  const handleCellHover = (index) => {
    setHoveredCell(index);
  }
  const handleCellHoverOut = () => {
    setHoveredCell(null);
  }
  const handleLogout = () => {
    axios.post('/logout', { id: homeStats.id }).then(response => {
      reset()
      setIsLoggedIn(false);
      setNumMultiplayer(0);
      setHomeStats({ id: "", userName: "", lastTenGames: [], allGameStats: {} })
      document.title = "BattleShip";
      localStorage.removeItem('token');
    }).catch(error => {
      alert('logout error:', error.response ? error.response.data : error.message)
    })
  }

  const handleLogin = (email, password) => {
    axios.post('/login', { email, password })
      .then(response => {
        console.log('Login successful:', response.data);
        localStorage.setItem('token', response.data.token);
        setIsLoggedIn(true);
        setHomeStats((prevHomeStats) => ({
          ...prevHomeStats,
          id: response.data.id,
          userName: response.data.userName,
          lastTenGames: response.data.games,
          allGameStats: response.data.allGameStats
        }));
        setNumMultiplayer(response.data.connectedMPClients);
        resetForm(); // Reset the form
      })
      .catch(error => {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          alert('Login error: ' + error.response.data.message);
        } else if (error.request) {
          // The request was made but no response was received
          alert('Login error: No response received from server');
        } else {
          // Something happened in setting up the request that triggered an Error
          alert('Login error: ' + error.message);
        }
      });
  };


  const handleRegister = (username, email, password) => {
    axios.post('/register', { userName: username, email, password })
      .then(response => {
        console.log('Registration successful:', response.data);
        localStorage.setItem('token', response.data.token);
        setIsLoggedIn(true);
        setHomeStats((prevHomeStats) => ({
          ...prevHomeStats,
          id: response.data.id,
          userName: response.data.userName,
        }));
        resetForm(); // Reset the form
        handleBackClick();
      })
      .catch(error => {
        if (error.response) {
          alert('Registration error: ' + error.response.data.message);
        } else if (error.request) {
          alert('Registration error: No response received from server');
        } else {
          alert('Registration error: ' + error.message);
        }
      });
  };
  const handleBackClick = () => {
    setRegister(false);
    resetForm()
  };

  if (serverDown) {
    return <h1>The server is down</h1>;
  }
  return (
    <>
      <h1>
        {`BattleShip ${singlePlayer
          ? "Single Player vs Computer"
          : multiPlayer
            ? "Two Player Mode"
            : isLoggedIn
              ? ""
              : register
                ? "Register"
                : "Login"
          }`}
      </h1>    {isLoggedIn ? (
        <>
          <h2 style={{ color: '#F5FFFA' }}>Info: {info}</h2>
          {(!singlePlayer && !multiPlayer) ?
            <Home handleLogout={handleLogout} handleSinglePlayerClick={handleSinglePlayerClick} handleMultiPlayerClick={handleMultiPlayerClick} homeStats={homeStats} numMultiPlayer={numMultiPlayer} /> :
            (singlePlayer && !multiPlayer) || (!singlePlayer && multiPlayer) ?
              <Game
                socket={socket.current}
                multiPlayer={multiPlayer}
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
                hoveredCell={hoveredCell}
                stats={stats}
                handleRandomPlacement={handleRandomPlacement}
                handleShipOptionClick={handleShipOptionClick}
                handleCellClick={handleCellClick}
                handleShipPlacement={handleShipPlacement}
                handleShipReplacement={handleShipReplacement}
                handleShipHoverOut={handleShipHoverOut}
                handleShipHover={handleShipHover}
                handleFlipBoat={handleFlipBoat}
                sendMessage={sendMessage}
                handleInputChange={handleInputChange}
                handleCellHover={handleCellHover}
                handleCellHoverOut={handleCellHoverOut}
                handleHomeClick={handleHomeClick}
              /> :
              <p className='full'>Sorry, the game room is currently full. Please try again later.</p>
          }
        </>
      ) :
        (<Login
          handleFormChange={handleFormChange}
          // sendMessage={sendMessage}
          handleLogin={handleLogin}
          handleRegister={handleRegister}
          handleNewUserClick={handleNewUserClick}
          handleBackClick={handleBackClick}
          setRegister={setRegister}
          form={form}
          register={register}
        />)
      }
    </>
  );
};

export default App;
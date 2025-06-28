import React, { useState, useEffect, useRef, useMemo } from 'react';
import socketIOClient from "socket.io-client";
import './App.css'
import Game from './Game'
import Home from './Home'
import Login from './Login'
import axios from 'axios'

axios.defaults.baseURL = process.env.REACT_APP_API_URL;
const App = () => {
  const socket = useRef();
  const [isLoading, setIsLoading] = useState(false);
  const [singlePlayer, setSinglePlayer] = useState(false);
  const [multiPlayer, setMultiPlayer] = useState(false);
  const [numOnline, setNumOnline] = useState(0);
  const [info, setInfo] = useState("Select Your Mode");
  const [turn, setTurn] = useState(null);
  const [start, setStart] = useState(false);
  const [obCellClass, setObCellClass] = useState(null);
  const [pbCellClass, setPbCellClass] = useState(null);
  //const [multiPlayerGameFull, setGameFull] = useState(false);
  const [chatEnable, setChatEnable] = useState(true);
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
  const isLoggedInRef = useRef(isLoggedIn)
  useEffect(() => {
    isLoggedInRef.current = isLoggedIn
  }, [isLoggedIn])
  const [homeStats, setHomeStats] = useState({ id: "", userName: "", lastTenGames: [], allGameStats: { wins: 0, losses: 0, winRate: 0 } });
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: ""
  })
  let heartbeatInterval;
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

  const reset = () => { // Not in here: isLoading, numOnline, isLoggedIn, homeStats, form
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

  function handleRC() {
    if (socket.current) {
      console.log("socket.current.id in handleRC outside if statement", socket.current.id);
      console.log("socket.current.connected in handleRC outside if statement", socket.current.connected)
      console.log("socket.current.disconnected in handleRC outside if statement", socket.current.disconnected)
    }
    if (socket.current != null && !socket.current.connected) {
      setIsLoading(true);
      socket.current.io.engine.close();
      console.log("manually closed the connection to trigger a reconnection");
    }
  }
  useEffect(() => {
    const intervalId = setInterval(() => {
      handleRC();
    }, 5000);

    return () => clearInterval(intervalId); // Clean up on unmount
  }, []);


  // Call this after login:
  const connectSocket = (token) => {
    if (socket.current) {
      socket.current.emit("log", "called disconnect on connectSocket first if Statement")
      socket.current.off();
      socket.current.disconnect();
      socket.current = null;
      console.log("disconnected previous socket in connect socket");
    }
    socket.current = socketIOClient(process.env.REACT_APP_SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnectionDelay: 5000
    });
    console.log("connectSocket function global scope is runned")
    socket.current.on("connect", () => {
      console.log("✅ Socket connected:", socket.current.id);
      console.log("🔁 Was session recovered?", socket.current.recovered);
      console.log("isLoggedInRef in connect event", isLoggedInRef.current)
      if (isLoggedInRef.current == false && socket.current.recovered == false) {
        // console.log("reload is runned in connect")
        // window.location.reload()
        socket.current.emit("restoreLogin")
      }

      heartbeatInterval = setInterval(() => {
        socket.current?.emit("heartbeat");
      }, 30000);

    });

    socket.current.on("connect_error", (err) => {
      if (err.message === "Authentication error") {
        alert("Account verification error. Please log in again.");
        logoutTasks();
        setIsLoading(false);
      }
      else if (err.message === "Authentication error: Token required") {
        alert("Token not found, please log in again.");
        logoutTasks();
        setIsLoading(false);
      }
    });

    socket.current.on("RC", () => {
      // setIsLoading(true);
    })
    socket.current.on('disconnect', (reason, details) => { // might need to prepare for reconnection
      const forceDisconnect = (reason == "io server disconnect" || reason == "io client disconnect") ? true : false
      console.log('Disconnected in client side because:', reason, "and the socketId is", socket.current.id);
      console.log('Client Disconnect details', details)

      //setServerDown(true);        
      console.log("log in false here 1")
      setIsLoggedIn(false);
      document.title = "BattleShip"
      reset();
      setHomeStats({ id: "", userName: "", lastTenGames: [], allGameStats: { wins: 0, losses: 0, winRate: 0 } })
      clearInterval(heartbeatInterval);
      setNumOnline(0);

      if (socket.current.active) {
        setIsLoading(true);
      }

    });

    socket.current.on("restoreLogin", (userId, userName, games, allGameStats, msg) => {
      reset()
      setIsLoggedIn(true);
      setHomeStats((prevHomeStats) => ({
        id: userId,
        userName: userName,
        lastTenGames: games,
        allGameStats: allGameStats
      }));
      document.title = `BattleShip - ${userName}`
      setInfo(msg)
      console.log("restoreLogin is runned")
      setIsLoading(false)
    })
    socket.current.on("restoreGame", (player, isSinglePlayer, messages, onumHits, onumMisses, allMissLocations, destroyedShips, turns) => {
      reset()
      setIsLoggedIn(true);
      setHomeStats((prevHomeStats) => ({
        ...prevHomeStats,
        id: player.id,
        userName: player.userName,
      }));
      document.title = `BattleShip - ${player.userName}`
      if (isSinglePlayer) {
        setSinglePlayer(true);
      }
      else {
        setMultiPlayer(true);
      }
      setPbCellClass(() => {
        const newCellClass = Array.from({ length: 100 }, () => ({
          shipName: null,
          ohit: false,
          omiss: false
        }));

        Object.entries(player.shipLoc).forEach(([ship, locations]) => {
          locations.forEach((location) => {
            newCellClass[location].shipName = ship;
          });
        });

        for (let index = 0; index < player.board.length; index++) {
          if (player.board[index] == 2 || player.board[index] == 4) {
            newCellClass[index].ohit = true;
          }
          else if (player.board[index] == 3) {
            newCellClass[index].omiss = true;
          }
        }
        return newCellClass;
      });

      setObCellClass(() => {
        const newCellClass = Array.from({ length: 100 }, () => (
          {
            shipName: null,
            hit: false,
            miss: false,
            destroy: false
          }))
        for (let pos of player.allHitLocations) {
          newCellClass[pos].hit = true;
        }
        for (let pos of allMissLocations) {
          newCellClass[pos].miss = true;
        }
        for (let ship in destroyedShips) {
          if (destroyedShips.hasOwnProperty(ship)) {
            for (let pos of destroyedShips[ship]) {
              newCellClass[pos].shipName = ship
            }
          }
        }
        return newCellClass;

      })

      setPlacedShips(['carrier', 'battleship', 'cruiser', 'submarine', 'destroyer'])
      setStart(true)
      setMessages(messages)
      setStats({ numHits: player.numHits, numMisses: player.numMisses, onumHits: onumHits, onumMisses: onumMisses })
      console.log("turn in restoreGame", turns)
      if (turns) {
        setInfo("Reconnected to the game. Check chat for messages — it's your turn to go.")
      }
      else {
        setInfo("Reconnected to the game. Check chat for messages — it's your opponent's turn right now.")
      }
      setTurn(turns)
      setIsLoading(false)

    })

    socket.current.on('reconnect_attempt', (attempt) => {
      console.log(`🔁 Reconnection attempt #${attempt}`);
    });

    socket.current.on('reconnect', () => {
      console.log("✅ Successfully reconnected");
      // Optional: re-authenticate or rejoin rooms
      // if (homeStats.id) {
      //   socket.current.emit("resyncUser", homeStats.id); // custom event
      // }
    });

    // socket.current.on('reconnect_failed', () => {
    //   console.warn("❌ Failed to reconnect after multiple attempts");
    //   // Optionally show UI or fallback
    //   setIsLoggedIn(false);
    //   console.log("log in false here 5")
    //   document.title = "BattleShip"
    //   reset();
    //   setHomeStats({ id: "", userName: "", lastTenGames: [], allGameStats: { wins: 0, losses: 0, winRate: 0 } })
    //   document.title = "BattleShip"
    //   clearInterval(heartbeatInterval);
    // });
    socket.current.on('logout', () => { // one of the other tabs logouts, so this tab logs out
      alert("you have been logged out")
      logoutTasks()
    })
    socket.current.on('singleplayer', () => {
      setSinglePlayer(true);
      setInfo("Please Place your ships")
      setPbCellClass(
        Array.from({ length: 100 }, () => (
          {
            shipName: null,
            ohit: false,
            omiss: false
          })))
    })
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
      //socket.current.emit("oquit");
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
      setIsLoading(false);
    })
    // socket.current.on("updateMultiplayerCount", (connectedMPClients) => {
    //   console.log("updateMultiplayerCount: ", connectedMPClients);
    // })
    socket.current.on("message", (newMessage) => {
      setMessages(prevMessages => [...prevMessages, newMessage]);
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
      console.log("start event detected")
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
    socket.current.on("userCountUpdate", (count) => {
      setNumOnline(count);
    });
  };
  useEffect(() => {
    // Cleanup function to disconnect when the component unmounts
    return () => {
      console.log("useEffect unmounted")
      clearInterval(heartbeatInterval);
      if (socket.current) {
        socket.current.emit("log", "called disconnect on useEffect cleanup")
        socket.current.disconnect();
        socket.current = null
      }
    };
  }, []);

  const handleSinglePlayerClick = () => {
    socket.current.emit("singleplayer", homeStats.id)
    // setSinglePlayer(true);
    // setInfo("Please Place your ships")
    // setPbCellClass(
    //   Array.from({ length: 100 }, () => (
    //     {
    //       shipName: null,
    //       ohit: false,
    //       omiss: false
    //     })))
  }
  const handleMultiPlayerClick = () => {
    socket.current.emit("multiplayer", homeStats.id)
  }

  const handleStartClick = () => {
    socket.current.emit("start")
  }
  const handleHomeClick = () => {
    setIsLoading(true);
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

  // useEffect(() => {
  //   document.title = isLoggedIn
  //     ? `BattleShip - ${homeStats.userName}`
  //     : "BattleShip";
  // }, [isLoggedIn]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoading(true);
      console.log("verifyToken useEffect runned")
      axios.get('/api/verifyToken', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          setIsLoggedIn(true);
          localStorage.setItem('token', res.data.token); // ✅ Replace old token
          setHomeStats((prevHomeStats) => ({
            ...prevHomeStats,
            id: res.data.id,
            userName: res.data.userName,
            lastTenGames: res.data.games,
            allGameStats: res.data.allGameStats
          }));
          document.title = `BattleShip - ${res.data.userName}`
          connectSocket(token);
        })
        .catch(() => {
          console.log("something is wrong in /api/verifyToken in client side")
          localStorage.removeItem('token');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
    else {
      console.log("token is null in useEffect verifyToken")
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
      if (!(type == 'message' && chatEnable == false)) {
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
  const logoutTasks = () => {
    // 1. Clear heartbeat interval (if you're storing it somewhere)
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }

    // 2. Disconnect socket if exists
    if (socket.current) {
      socket.current.emit("log", "called disconnect on logoutTasks function")
      socket.current.disconnect();
      socket.current = null;
    }

    // 3. Clear token and state
    console.log("token is removed in logoutTasks function")
    localStorage.removeItem('token');
    reset();
    setIsLoggedIn(false);
    setNumOnline(0);
    console.log("login false here 3")
    setHomeStats({
      id: "",
      userName: "",
      lastTenGames: [],
      allGameStats: {}
    });

    document.title = "BattleShip";
  }
  const handleLogout = () => {
    setIsLoading(true);
    axios.post('/logout', { id: homeStats.id, socketId: socket.current.id })
      .then(response => {

        logoutTasks();
      })
      .catch(error => {
        alert('Logout error: ' + (error.response ? error.response.data.message : error.message));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };



  const handleLogin = (email, password) => {
    setIsLoading(true);
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
        document.title = `BattleShip - ${response.data.userName}`
        resetForm(); // Reset the form
        connectSocket(response.data.token);
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
      })
      .finally(() => {
        setIsLoading(false);
      });
  };


  const handleRegister = (username, email, password) => {
    setIsLoading(true);
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
        document.title = `BattleShip - ${response.data.userName}`
        resetForm(); // Reset the form
        handleBackClick();
        connectSocket(response.data.token);
      })
      .catch(error => {
        if (error.response) {
          alert('Registration error: ' + error.response.data.message);
        } else if (error.request) {
          alert('Registration error: No response received from server');
        } else {
          alert('Registration error: ' + error.message);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  const handleBackClick = () => {
    setRegister(false);
    resetForm()
  };

  return (
    <>
      {isLoading && (
        <div className="loading-overlay">
          <img src="./spinner.svg" alt="Loading..." className="spinner" />
        </div>
      )}
      <div className="top-most-container">
        <h1 className={`title${!isLoggedIn ? '-login' : ''}`} >
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
        </h1>
        {(singlePlayer || multiPlayer) ?
          (<button className="home-button" onClick={handleHomeClick}>
            Home
          </button>) : (isLoggedIn && !singlePlayer && !multiPlayer) ?
            (<button className="home-button" onClick={handleLogout}>
              Logout
            </button>) : null}
      </div>
      {isLoggedIn ? (
        <>
          <h2 className="info-container">Info: {info}</h2>
          {(!singlePlayer && !multiPlayer) ?
            <Home handleLogout={handleLogout} handleSinglePlayerClick={handleSinglePlayerClick} handleMultiPlayerClick={handleMultiPlayerClick} homeStats={homeStats} /> :
            (singlePlayer && !multiPlayer) || (!singlePlayer && multiPlayer) ?
              <Game
                userName={homeStats.userName}
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
                handleStartClick={handleStartClick}
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
      } {isLoggedIn ? (
        <div className="user-count">
          👥 <span>{numOnline}</span> users online
        </div>
      ) : null}
      <hr style={{ marginTop: "5rem", borderColor: "#ccc" }} />
      <footer className="footer">
        MIT Licensed · <a href="https://github.com/coppergold2/BBattleShip" style={{ color: "dfff00" }} target="_blank" rel="noopener noreferrer">View Source on GitHub</a>
      </footer>
    </>
  );
};

export default App;
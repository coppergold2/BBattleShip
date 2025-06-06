require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const User = require('./db/UserSchema');  // Import the User model
const Game = require('./db/GameSchema');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

// Use cors middleware for Express
const cors = require("cors");
app.use(cors());  // Allow all origins by default
// Optionally, you can configure specific origins
// app.use(cors({ origin: 'http://your-frontend-domain.com' }));

const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    connectionStateRecovery: {
        //maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        maxDisconnectionDuration: 5 * 1000, // 5 seconds
        skipMiddlewares: false
    }
});

// Server setup
let connectedMPClients = 0;
const maxConnections = 2;
const width = 10;
let AIFirstTimeHitNewShip = false;
//let gameStartTime;
const userSockets = new Map();
app.use(express.json());

// MongoDB connection URI
const uri = process.env.MONGO_URI;

// Mongoose connection options
const mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
    socketTimeoutMS: 45000, // Increase socket timeout to 45 seconds
};

mongoose.connect(uri, mongooseOptions)
    .then(async () => {
        console.log('MongoDB connected');
        await logoutAllPlayers();
    })
    .catch(err => {
        console.error('Error connecting to MongoDB', err);
    });

async function logoutAllPlayers() {
    console.log('Updating isLoggedIn status for all players to log off...');
    try {
        await User.updateMany({ isLoggedIn: true }, { $set: { isLoggedIn: false } });
        io.emit("logout");
        console.log('All players have been logged out.');
    } catch (err) {
        console.error('Error logging out players:', err);
    }
}

process.on('SIGINT', async () => {
    console.log('Shutting down server...');

    await logoutAllPlayers();

    // Gracefully close the server
    process.exit();
});

function generateRoomCode(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/1/0
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function createGameSession({ isSinglePlayer = false, playerId, socketId }) {
  let roomCode;
  do {
    roomCode = generateRoomCode();
  } while (gameRooms[roomCode]); // avoid collision

  const gameId = uuidv4();

  gameRooms[roomCode] = {
    gameId,
    roomCode,
    players: {
      [playerId]: { socketId: null, grid: [], shots: [], connected: true },
    },
    isSinglePlayer,
    status: isSinglePlayer ? 'in_progress' : 'waiting',
    start: false,
    turn: playerId,
    createdAt: Date.now(),
  };

  return { roomCode, gameId };
}

class Player {
    constructor(id, userName, socketId) {
        this.id = id;
        this.userName = userName;
        this.socketId = socketId
        this.board = Array(100).fill(0); // Initialize empty board
        this.isFlipped = false;
        this.numPlaceShip = 0;
        this.shipLoc = { 'destroyer': [], 'submarine': [], 'cruiser': [], 'battleship': [], 'carrier': [] }
        this.numDestroyShip = 0;
        this.numHits = 0;
        this.numMisses = 0;
        this.start = false;
        this.messages = [];
        this.allHitLocations = [];
        this.activeShip = null;
        this.mode = "";
        this.opponent = null;
        this.gameStartTime = null;
        
    }
    displayGrid() {
        let board = this.board;
        if (board.length !== 100) {
            console.error("Invalid board size. Expected an array of length 100.");
            return;
        }
        console.log("player displayGrid", this.id)
        const grid = [];

        for (let i = 0; i < 100; i += 10) {
            const row = board.slice(i, i + 10);
            grid.push(row);
        }

        console.log("Grid:");
        for (const row of grid) {
            console.log(row.join(" "));
        }
    }
    reset() {
        this.board = Array(100).fill(0); // Initialize empty board
        this.isFlipped = false;
        this.numPlaceShip = 0;
        this.shipLoc = { 'destroyer': [], 'submarine': [], 'cruiser': [], 'battleship': [], 'carrier': [] }
        this.numDestroyShip = 0;
        this.numHits = 0;
        this.numMisses = 0;
        this.start = false;
        this.messages = [];
        this.allHitLocations = [];
        this.activeShip = null;
        this.opponent = null;
        this.gameStartTime = null;
    }
}

class Computer {
    constructor(id) {
        this.id = id;
        this.board = Array(100).fill(0);
        this.shipLoc = { 'destroyer': [], 'submarine': [], 'cruiser': [], 'battleship': [], 'carrier': [] }
        this.numDestroyShip = 0;
        this.numHits = 0;
        this.numMisses = 0;
        this.possHitLocations = new Set(Array.from({ length: 100 }, (_, i) => i)); // changing the datastructre from array to set.
        this.maxPossHitLocations = new Set(Array.from({ length: 100 }, (_, i) => i));
        this.hitLocs = [];
        this.possHitDirections = [-1, -1, -1, -1] // north, west, south, east
        this.curHitDirection = null; // contain the direction of hit 0,1,2,3 representing north, west, south, east
        this.opponentShipRemain = { 'destroyer': 1, 'submarine': 1, 'cruiser': 1, 'battleship': 1, 'carrier': 1, 'minSizeShip': 2, 'maxSizeShip': 5 }
        this.userName = "AI"
    }
    displayGrid() {
        let board = this.board;
        if (board.length !== 100) {
            console.error("Invalid board size. Expected an array of length 100.");
            return;
        }
        console.log("computer displayGrid", this.id)
        const grid = [];

        for (let i = 0; i < 100; i += 10) {
            const row = board.slice(i, i + 10);
            grid.push(row);
        }

        console.log("Grid:");
        for (const row of grid) {
            console.log(row.join(" "));
        }
    }
    displayPossHitGrid() {
        const board = this.possHitLocations;
        console.log(this.id);
        const grid = [];
        for (let i = 0; i < 100; i += 10) {
            const row = [];
            for (let j = i; j < i + 10; j++) {
                // Check if the index (j) is present in the set using the has method
                if (board.has(j)) {
                    row.push(1);
                } else {
                    row.push(0);
                }
            }
            grid.push(row);
        }

        console.log("possHitLocations:");
        for (const row of grid) {
            console.log(row.join(" "));
        }
    }
}


const ships = {
    'carrier': 5, //length of ship 
    'battleship': 4,
    'cruiser': 3,
    'submarine': 3,
    'destroyer': 2
};

const players = {};
const gameRooms = {}; // roomCode => game session
const hitMessage = (col, row, userName) => {
    return { 'player': `${userName} hit at row ${row} column ${col}.` }
}

const destroyMessage = (shipName, userName) => {
    return { 'player': `${userName} sunk the ${shipName} ship.` }
}

const missMessage = (col, row, userName) => {
    return { 'player': `${userName} missed at row ${row} column ${col}.` }
}

function getValidity(allBoardBlocks, isHorizontal, startIndex, shipLength) {
    let validStart = isHorizontal ?
        (startIndex <= width * width - shipLength ? startIndex : width * width - shipLength) :
        (startIndex <= width * width - width * shipLength ? startIndex : startIndex - shipLength * width + width)

    let shipBlocks = []
    for (let i = 0; i < shipLength; i++) {
        if (isHorizontal) {
            shipBlocks.push(Number(validStart) + i)
        } else {
            shipBlocks.push(Number(validStart) + i * width) // has an issue when the random index + i * width is bigger than 99
        }
    }
    let valid

    if (isHorizontal) {
        shipBlocks.every((_shipBlock, index) =>
            valid = shipBlocks[0] % width !== width - (shipBlocks.length - (index + 1)))
    } else {
        shipBlocks.every((_shipBlock, index) =>
            valid = shipBlocks[0] < 90 + (width * index + 1)
        )
    }

    const notTaken = shipBlocks.every(shipBlock => allBoardBlocks[shipBlock] != 1)

    return { shipBlocks, valid, notTaken }
}

function getRandomIndexWithOneValue(computer) {
    let nextHitLocations = checkMostValueableHit(players[computer].maxPossHitLocations, players[computer].maxPossHitLocations, players[computer].opponentShipRemain['maxSizeShip'], players[computer].numMisses, players[computer].opponentShipRemain['minSizeShip'])
    nextHitLocations = checkMinAllDirection(nextHitLocations, players[computer].maxPossHitLocations, players[computer].opponentShipRemain['maxSizeShip'])
    console.log("nextHitLocations on getRandomIndexWithOneValue", nextHitLocations);
    const randomIndex = Math.floor(Math.random() * nextHitLocations.length);

    return nextHitLocations[randomIndex];
}

const handleAIMiss = (computer, socket) => {
    if (players[computer].possHitDirections.some(element => element !== -1)) {  // if the next hit positions has already been calculated aka if this is followed by a previous hit
        players[computer].possHitDirections[players[computer].curHitDirection] = -1;
        if (AIFirstTimeHitNewShip == false) {
            switch (players[computer].curHitDirection) {
                case 0:
                    if (players[computer].possHitDirections[2] != -1) {
                        players[computer].curHitDirection = 2;
                    }
                    break;
                case 1:
                    if (players[computer].possHitDirections[3] != -1) {
                        players[computer].curHitDirection = 3;
                    }
                    break;
                case 2:
                    if (players[computer].possHitDirections[0] != -1) {
                        players[computer].curHitDirection = 0;
                    }
                    break;
                case 3:
                    if (players[computer].possHitDirections[1] != -1) {
                        players[computer].curHitDirection = 1;
                    }
                    break;
            }
        }
        if (players[computer].possHitDirections[players[computer].curHitDirection] == -1 || AIFirstTimeHitNewShip == true) {
            players[computer].curHitDirection = pickDirection(players[computer].possHitDirections)
        }
    }
    else {
        checkPossHitLocs(computer)
        socket.emit("updatePossHitLocation", [...players[computer].maxPossHitLocations]);
    }
}

const handleAIHit = (computer, loc) => {
    if (!players[computer].possHitDirections.some(element => element !== -1)) {   // if it contains all -1
        players[computer].possHitDirections = checkAdjacentCells(loc, players[computer].possHitLocations, players[computer].opponentShipRemain.minSizeShip, true, players[computer].hitLocs);
        players[computer].curHitDirection = pickDirection(players[computer].possHitDirections);
        AIFirstTimeHitNewShip = true;
    }
    else if (players[computer].curHitDirection != null) {   // if some of the possHitDirections is not -1 and curHitDirection is not null ?
        AIFirstTimeHitNewShip = false
        const cols = 10;
        switch (players[computer].curHitDirection) {
            case 0:
                if (loc - cols >= 0 && players[computer].possHitLocations.has(loc - cols)) {
                    players[computer].possHitDirections[0] = loc - cols
                }
                else {
                    players[computer].possHitDirections[0] = -1;
                    if (players[computer].possHitDirections[2] != -1) {
                        players[computer].curHitDirection = 2;
                    }
                }
                break;
            case 1:
                if (loc % cols !== 0 && players[computer].possHitLocations.has(loc - 1)) {
                    players[computer].possHitDirections[1] = loc - 1
                }
                else {
                    players[computer].possHitDirections[1] = -1;
                    if (players[computer].possHitDirections[3] != -1) {
                        players[computer].curHitDirection = 3
                    }
                }
                break;
            case 2:
                if (loc + cols < 100 && players[computer].possHitLocations.has(loc + cols)) {
                    players[computer].possHitDirections[2] = loc + cols
                }
                else {
                    players[computer].possHitDirections[2] = -1;
                    if (players[computer].possHitDirections[0] != -1) {
                        players[computer].curHitDirection = 0;
                    }
                }
                break;
            case 3:
                if ((loc + 1) % cols !== 0 && players[computer].possHitLocations.has(loc + 1)) {
                    players[computer].possHitDirections[3] = loc + 1
                }
                else {
                    players[computer].possHitDirections[3] = -1;
                    if (players[computer].possHitDirections[1] != -1) {
                        players[computer].curHitDirection = 1;
                    }
                }
                break;
        }
        if (players[computer].possHitDirections[players[computer].curHitDirection] == -1) {
            players[computer].curHitDirection = pickDirection(players[computer].possHitDirections)
        }
    }
}

const handleAIDestroy = (computer, destroyShip) => {
    removeDestroyShipLoc(computer, destroyShip[1]);
    players[computer].curHitDirection = null;
    players[computer].possHitDirections = [-1, -1, -1, -1]
    // need to update the minSizeShip
    players[computer].opponentShipRemain[destroyShip[0]] = 0;
    let minSize = 5;
    let maxSize = 2;
    for (const shipName in ships) {
        if (players[computer].opponentShipRemain[shipName] == 1) {
            if (ships[shipName] < minSize) {
                minSize = ships[shipName]
            }
            if (ships[shipName] > maxSize) {
                maxSize = ships[shipName];
            }
        }
    }
    players[computer].opponentShipRemain['minSizeShip'] = minSize;
    players[computer].opponentShipRemain['maxSizeShip'] = maxSize;
    console.log('minSizeShip:', players[computer].opponentShipRemain['minSizeShip'])
    console.log('maxSizeShip:', players[computer].opponentShipRemain['maxSizeShip'])

    if (players[computer].hitLocs.length != 0) {
        players[computer].possHitDirections = checkAdjacentCells(players[computer].hitLocs[0], players[computer].possHitLocations, players[computer].opponentShipRemain.minSizeShip, true, players[computer].hitLocs);
        players[computer].curHitDirection = pickDirection(players[computer].possHitDirections);
        AIFirstTimeHitNewShip = true;
    }
    else {
        players[computer].maxPossHitLocations = "reset"
        checkPossHitLocs(computer)
    }
}
function checkAdjacentCells(cellIndex, possHitLocations, minSizeShip, checkHit, hitLocs) {      // check each of the cell within the minSizeShip
    const cols = 10;
    let horiPoss = 1;
    let vertPoss = 1;
    let temp = cellIndex;
    while (horiPoss < minSizeShip) {  // check west    
        if ((temp) % cols !== 0 && (possHitLocations.has(temp - 1) || hitLocs.includes(temp - 1))) {
            horiPoss += 1;
            temp -= 1;
        }
        else {
            break;
        }
    }

    temp = cellIndex;
    while (horiPoss < minSizeShip) {  //check east
        if ((temp + 1) % cols !== 0 && (possHitLocations.has(temp + 1) || hitLocs.includes(temp + 1))) {
            horiPoss += 1;
            temp += 1;
        }
        else {
            break;
        }
    }// check above
    temp = cellIndex;
    while (vertPoss < minSizeShip) { // check north
        if (temp - cols >= 0 && (possHitLocations.has(temp - cols) || hitLocs.includes(temp - cols))) {
            vertPoss += 1;
            temp -= cols;
        }
        else {
            break;
        }
    }
    temp = cellIndex;
    while (vertPoss < minSizeShip) { // check south
        if (temp + cols < 100 && (possHitLocations.has(temp + cols) || hitLocs.includes(temp + cols))) {
            vertPoss += 1;
            temp += cols;
        }
        else {
            break;
        }
    }
    if (horiPoss == minSizeShip || vertPoss == minSizeShip) {
        if (checkHit == false) {
            return true
        }
        else if (checkHit == true) {
            return getNextFourDirection(cellIndex, possHitLocations, hitLocs, horiPoss, vertPoss, minSizeShip)
        }
    }
    else if (checkHit == false) {
        return false;
    }
}

const getNextFourDirection = (cellIndex, possHitLocations, hitLocs, horiPoss, vertPoss, minSizeShip) => {
    const nextHitLocations = [-1, -1, -1, -1]
    const cols = 10;
    let temp = cellIndex;
    if (horiPoss == minSizeShip) {
        if (temp % cols !== 0 && possHitLocations.has(temp - 1)) {  // check left
            temp = temp - 1;
            nextHitLocations[1] = temp;
        }
        else if (temp % cols !== 0 && hitLocs.includes(temp - 1)) {
            temp = temp - 1;
            while (temp % cols !== 0 && hitLocs.includes(temp - 1)) {
                temp = temp - 1;
            }
            if (possHitLocations.has(temp)) {
                nextHitLocations[1] = temp
            }
        }
        temp = cellIndex;
        if ((temp + 1) % cols !== 0 && possHitLocations.has(temp + 1)) { // check right
            temp = temp + 1;
            nextHitLocations[3] = temp;
        }
        else if ((temp + 1) % cols !== 0 && hitLocs.includes(temp + 1)) {
            temp = temp + 1;
            while ((temp + 1) % cols !== 0 && hitLocs.includes(temp + 1)) {
                temp = temp + 1;
            }
            if (possHitLocations.has(temp)) {
                nextHitLocations[3] = temp;
            }
        }
        temp = cellIndex;
    }

    if (vertPoss == minSizeShip) {
        if ((temp - cols) >= 0 && (possHitLocations.has(temp - cols))) { // check above
            temp = temp - cols;
            nextHitLocations[0] = temp
        }
        else if ((temp - cols) >= 0 && hitLocs.includes(temp - cols)) {
            temp = temp - cols;
            while ((temp - cols) >= 0 && hitLocs.includes(temp - cols)) {
                temp = temp - cols;
            }
            if (possHitLocations.has(temp)) {
                nextHitLocations[0] = temp;
            }
        }
        temp = cellIndex;
        if ((temp + cols) < 100 && (possHitLocations.has(temp + cols))) { //check below
            temp = temp + cols;
            nextHitLocations[2] = temp;
        }
        else if ((temp + cols) < 100 && hitLocs.includes(temp + cols)) {
            temp = temp + cols;
            while ((temp + cols) < 100 && hitLocs.includes(temp + cols)) {
                temp = temp + cols;
            }
            if (possHitLocations.has(temp)) {
                nextHitLocations[2] = temp;
            }
        }
    }
    return nextHitLocations;
}

const checkMinAllDirection = (nextHitLocations, possHitLocations, minSizeShip) => {
    console.log("minSizeShip", minSizeShip)
    const countDirctionLocation = { 0: [], 1: [], 2: [], 3: [], 4: [] }
    let temp = 1
    let count = 0
    for (let loc of nextHitLocations) {
        while (temp <= minSizeShip) {   // check west
            if (temp == minSizeShip) {
                count++;
                temp = 1;
                break;
            }
            else {
                if ((loc - temp + 1) % 10 !== 0 && possHitLocations.has(loc - temp)) {
                    temp += 1;
                }
                else {
                    temp = 1
                    break;
                }
            }
        }
        while (temp <= minSizeShip) { // check east
            if (temp == minSizeShip) {
                count++;
                temp = 1;
                break;
            }
            else {
                if ((loc + temp) % 10 !== 0 && possHitLocations.has(loc + temp)) {
                    temp += 1;
                }
                else {
                    temp = 1;
                    break;
                }
            }
        }
        while (temp <= minSizeShip) { // check north
            if (temp == minSizeShip) {
                count++;
                temp = 1;
                break;
            }
            else {
                if (((loc - (temp * 10)) >= 0 && possHitLocations.has(loc - (temp * 10)))) {
                    temp += 1;
                }
                else {
                    temp = 1;
                    break;
                }
            }
        }

        while (temp <= minSizeShip) { // check south
            if (temp == minSizeShip) {
                count++;
                temp = 1;
                break;
            }
            else {
                if (((loc + (temp * 10)) < 100) && possHitLocations.has(loc + (temp * 10))) {
                    temp += 1;
                }
                else {
                    temp = 1;
                    break
                }
            }
        }
        countDirctionLocation[count].push(loc);
        temp = 1;
        count = 0;
    }

    let pickNum = pickNumber(countDirctionLocation);
    console.log("checkMinAllDirection Result", pickNum);
    return countDirctionLocation[pickNum];
}

function getBiggestKeyWithElements(obj) {
    // Initialize the biggest key variable to null
    let biggestKey = null;

    // Iterate through the keys in the object
    for (let key in obj) {
        // Convert the key to a number
        let numKey = Number(key);

        // Check if the array associated with the key has at least one element
        if (obj[key].length > 0) {
            // Update the biggest key if it is null or if the current key is larger
            if (biggestKey === null || numKey > biggestKey) {
                biggestKey = numKey;
            }
        }
    }
    return obj[biggestKey];
}

const checkMostValueableHit = (nextHitLocations, possHitLocations, maxSizeShip, totalMisses, minSizeShip) => {
    let mostEliminate = 0;
    let mostELocations = new Set();
    let tempPossHitLocations = new Set(possHitLocations);
    for (let pos of nextHitLocations) {
        tempPossHitLocations.delete(pos);
        for (let loc of tempPossHitLocations) {
            const result = checkAdjacentCells(loc, tempPossHitLocations, maxSizeShip, false, []);
            if (result == false) {
                tempPossHitLocations.delete(loc);
            }
        }
        let diffSize = possHitLocations.size - tempPossHitLocations.size;
        if (diffSize >= mostEliminate) {
            if (diffSize == mostEliminate) {
                mostELocations.add(pos)
            }
            else {
                mostEliminate = diffSize;
                mostELocations = new Set([pos])
            }
        }
        tempPossHitLocations = new Set(possHitLocations)
    }
    console.log("mostEliminate", mostEliminate);
    if ((maxSizeShip == 2 && mostEliminate > 2) || minSizeShip > 2 || totalMisses >= 30) {
        return [...mostELocations]
    }
    return nextHitLocations;
}

function pickNumber(countDirectionLocation) {

    let probabilities = [
        { number: 4, probability: 60 },
        { number: 3, probability: 30 },
        { number: 2, probability: 7 },
        { number: 1, probability: 2 },
        { number: 0, probability: 1 }
    ];

    // Filter out numbers with empty arrays
    probabilities = probabilities.filter(item => countDirectionLocation[item.number].length > 0);

    // Calculate the sum of the remaining probabilities
    const totalProbability = probabilities.reduce((sum, item) => sum + item.probability, 0);

    // Normalize the probabilities to sum to 100%
    probabilities.forEach(item => {
        item.probability = (item.probability / totalProbability) * 100;
    });

    // Create the weighted array based on the adjusted probabilities
    const weightedArray = probabilities.flatMap(item => Array(Math.round(item.probability)).fill(item.number));
    const randomIndex = Math.floor(Math.random() * weightedArray.length);

    return weightedArray[randomIndex];
}

const pickDirection = (possHitDirections) => {
    const numDirRemain = possHitDirections.filter(element => element !== -1).length;
    console.log("numDirRemain", numDirRemain);
    return numDirRemain == 1 ? possHitDirections.findIndex(element => element !== -1) : randomIndexNonMinusOne(possHitDirections);
}

function randomIndexNonMinusOne(arr) {
    // Filter out elements that are -1
    const nonMinusOneElements = arr.filter(element => element !== -1);

    // Check if there are any non-minus-one elements
    if (!nonMinusOneElements.length) {
        return "There are no elements other than -1 in the array.";
    }

    // Generate a random index within the bounds of the filtered array
    const randomIndex = Math.floor(Math.random() * nonMinusOneElements.length);

    // Return the original index corresponding to the random non-minus-one element
    return arr.indexOf(nonMinusOneElements[randomIndex]);
}
const checkPossHitLocs = (computer) => {
    console.log("got to here before bugging")
    for (let loc of players[computer].possHitLocations) {
        const result = checkAdjacentCells(loc, players[computer].possHitLocations, players[computer].opponentShipRemain['minSizeShip'], false, players[computer].hitLocs)
        if (result == false) {
            players[computer].possHitLocations.delete(loc);
        }
    }
    if (players[computer].maxPossHitLocations == "reset") {
        players[computer].maxPossHitLocations = new Set(players[computer].possHitLocations);
    }
    else {
        for (let loc of players[computer].maxPossHitLocations) {
            const result = checkAdjacentCells(loc, players[computer].maxPossHitLocations, players[computer].opponentShipRemain['maxSizeShip'], false, players[computer].hitLocs)
            if (result == false) {
                players[computer].maxPossHitLocations.delete(loc);
            }
        }
    }
}

const computerMove = (curPlayer, socket, opponent) => {
    if (players[curPlayer] != null && players[opponent] != null) {
        let pos;
        if (players[opponent].hitLocs.length == 0) {

            pos = getRandomIndexWithOneValue(opponent)
        }
        else if (players[opponent].curHitDirection != null) { // what if hitLocs is not null and curHitDirection is null.   
            pos = players[opponent].possHitDirections[players[opponent].curHitDirection]
        }
        players[opponent].possHitLocations.delete(pos);
        players[opponent].maxPossHitLocations.delete(pos);

        console.log("computer move", pos)
        if (players[curPlayer].board[pos] === 0) {  // miss
            handleMissComm(opponent, curPlayer, pos);
            handleAIMiss(opponent, socket)
            socket.emit("turn")
        }
        else if (players[curPlayer].board[pos] === 1) { // hit
            handleHitComm(opponent, curPlayer, pos);
            handleAIHit(opponent, pos)
            handleDestroyComm(opponent, curPlayer, pos);
            if (players[opponent].numDestroyShip < 5) {
                socket.emit("info", "The AI is thinking ...")
                setTimeout(() => {
                    computerMove(curPlayer, socket, opponent);
                }, 500);
            }
        }
    }
    else {
        console.log("here2")
    }
}


const randomBoatPlacement = (roomCode, user) => {
    const gameRoom = gameRooms[roomCode];
    gameRoom.players[user].board = Array(100).fill(0);
    function addShipPiece(allBoardBlocks, shipLength) {
        let randomBoolean = Math.random() < 0.5
        let isHorizontal = randomBoolean
        let startIndex = Math.floor(Math.random() * width * width)
        const { shipBlocks, valid, notTaken } = getValidity(allBoardBlocks, isHorizontal, startIndex, shipLength)
        if (valid && notTaken) {
            return shipBlocks
        } else {
            return addShipPiece(allBoardBlocks, shipLength)
        }
    }
    for (let ship in ships) {
        const result = addShipPiece(gameRoom.players[user].board, ships[ship])
        gameRoom.players[user].shipLoc[ship] = result;
        result.forEach((pos) => { gameRoom.players[user].board[pos] = 1 })
    }
    console.log("gameRoom.players[user].shipLoc: ", gameRoom.players[user].shipLoc)
}

function generateRandomString(length) {
    let array = new Uint8Array(length);
    crypto.randomFillSync(array);
    let result = '';
    for (let i = 0; i < array.length; i++) {
        result += (array[i] % 36).toString(36);
    }
    return result;
}

const checkShip = (opponent, pos) => {
    let shipPosition = [];
    let shipName = "";
    for (let ship in ships) {
        if (players[opponent].shipLoc[ship].includes(pos)) { shipPosition = players[opponent].shipLoc[ship]; shipName = ship; break; }
    }
    let shipDestoryed = true;
    shipPosition.forEach((index) => {
        if (players[opponent].board[index] != 2) {
            shipDestoryed = false;
        }
    })
    if (shipDestoryed == true) {
        return [shipName, shipPosition];
    }
    else {
        return "normal";
    }
}

const checkForMPOpponent = ((curPlayer) => { // there can only be two online player
    for (let id in players) {
        if (players[id].mode == "multiplayer" && id != curPlayer) {
            console.log("id:", id);
            console.log("curPlayer:", curPlayer)
            return id;
        }
    }
    return null;
})

const removeDestroyShipLoc = (computer, destroyShip) => {
    for (let i = players[computer].hitLocs.length - 1; i >= 0; i--) {
        if (destroyShip.includes(players[computer].hitLocs[i])) {
            players[computer].hitLocs.splice(i, 1);
        }
    }
}

const getRowAndColumn = (index) => {
    const numRows = 10; // Number of rows
    const numCols = 10; // Number of columns

    if (index < 0 || index >= numRows * numCols) {
        throw new Error('Index out of bounds');
    }

    const col = Math.floor(index / numCols) + 1; // Row starting from 1
    const row = (index % numCols) + 1; // Column starting from 1

    return { row, col };
}
const loserGetUnHitShip = (loserHits, winnerShips) => {
    const unHitShips = {}
    for (const shipName in winnerShips) {
        let shipLocations = winnerShips[shipName];

        // Filter out locations hit by the loser
        shipLocations = shipLocations.filter(location => !loserHits.includes(location));
        if (shipLocations.length > 0) {
            unHitShips[shipName] = shipLocations
        }
    }

    return unHitShips;
};

const handleMissComm = ((misser, receiver, pos) => {
    const { row, col } = getRowAndColumn(pos);
    players[misser].numMisses++;
    players[receiver].board[pos] = 3;
    if (players[misser] instanceof Computer) {
        io.to(players[receiver].socketId).emit("omiss", pos, players[misser].numMisses)  // players[receiver].socketId
        players[receiver].messages.push(missMessage(row, col, players[misser].userName))
        io.to(players[receiver].socketId).emit("message", players[receiver].messages)
        // io.to.emit("turn")
    }
    else if (players[misser] instanceof Player) {
        io.to(players[misser].socketId).emit('miss', pos, players[misser].numMisses);
        players[misser].messages.push(missMessage(row, col, players[misser].userName))
        io.to(players[misser].socketId).emit("message", players[misser].messages)
        if (players[receiver] instanceof Player) {
            io.to(players[receiver].socketId).emit("omiss", pos, players[misser].numMisses);
            io.to(players[receiver].socketId).emit("turn");
            players[receiver].messages.push(missMessage(row, col, players[misser].userName));
            io.to(players[receiver].socketId).emit("message", players[receiver].messages);
        }
    }
})

const handleHitComm = ((hitter, receiver, pos) => {
    players[receiver].board[pos] = 2;
    players[hitter].numHits++;
    const { row, col } = getRowAndColumn(pos);
    if (players[receiver] instanceof Player) {
        io.to(players[receiver].socketId).emit("ohit", pos, players[hitter].numHits)
        players[receiver].messages.push(hitMessage(row, col, players[hitter].userName))
        io.to(players[receiver].socketId).emit("message", players[receiver].messages)
    }
    if (players[hitter] instanceof Computer) {
        players[hitter].hitLocs.push(pos)
    }
    if (players[hitter] instanceof Player) {
        players[hitter].allHitLocations.push(pos);
        io.to(players[hitter].socketId).emit('hit', pos, players[hitter].numHits); //players[hitter].socketId
        players[hitter].messages.push(hitMessage(row, col, players[hitter].userName))
        io.to(players[hitter].socketId).emit("message", players[hitter].messages)
    }
})

const handleDestroyComm = async (hitter, receiver, pos) => {
    const result = checkShip(receiver, pos);
    if (result != "normal") {
        players[hitter].numDestroyShip++;
        if (players[receiver] instanceof Player) {
            players[receiver].messages.push(destroyMessage(result[0], players[hitter].userName))
            io.to(players[receiver].socketId).emit("message", players[receiver].messages);
        }
        if (players[hitter] instanceof Player) {
            io.to(players[hitter].socketId).emit("destroy", result);
            players[hitter].messages.push(destroyMessage(result[0], players[hitter].userName));
            io.to(players[hitter].socketId).emit("message", players[hitter].messages);
        }
        if (players[hitter].numDestroyShip == 5) {
            await handleGameEndDB(hitter, receiver, 'Complete')
            if (players[hitter] instanceof Player) {
                const games = await findLast10GamesForUser(hitter);
                const allGameStats = await calculateWinRate(hitter)
                io.to(players[hitter].socketId).emit("win", "You win !", games, allGameStats);
                players[hitter].start = false;
                //players[hitter].mode = "";
            }
            if (players[receiver] instanceof Player) {
                const games = await findLast10GamesForUser(receiver)
                const allGameStats = await calculateWinRate(receiver)
                io.to(players[receiver].socketId).emit(
                    "owin",
                    loserGetUnHitShip(players[receiver].allHitLocations, players[hitter].shipLoc),
                    games,
                    allGameStats
                );
                players[receiver].start = false;
                //players[hitter].mode = "";
            }
            // if (players[hitter] instanceof Player && players[receiver] instanceof Player) {
            //     connectedMPClients -= 2; // did this so that other players can play multiplayer since only two at a time
            //     // need to reset hitter and receiver or should I do it when they press home ? 
            // }
        }
        else if (players[hitter] instanceof Computer) {
            handleAIDestroy(hitter, result)
        }
    }

}

const handleGameEndDB = async (hitter, receiver, gameEndType) => {
    try {
        const gameStartTime = players[hitter].gameStartTime ? players[hitter.gameStartTime] : players[receiver].gameStartTime
        const gameEndTime = new Date();
        const gameDuration = (gameEndTime - gameStartTime) / 1000;
        // Create player objects for winner (hitter) and loser (receiver)
        const winnerPlayer = {
            user: players[hitter] instanceof Player ? hitter : null,
            isComputer: players[hitter] instanceof Computer,
            numHits: players[hitter].numHits,
            numMisses: players[hitter].numMisses
        };

        const loserPlayer = {
            user: players[receiver] instanceof Player ? receiver : null,
            isComputer: players[receiver] instanceof Computer,
            numHits: players[receiver].numHits,
            numMisses: players[receiver].numMisses
        };
        console.log("loserPlayer", loserPlayer)
        // Create and save the new Game document
        const newGame = new Game({
            winner: winnerPlayer,
            loser: loserPlayer,
            duration: gameDuration,
            isCompleted: gameEndType == "Complete" ? true : false,
            createdAt: Date.now()
        });

        const savedGame = await newGame.save();

        // Update User documents for human players
        const updatePromises = [];

        if (players[hitter] instanceof Player) {
            updatePromises.push(
                User.findByIdAndUpdate(
                    hitter,
                    { $push: { games: savedGame._id } },
                    { new: true }
                )
            );
        }

        if (players[receiver] instanceof Player) {
            updatePromises.push(
                User.findByIdAndUpdate(
                    receiver,
                    { $push: { games: savedGame._id } },
                    { new: true }
                )
            );
        }

        // Wait for all updates to complete
        await Promise.all(updatePromises);

        console.log('Game ended and saved successfully');
        return savedGame;
    } catch (error) {
        console.error('Error ending game:', error);
        throw error;
    }
}
async function findLast10GamesForUser(userId) {
    try {
        // Ensure the userId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }
        const user = await User.findById(userId)
        const last10Games = user.games.slice(-10);

        const games = await Game.find({ _id: { $in: last10Games } }).sort({ createdAt: -1 })
            .populate({
                path: 'winner.user',
                select: 'userName'
            })
            .populate({
                path: 'loser.user',
                select: 'userName'
            });
        return games;
    } catch (error) {
        console.error('Error finding games for user:', error);
        throw error;
    }
}

async function calculateWinRate(userId) {
    try {
        // Ensure the userId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        const user = await User.findById(userId)
        const games = await Game.find({ _id: { $in: user.games } })

        // Calculate the total number of games, wins, and losses
        const totalGames = games.length;
        const wins = games.filter(game => game.winner.user && game.winner.user.toString() === userId.toString()).length;
        const losses = games.filter(game => game.loser.user && game.loser.user.toString() === userId.toString()).length;
        // Calculate win rate
        const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

        return {
            wins,
            losses,
            winRate: Math.round(winRate)
        };
    } catch (error) {
        console.error('Error calculating win rate:', error);
        throw error;
    }
}

// calculateWinRate('669e6890491ff3876acd1005')
//     .then(games => {
//         console.log("winRate", games);
//     })
//     .catch(error => {
//         console.error('Error:', error);
//     });

function isValidShipPlacement(command) {
    if (typeof command !== 'object' || command === null) return false;

    for (const ship in ships) {
        if (!Array.isArray(command[ship]) || command[ship].length !== ships[ship]) {
            console.log("false in 1")
            return false;
        }

        if (!command[ship].every((cell) => Number.isInteger(cell) && cell >= 0 && cell < 100)) {
            console.log("false in 2")
            return false;
        }
    }

    return true;
}

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check if already logged in
        //   if (user.isLoggedIn) {
        //     return res.status(403).json({ message: 'User is already logged in elsewhere' });
        //   }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Create and sign a JWT
        const token = jwt.sign(
            {
                userId: user._id,
                userName: user.userName
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Update user's isLoggedIn status and lastSeen
        user.isLoggedIn = true;
        user.lastSeen = new Date();
        await user.save();
        console.log("user.isLoggedIn", user.isLoggedIn);
        const games = await findLast10GamesForUser(user._id);
        const allGameStats = await calculateWinRate(user._id);
        console.log("allGameStats", allGameStats)
        res.json({
            message: 'Login successful',
            token,
            id: user._id,
            userName: user.userName,
            games: games,
            allGameStats: allGameStats,
            connectedMPClients: connectedMPClients
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

app.get('/api/verifyToken', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
        if (err) return res.sendStatus(403);
        console.log("verifyToken sucessfully run", user)
        const curUser = await User.findById(user.userId)
        curUser.lastSeen = new Date();
        curUser.isLoggedIn = true;
        await curUser.save();
        // console.log("curUser", curUser)
        const games = await findLast10GamesForUser(user.userId);
        const allGameStats = await calculateWinRate(user.userId);
        res.json({ id: user.userId, userName: curUser.userName, games: games, allGameStats: allGameStats, connectedMPClients: connectedMPClients });
    });
});

app.post('/register', async (req, res) => {
    try {
        const { userName, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({
            userName,
            email,
            password: hashedPassword,
            isLoggedIn: true,
            lastSeen: new Date()
        });

        // Save user to database
        await newUser.save();

        // Create and sign a JWT
        const token = jwt.sign(
            {
                userId: newUser._id,
                userName: newUser.userName
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Respond with success message, token, and user ID
        res.status(201).json({
            message: 'User registered successfully',
            token,
            id: newUser._id, userName: newUser.userName
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});
app.post('/logout', async (req, res) => {
    try {
        const curPlayer = req.body.id;
        // Find the user by the curPlayer ID
        const user = await User.findById(curPlayer);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update user's isLoggedIn status and lastSeen
        user.isLoggedIn = false;
        user.lastSeen = new Date();
        await user.save();

        // logout all logged in front-end

        const sockets = userSockets.get(curPlayer);
        if (sockets) {
            for (const socketId of sockets) {
                if (socketId != req.body.socketId) {
                    io.to(socketId).emit("logout");
                }
            }
        }

        if (userSockets.has(curPlayer)) {
            userSockets.delete(curPlayer);
            io.emit("userCountUpdate", userSockets.size)
            console.log("userSockets after delete in logout", userSockets)
        }
        // Clear the curPlayer variable
        if (players[curPlayer] != null) {
            delete players[curPlayer];
        }


        // Respond with success message
        res.json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Server error during logout' });
    }
});

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    console.log("io.use is runned")
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = payload.userId;
        next();
    } catch (err) {
        next(new Error("Authentication error"));
    }
});

io.on('connection', (socket) => {
    let opponent;
    let curPlayer;
    let gameRoom;
    const userId = socket.userId; // from middleware
    const userName = socket.userName;
    if (socket.recovered) {
        // recovery was successful: socket.id, socket.rooms and socket.data were restored
        console.log("🔄 Session recovered");
        console.log("socket room", socket.rooms, "socket data", socket.data)
        curPlayer = socket.userId;
        if (gameRoom.players[curPlayer]) {
            opponent = gameRoom.players[curPlayer].opponent;
        }
        if (socket.rooms != null) {

        }
    } else {
        // new or unrecoverable session
        console.log("🆕 New connection");
    }

    if (userSockets.has(userId)) {
        userSockets.get(userId).add(socket.id);
    } else {
        userSockets.set(userId, new Set([socket.id]));
        io.emit("userCountUpdate", userSockets.size)
    }

    console.log("userSockets after adding in socket connection event: ", userSockets)

    // socket.on("login", async (userId) => {
    //     try {
    //         console.log("userId:", userId)
    //         const user = await User.findOne({ _id: userId });
    //         if (user) {
    //             if (user.isLoggedIn == true) {
    //                 socket.emit('alert', "This user is already logged in");
    //             }
    //             else {
    //                 user.isLoggedIn = true;
    //                 user.lastSeen = new Date();
    //                 await user.save(); // Save the updated user to the database
    //                 curPlayer = user._id.toString()
    //                 const games = await findLast10GamesForUser(userId)
    //                 const allGameStats = await calculateWinRate(curPlayer)
    //                 socket.emit('login', userId, user.averageGameOverSteps, games, user.userName, allGameStats);
    //             }
    //         } else {
    //             socket.emit('alert', "invalid ID, please retry or be a new user ")
    //         }
    //     }
    //     catch (err) {
    //         socket.emit('alert', 'An error occurred while logging in');
    //     }
    // })
    // socket.on("new", async (userName) => {
    //     try {
    //         const newUser = new User();
    //         newUser.isLoggedIn = true;
    //         newUser.userName = userName;
    //         // Save the new user to the database
    //         await newUser.save();
    //         console.log('User added to the database');
    //         curPlayer = newUser._id.toString();
    //         // Emit the user's ID after successful save
    //         socket.emit("login", newUser._id.toString(), newUser.averageGameOverSteps, newUser.games, newUser.userName, { wins: 0, losses: 0, winRate: 0 });
    //     } catch (err) {
    //         console.log('Error adding user to the database:', err);
    //     }
    // });
    // socket.on("logout", async () => {
    //     try {
    //         if (curPlayer) {
    //             // Find the user by curPlayer (which contains the userId)
    //             const user = await User.findOne({ _id: curPlayer });

    //             if (user) {
    //                 // Set the user's isLoggedIn status to false
    //                 user.isLoggedIn = false;
    //                 await user.save();
    //             }       

    //             // Clean up the players object if the player exists
    //             if (gameRoom.players[curPlayer] != null) {
    //                 delete gameRoom.players[curPlayer];
    //             }

    //             // Reset curPlayer
    //             curPlayer = null;

    //             // Emit the logout event
    //             socket.emit("logout");
    //         } else {
    //             socket.emit("alert", "No user is currently logged in");
    //         }
    //     } catch (err) {
    //         console.error(err); // Log the error for debugging
    //         socket.emit('alert', 'An error occurred while logging out');
    //     }
    // });
    socket.on('heartbeat', async () => {
        if (curPlayer) {
            await User.updateOne({ _id: curPlayer }, { $set: { lastSeen: new Date() } });
        }
    });
    socket.on("singleplayer", async () => {
        // curPlayer = id;
        // if (gameRoom.players[curPlayer] == null) {
        //     gameRoom.players[curPlayer] = new Player(curPlayer, userName);
        //     gameRoom.players[curPlayer].socketId = socket.id;
        // }
        // gameRoom.players[curPlayer].mode = "singleplayer";
        // opponent = generateRandomString(10);
        // gameRoom.players[opponent] = new Computer(opponent);
        // gameRoom.players[curPlayer].opponent = opponent;
        const user = await User.findById(userId)
        let canCreateGame = true;
        if (user.currGameRoom != null && gameRooms.has(user.currGameRoom)) {
            const gameRoom = gameRooms[roomCode]
            if(gameRoom.players.has(userId)){
                if (gameRoom.gameRoom.players[userId].connected == true) {
                canCreateRoom = false;
                }
                else{
                    // do handleGameEnd
                    gameRooms.delele(user.currGameRoom);
                    user.currGameRoom = null;
                    
                }
            }
        }
        
        if(canCreateGame) {
            const { roomCode, gameId } = createGameSession(true, userId, socket.id)
            user.currGameRoom = roomCode;
            socket.data.roomCode = roomCode
            gameRoom = gameRooms[roomCode];
            socket.emit('singleplayer')
            await user.save();
        }
        else{
            socket.emit("alert", "You are already in a game on another tab")
        }
    })
    socket.on("multiplayer", (id) => {
        curPlayer = id;
        if (connectedMPClients >= maxConnections) {
            socket.emit("alert", "sorry, the game room is currently full. Please try again later.")
        } else {
            if (gameRoom.players[curPlayer] == null) {
                gameRoom.players[curPlayer] = new Player(curPlayer, userName);
                gameRoom.players[curPlayer].socketId = socket.id;
            }
            connectedMPClients++;
            gameRoom.players[curPlayer].mode = "multiplayer";
            if (connectedMPClients == 2) {
                opponent = checkForMPOpponent(curPlayer);
                gameRoom.players[curPlayer].opponent = opponent
                io.to(gameRoom.players[opponent].socketId).emit("findOpponent")
                io.to(gameRoom.players[opponent].socketId).emit("info", `${userName} has joined`)
            }
            io.emit('updateMultiplayerCount', connectedMPClients);

            socket.emit("multiplayer")
        }
        console.log("connectedMPClients", connectedMPClients)
    })
    socket.on("random", () => { if (gameRoom.start == false) { randomBoatPlacement(socket.data.roomCode, curPlayer); gameRoom.players[curPlayer].numPlaceShip = 5; socket.emit("randomresult", gameRoom.players[curPlayer].shipLoc); } })
    socket.on("flip", () => {
        gameRoom.players[curPlayer].isFlipped = !gameRoom.players[curPlayer].isFlipped;
        socket.emit("flip", gameRoom.players[curPlayer].isFlipped)
    })
    socket.on("selectShip", (shipName) => {
        if (gameRoom.players[curPlayer].shipLoc[shipName].length == 0) {
            if (gameRoom.players[curPlayer].activeShip == shipName) {
                gameRoom.players[curPlayer].activeShip = null;
            }
            else {
                gameRoom.players[curPlayer].activeShip = shipName;
            }
            socket.emit("selectShip", gameRoom.players[curPlayer].activeShip)
        }
        else {
            socket.emit("alert", "This ship is already placed, your game is potentially modified illegally, consider refreshing the page");
        }
    })
    socket.on("shipPlacement", (location) => {
        if (gameRoom.players[curPlayer].activeShip == null || gameRoom.players[curPlayer].shipLoc[gameRoom.players[curPlayer].activeShip].length != 0) {
            socket.emit("alert", "This ship is already placed on the board or the ship has not been selected, and your game is potentially modified illegally, consider refreshing the page")
        }
        else {
            const row = Math.floor(location / 10);
            const col = location % 10;
            const shipSize = ships[gameRoom.players[curPlayer].activeShip];
            const isValidLocation = (loc) => loc >= 0 && loc < 100;
            const isLocationOccupied = (loc) => gameRoom.players[curPlayer].board[loc] == 1;
            let result = []
            if (gameRoom.players[curPlayer].isFlipped) {
                if (row + shipSize <= 10) {
                    for (let i = 0; i < shipSize; i++) {
                        const loc = row * 10 + col + i * 10;
                        if (!isValidLocation(loc) || isLocationOccupied(loc)) {
                            result = null;
                            break;
                        }
                        result.push(loc)
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
                        result.push(loc)
                    }
                }
            }
            if (result != null && result.length != 0) {
                result.forEach((element) => {
                    gameRoom.players[curPlayer].board[element] = 1
                })
                gameRoom.players[curPlayer].shipLoc[gameRoom.players[curPlayer].activeShip] = result;
                gameRoom.players[curPlayer].numPlaceShip++;
                console.log(gameRoom.players[curPlayer].shipLoc)
                socket.emit("shipPlacement", result, gameRoom.players[curPlayer].activeShip);
                gameRoom.players[curPlayer].activeShip = null;
            }
            else {
                socket.emit("alert", "Cannot place on this cell for this " + gameRoom.players[curPlayer].activeShip + " ship")
            }
        }
    })
    socket.on("shipReplacement", (shipName, index) => {
        if (gameRoom.players[curPlayer].shipLoc[shipName].length == 0) {
            socket.emit("alert", "There is an issue with ship replacement, your game is potentially modified illegally, consider refreshing the page")
            socket.emit("selectShip", null);
        }
        else {
            gameRoom.players[curPlayer].shipLoc[shipName].forEach((element) => {
                gameRoom.players[curPlayer].board[element] = 0;
            })
            gameRoom.players[curPlayer].shipLoc[shipName].forEach((loc) => { gameRoom.players[curPlayer].board[loc] = 0 })
            gameRoom.players[curPlayer].activeShip = shipName;
            socket.emit("selectShip", gameRoom.players[curPlayer].activeShip)
            socket.emit("shipReplacement", gameRoom.players[curPlayer].shipLoc[shipName], shipName, index);
            gameRoom.players[curPlayer].shipLoc[shipName] = [];
            gameRoom.players[curPlayer].numPlaceShip--;
            gameRoom.players[curPlayer].displayGrid()
        }
    })
    socket.on("start", () => {
        console.log("opponent in start:", opponent ? gameRoom.players[opponent] : null)
        if (gameRoom.players[curPlayer].mode == "singleplayer" && gameRoom.players[curPlayer].start == false) {
            gameRoom.players[curPlayer].numPlaceShip == 5 ?
                (randomBoatPlacement(opponent), gameRoom.players[opponent].displayGrid(),
                    gameRoom.players[curPlayer].start = true, socket.emit("start"), socket.emit("turn"),
                    gameRoom.players[curPlayer].messages.push({ 'player': gameRoom.players[curPlayer].userName + JSON.stringify(gameRoom.players[curPlayer].shipLoc) }),
                    socket.emit("message", gameRoom.players[curPlayer].messages), gameRoom.players[curPlayer].gameStartTime = new Date()) :
                socket.emit("not enough ship", "Please place all your ship before starting")
        }
        else if (gameRoom.players[curPlayer].mode == "multiplayer" && gameRoom.players[curPlayer].start == false) {
            // console.log("curPlayer:", curPlayer)
            // opponent = checkForMPOpponent(curPlayer);
            if (gameRoom.players[curPlayer].numPlaceShip != 5) {
                socket.emit("not enough ship", "Please place all your ship before starting")
            }
            else if (opponent == null) {
                socket.emit("info", "Waiting for a player to join");
            }
            else if (opponent != null && gameRoom.players[opponent].numPlaceShip != 5) {
                console.log("opponent should be null right? ", opponent)
                socket.emit("info", "Your opponent is not ready yet, please wait");
            }
            else if (opponent != null && gameRoom.players[opponent].numPlaceShip == 5) {
                // console.log("players array", players)
                gameRoom.players[curPlayer].start = true;
                gameRoom.players[opponent].start = true;
                gameRoom.players[curPlayer].gameStartTime = new Date();
                gameRoom.players[opponent].gameStartTime = gameRoom.players[curPlayer].gameStartTime
                socket.emit("start");
                gameRoom.players[curPlayer].messages.push({ 'player': gameRoom.players[curPlayer].userName + JSON.stringify(gameRoom.players[curPlayer].shipLoc) });
                socket.emit("message", gameRoom.players[curPlayer].messages);
                io.to(gameRoom.players[opponent].socketId).emit("ostart");
                io.to(gameRoom.players[opponent].socketId).emit("info", "Game has started, it's your opponent's turn")
                socket.emit("turn");
            }

        }
        // gameRoom.players[curPlayer].displayGrid()
        //gameStartTime = new Date();
    })
    socket.on("ostart", () => {
        gameRoom.players[curPlayer].messages.push({ 'player': gameRoom.players[curPlayer].userName + JSON.stringify(gameRoom.players[curPlayer].shipLoc) });
        socket.emit("message", gameRoom.players[curPlayer].messages)
    })
    socket.on("findOpponent", () => {
        opponent = checkForMPOpponent(curPlayer);
        gameRoom.players[curPlayer].opponent = opponent;
    })
    socket.on("removeOpponent", () => {
        console.log("set opponent to null", opponent)
        opponent = null;
        gameRoom.players[curPlayer].opponent = null;
    })
    socket.on("attack", (pos) => {
        switch (gameRoom.players[opponent].board[pos]) {
            case 1: {
                handleHitComm(curPlayer, opponent, pos);
                handleDestroyComm(curPlayer, opponent, pos);
                break;
            }
            case 2:
            case 3:
                socket.emit('alert', "This location is not available to attack")
                break;
            case 0: {
                handleMissComm(curPlayer, opponent, pos)
                if (gameRoom.players[curPlayer].mode == "singleplayer") {
                    socket.emit("info", "The AI is thinking ...")
                    setTimeout(() => { computerMove(curPlayer, socket, opponent) }, 500)
                }
                break;
            }
        }
    })
    socket.on('command', (commandString) => {
        console.log("type of commandString", typeof (commandString));
        console.log("commandString", commandString);
        try {

            const command = JSON.parse(commandString);
            if (isValidShipPlacement(command)) {
                console.log('Valid command:', command);
                gameRoom.players[curPlayer].shipLoc = command;
                gameRoom.players[curPlayer].board = Array(100).fill(0);
                for (const ship in command) {
                    if (command.hasOwnProperty(ship)) {
                        command[ship].forEach((position) => {
                            gameRoom.players[curPlayer].board[position] = 1;
                        });
                    }
                }
                gameRoom.players[curPlayer].numPlaceShip = 5;
                socket.emit("randomresult", gameRoom.players[curPlayer].shipLoc);
            } else {
                console.log('Invalid command format');
                socket.emit('alert', 'Invalid command format');
            }
        } catch (e) {
            console.log('Invalid JSON format');
            socket.emit('error', 'Invalid JSON format');
        }
    })
    socket.on('message', (message) => {
        gameRoom.players[curPlayer].messages.push({ 'player': gameRoom.players[curPlayer].userName + message }); // Save the new message to the session messages
        socket.emit("message", gameRoom.players[curPlayer].messages)
        if (gameRoom.players[curPlayer].mode == "multiplayer" && opponent != null && gameRoom.players[opponent] && gameRoom.players[opponent].mode == 'multiplayer') {
            gameRoom.players[opponent].messages.push({ 'opponent': gameRoom.players[opponent].userName + message });
            io.to(gameRoom.players[opponent].socketId).emit("message", gameRoom.players[opponent].messages)
        }
    });

    socket.on("userId", (userId) => {
        if (curPlayer == null) {
            curPlayer = userId;
        }
    })
    socket.on('disconnect', async (reason, details) => {  // now it is using oquit of the opponent on the server side to subtract connected clients
        console.log("Disconnected in server side because", reason);
        console.log('Server Disconnect details', details)
        if (curPlayer != null && gameRoom.players[curPlayer] != null) {
            if (gameRoom.players[curPlayer].mode != null
                && gameRoom.players[curPlayer].mode == "multiplayer"
                && opponent != null
                && gameRoom.players[opponent] != null) {
                if (gameRoom.players[opponent].start && gameRoom.players[curPlayer].start) {
                    const message = "Your opponent disconnected, you can wait for your opponent to come back within 2 minutes or you may quit now and you win!";
                    await handleGameEndDB(opponent, curPlayer, 'Quit');
                    io.to(gameRoom.players[opponent].socketId).emit
                        ("oquit", message, await findLast10GamesForUser(opponent), await calculateWinRate(opponent));
                    connectedMPClients -= 2;
                }
                else if (gameRoom.players[opponent].start == false && gameRoom.players[curPlayer].start == false) { // game start is only false if it is over or haven't started
                    io.to(gameRoom.players[opponent].socketId).emit("info", "Your opponent left");

                    if (gameRoom.players[curPlayer].numDestroyShip == 5 || gameRoom.players[opponent].numDestroyShip == 5) {
                        connectedMPClients -= 2;
                        io.to(gameRoom.players[opponent].socketId).emit("oquit", "Your opponent left");
                    }
                    else {
                        connectedMPClients--;
                        io.to(gameRoom.players[opponent].socketId).emit("removeOpponent");
                    }
                }
                io.emit('updateMultiplayerCount', connectedMPClients)
            }
            else if (gameRoom.players[curPlayer].mode != null &&  // handle if curplayer is at a singleplayer mode, then just handlegameEnd.
                gameRoom.players[curPlayer].mode == "singleplayer" &&
                gameRoom.players[curPlayer].start
            ) {
                console.log("handle Game End DB is run in disconnect single player start")
                await handleGameEndDB(opponent, curPlayer, 'Quit');
            }
            else if (gameRoom.players[curPlayer].mode == "multiplayer" && opponent == null && gameRoom.players[curPlayer].messages.length == 0) {
                connectedMPClients--;
                io.emit('updateMultiplayerCount', connectedMPClients)
            }

            delete gameRoom.players[curPlayer];
        }
        if (gameRoom.players[opponent] && gameRoom.players[opponent] instanceof Computer) {
            delete gameRoom.players[opponent];
        }
        if (curPlayer != null) {
            try {
                // Find the user in the db and set isLoggedIn to false
                const user = await User.findOne({ _id: curPlayer });

                if (user) {
                    console.log(curPlayer, "log off in Database at server disconnect")
                    user.isLoggedIn = false;
                    await user.save();
                } else {
                    console.log(`User ${curPlayer} not found in database.`);
                }
            } catch (err) {
                console.error(`Error logging out user ${curPlayer}:`, err);
            }
        }
        const sockets = userSockets.get(userId);
        if (sockets) {
            sockets.delete(socket.id);
            if (sockets.size === 0) {
                userSockets.delete(userId); // Optional: cleanup if no sockets remain
                console.log(`User ${userId} has no more active sockets.`);
                io.emit("userCountUpdate", userSockets.size)
            }
            console.log("userSockets after deleting in disconnect event", userSockets)
        }

    })

    socket.on("home", async () => {
        try {
            // Check if the game has ended for the current player
            if (gameRoom.players[curPlayer].start && (gameRoom.players[opponent].start || gameRoom.players[opponent] instanceof Computer)) {
                await handleGameEndDB(opponent, curPlayer, "Quit");
            }

            // Handle multiplayer mode
            if (gameRoom.players[curPlayer].mode === "multiplayer") {
                if (gameRoom.players[opponent] && gameRoom.players[opponent].start && gameRoom.players[curPlayer].start) { // both player started game and game have not finished
                    io.to(gameRoom.players[opponent].socketId).emit("oquit",  // tell the opponent this current player has quit/ clicked home
                        "Your opponent has quit, you have won!",
                        await findLast10GamesForUser(opponent),
                        await calculateWinRate(opponent));
                    connectedMPClients -= 2;
                } else if (gameRoom.players[opponent] && !gameRoom.players[opponent].start && !gameRoom.players[curPlayer].start) { // this means that if both player finish their game or they haven't started playing yet
                    io.to(gameRoom.players[opponent].socketId).emit("info", "Your opponent left");

                    if (gameRoom.players[curPlayer].numDestroyShip == 5 || gameRoom.players[opponent].numDestroyShip == 5) {
                        connectedMPClients -= 2;
                        io.to(gameRoom.players[opponent].socketId).emit("oquit");
                    }
                    else {
                        connectedMPClients--;
                        io.to(gameRoom.players[opponent].socketId).emit("removeOpponent");
                    }
                }

                else if (opponent == null && gameRoom.players[curPlayer].messages.length == 0) {
                    connectedMPClients--;
                }
                io.emit('updateMultiplayerCount', connectedMPClients)
            }
            // Handle single player mode, deleting computer player in players array
            else if (gameRoom.players[opponent] && gameRoom.players[opponent] instanceof Computer) {
                delete gameRoom.players[opponent];
            }



            opponent = null;
            gameRoom.players[curPlayer].opponent = null;
            console.log("opponent is set to null in home in server")
            let games, allGameStats;
            if (gameRoom.players[curPlayer].start) {
                games = await findLast10GamesForUser(curPlayer);
                allGameStats = await calculateWinRate(curPlayer);
            }
            socket.emit("home", games, allGameStats);
            gameRoom.players[curPlayer].reset();
            gameRoom.players[curPlayer].mode = ""
        } catch (err) {
            console.error(`error handling game end DB: ${err}`);
        }
    });

    socket.on("oquit", () => {
        let tempMessage = gameRoom.players[curPlayer].messages
        gameRoom.players[curPlayer].reset();
        gameRoom.players[curPlayer].messages = tempMessage
        gameRoom.players[curPlayer].start = false;
        //connectedMPClients--;
        console.log("opponent has set to null in oquit")
        opponent = null;
    })
});

setInterval(async () => {
    const timeout = 600 * 1000; // 60 seconds timeout for example
    const inactiveSince = new Date(Date.now() - timeout);

    try {
        await User.updateMany(
            { lastSeen: { $lt: inactiveSince }, isLoggedIn: true },
            { $set: { isLoggedIn: false } }
        );
    } catch (err) {
        console.error('Error logging out inactive users:', err);
    }
}, 500000); // Check every 30 seconds

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

const path = require('path');

// Serve static files from React
app.use(express.static(path.join(__dirname, 'build')));

// Serve React app for any route not handled by API
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

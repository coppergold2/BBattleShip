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
        io.emit("userCountUpdate", 0)
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
    const chars = 'ABCDEFGHJ KLMNPQRSTUVWXYZ23456789'; // no I/O/1/0
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function createGameSession({ isSinglePlayer = false, playerId, socketId, userName }) {
    let roomCode;
    do {
        roomCode = generateRoomCode();
    } while (gameRooms[roomCode]); // avoid collision

    const gameId = uuidv4();

    gameRooms[roomCode] = {
        gameId,
        roomCode,
        players: {
            [playerId]: new Player(playerId, userName, socketId),
        },
        isSinglePlayer,
        status: isSinglePlayer ? 'in_progress' : 'waiting',
        start: false,
        turn: playerId,
        messages: [

        ],
        createdAt: Date.now(),
    };

    return { roomCode, gameId };
}

class Player {
    constructor(id, userName, socketId) {
        this.id = id;
        this.userName = userName;
        this.socketId = socketId
        this.board = Array(100).fill(0); // Initialize empty board (0 - nothing, 1 - ship, 2 - hit, 3 - miss, 4 - destroy)
        this.isFlipped = false;
        this.numPlaceShip = 0;
        this.shipLoc = { 'destroyer': [], 'submarine': [], 'cruiser': [], 'battleship': [], 'carrier': [] }
        this.numDestroyShip = 0;
        this.numHits = 0;
        this.numMisses = 0;
        //this.start = false;
        //this.messages = [];
        this.allHitLocations = [];
        this.activeShip = null;
        //this.mode = "";
        this.opponent = null;
        //this.gameStartTime = null;
        this.connected = true;

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
    return { [userName]: `hit at row ${row} column ${col}.` }
}

const destroyMessage = (shipName, userName) => {
    return { [userName]: `sunk the ${shipName} ship.` }
}

const missMessage = (col, row, userName) => {
    return { [userName]: `missed at row ${row} column ${col}.` }
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

function getRandomIndexWithOneValue(computer, roomCode) {
    const gameRoom = gameRooms[roomCode]
    if (gameRoom == null) {
        return;
    }
    let nextHitLocations = checkMostValueableHit(gameRoom.players[computer].maxPossHitLocations, gameRoom.players[computer].maxPossHitLocations, gameRoom.players[computer].opponentShipRemain['maxSizeShip'], gameRoom.players[computer].numMisses, gameRoom.players[computer].opponentShipRemain['minSizeShip'])
    nextHitLocations = checkMinAllDirection(nextHitLocations, gameRoom.players[computer].maxPossHitLocations, gameRoom.players[computer].opponentShipRemain['maxSizeShip'])
    const randomIndex = Math.floor(Math.random() * nextHitLocations.length);

    return nextHitLocations[randomIndex];
}

const handleAIMiss = (computer, socket, roomCode) => {
    const gameRoom = gameRooms[roomCode]
    if (gameRoom == null) {
        return;
    }
    if (gameRoom.players[computer].possHitDirections.some(element => element !== -1)) {  // if the next hit positions has already been calculated aka if this is followed by a previous hit
        gameRoom.players[computer].possHitDirections[gameRoom.players[computer].curHitDirection] = -1;
        if (AIFirstTimeHitNewShip == false) {
            switch (gameRoom.players[computer].curHitDirection) {
                case 0:
                    if (gameRoom.players[computer].possHitDirections[2] != -1) {
                        gameRoom.players[computer].curHitDirection = 2;
                    }
                    break;
                case 1:
                    if (gameRoom.players[computer].possHitDirections[3] != -1) {
                        gameRoom.players[computer].curHitDirection = 3;
                    }
                    break;
                case 2:
                    if (gameRoom.players[computer].possHitDirections[0] != -1) {
                        gameRoom.players[computer].curHitDirection = 0;
                    }
                    break;
                case 3:
                    if (gameRoom.players[computer].possHitDirections[1] != -1) {
                        gameRoom.players[computer].curHitDirection = 1;
                    }
                    break;
            }
        }
        if (gameRoom.players[computer].possHitDirections[gameRoom.players[computer].curHitDirection] == -1 || AIFirstTimeHitNewShip == true) {
            gameRoom.players[computer].curHitDirection = pickDirection(gameRoom.players[computer].possHitDirections)
        }
    }
    else {
        checkPossHitLocs(computer, roomCode)
        socket.emit("updatePossHitLocation", [...gameRoom.players[computer].maxPossHitLocations]);
    }
}

const handleAIHit = (computer, loc, roomCode) => {
    const gameRoom = gameRooms[roomCode]
    if (gameRoom == null) {
        return;
    }
    if (!gameRoom.players[computer].possHitDirections.some(element => element !== -1)) {   // if it contains all -1
        gameRoom.players[computer].possHitDirections = checkAdjacentCells(loc, gameRoom.players[computer].possHitLocations, gameRoom.players[computer].opponentShipRemain.minSizeShip, true, gameRoom.players[computer].hitLocs);
        gameRoom.players[computer].curHitDirection = pickDirection(gameRoom.players[computer].possHitDirections);
        AIFirstTimeHitNewShip = true;
    }
    else if (gameRoom.players[computer].curHitDirection != null) {   // if some of the possHitDirections is not -1 and curHitDirection is not null ?
        AIFirstTimeHitNewShip = false
        const cols = 10;
        switch (gameRoom.players[computer].curHitDirection) {
            case 0:
                if (loc - cols >= 0 && gameRoom.players[computer].possHitLocations.has(loc - cols)) {
                    gameRoom.players[computer].possHitDirections[0] = loc - cols
                }
                else {
                    gameRoom.players[computer].possHitDirections[0] = -1;
                    if (gameRoom.players[computer].possHitDirections[2] != -1) {
                        gameRoom.players[computer].curHitDirection = 2;
                    }
                }
                break;
            case 1:
                if (loc % cols !== 0 && gameRoom.players[computer].possHitLocations.has(loc - 1)) {
                    gameRoom.players[computer].possHitDirections[1] = loc - 1
                }
                else {
                    gameRoom.players[computer].possHitDirections[1] = -1;
                    if (gameRoom.players[computer].possHitDirections[3] != -1) {
                        gameRoom.players[computer].curHitDirection = 3
                    }
                }
                break;
            case 2:
                if (loc + cols < 100 && gameRoom.players[computer].possHitLocations.has(loc + cols)) {
                    gameRoom.players[computer].possHitDirections[2] = loc + cols
                }
                else {
                    gameRoom.players[computer].possHitDirections[2] = -1;
                    if (gameRoom.players[computer].possHitDirections[0] != -1) {
                        gameRoom.players[computer].curHitDirection = 0;
                    }
                }
                break;
            case 3:
                if ((loc + 1) % cols !== 0 && gameRoom.players[computer].possHitLocations.has(loc + 1)) {
                    gameRoom.players[computer].possHitDirections[3] = loc + 1
                }
                else {
                    gameRoom.players[computer].possHitDirections[3] = -1;
                    if (gameRoom.players[computer].possHitDirections[1] != -1) {
                        gameRoom.players[computer].curHitDirection = 1;
                    }
                }
                break;
        }
        if (gameRoom.players[computer].possHitDirections[gameRoom.players[computer].curHitDirection] == -1) {
            gameRoom.players[computer].curHitDirection = pickDirection(gameRoom.players[computer].possHitDirections)
        }
    }
}

const handleAIDestroy = (computer, destroyShip, roomCode) => {
    const gameRoom = gameRooms[roomCode];
    if (gameRoom == null) {
        return;
    }
    removeDestroyShipLoc(computer, destroyShip[1], roomCode);
    gameRoom.players[computer].curHitDirection = null;
    gameRoom.players[computer].possHitDirections = [-1, -1, -1, -1]
    // need to update the minSizeShip
    gameRoom.players[computer].opponentShipRemain[destroyShip[0]] = 0;
    let minSize = 5;
    let maxSize = 2;
    for (const shipName in ships) {
        if (gameRoom.players[computer].opponentShipRemain[shipName] == 1) {
            if (ships[shipName] < minSize) {
                minSize = ships[shipName]
            }
            if (ships[shipName] > maxSize) {
                maxSize = ships[shipName];
            }
        }
    }
    gameRoom.players[computer].opponentShipRemain['minSizeShip'] = minSize;
    gameRoom.players[computer].opponentShipRemain['maxSizeShip'] = maxSize;
    console.log('minSizeShip:', gameRoom.players[computer].opponentShipRemain['minSizeShip'])
    console.log('maxSizeShip:', gameRoom.players[computer].opponentShipRemain['maxSizeShip'])

    if (gameRoom.players[computer].hitLocs.length != 0) {
        gameRoom.players[computer].possHitDirections = checkAdjacentCells(gameRoom.players[computer].hitLocs[0], gameRoom.players[computer].possHitLocations, gameRoom.players[computer].opponentShipRemain.minSizeShip, true, gameRoom.players[computer].hitLocs);
        gameRoom.players[computer].curHitDirection = pickDirection(gameRoom.players[computer].possHitDirections);
        AIFirstTimeHitNewShip = true;
    }
    else {
        gameRoom.players[computer].maxPossHitLocations = "reset"
        checkPossHitLocs(computer, roomCode)
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
const checkPossHitLocs = (computer, roomCode) => {
    const gameRoom = gameRooms[roomCode]
    if (gameRoom == null) {
        return;
    }
    console.log("got to here before bugging")
    for (let loc of gameRoom.players[computer].possHitLocations) {
        const result = checkAdjacentCells(loc, gameRoom.players[computer].possHitLocations, gameRoom.players[computer].opponentShipRemain['minSizeShip'], false, gameRoom.players[computer].hitLocs)
        if (result == false) {
            gameRoom.players[computer].possHitLocations.delete(loc);
        }
    }
    if (gameRoom.players[computer].maxPossHitLocations == "reset") {
        gameRoom.players[computer].maxPossHitLocations = new Set(gameRoom.players[computer].possHitLocations);
    }
    else {
        for (let loc of gameRoom.players[computer].maxPossHitLocations) {
            const result = checkAdjacentCells(loc, gameRoom.players[computer].maxPossHitLocations, gameRoom.players[computer].opponentShipRemain['maxSizeShip'], false, gameRoom.players[computer].hitLocs)
            if (result == false) {
                gameRoom.players[computer].maxPossHitLocations.delete(loc);
            }
        }
    }
}

const computerMove = async (curPlayer, socket, opponent, roomCode) => {
    const gameRoom = gameRooms[roomCode]
    if (gameRoom == null) {
        return;
    }
    if (gameRoom.players[curPlayer] != null && gameRoom.players[opponent] != null) {
        let pos;
        if (gameRoom.players[opponent].hitLocs.length == 0) {

            pos = getRandomIndexWithOneValue(opponent, roomCode)
        }
        else if (gameRoom.players[opponent].curHitDirection != null) { // what if hitLocs is not null and curHitDirection is null.   
            pos = gameRoom.players[opponent].possHitDirections[gameRoom.players[opponent].curHitDirection]
        }
        gameRoom.players[opponent].possHitLocations.delete(pos);
        gameRoom.players[opponent].maxPossHitLocations.delete(pos);

        console.log("computer move", pos)
        if (gameRoom.players[curPlayer].board[pos] === 0) {  // miss
            handleMissComm(opponent, curPlayer, pos, roomCode);
            handleAIMiss(opponent, socket, roomCode)
            socket.emit("turn")
        }
        else if (gameRoom.players[curPlayer].board[pos] === 1) { // hit
            handleHitComm(opponent, curPlayer, pos, roomCode);
            handleAIHit(opponent, pos, roomCode)
            await handleDestroyComm(opponent, curPlayer, pos, roomCode);
            if (gameRoom.players[opponent].numDestroyShip < 5) {
                socket.emit("info", "The AI is thinking ...")
                setTimeout(async () => {
                    await computerMove(curPlayer, socket, opponent, roomCode);
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
    if (gameRoom == null || gameRoom.players[user] == null) {
        return;
    }
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

const checkShip = (opponent, pos, roomCode) => {
    const gameRoom = gameRooms[roomCode]
    if (gameRoom == null || gameRoom.players[opponent] == null) {
        return;
    }
    let shipPosition = [];
    let shipName = "";
    for (let ship in ships) {
        if (gameRoom.players[opponent].shipLoc[ship].includes(pos)) { shipPosition = gameRoom.players[opponent].shipLoc[ship]; shipName = ship; break; }
    }
    let shipDestoryed = true;
    shipPosition.forEach((index) => {
        if (gameRoom.players[opponent].board[index] != 2) {
            shipDestoryed = false;
        }
    })
    if (shipDestoryed == true) {
        shipPosition.forEach((index) => {
            gameRoom.players[opponent].board[index] = 4
        })
        return [shipName, shipPosition];
    }
    else {
        return "normal";
    }
}

// const checkForMPOpponent = ((curPlayer) => { // there can only be two online player
//     for (let id in players) {
//         if (players[id].mode == "multiplayer" && id != curPlayer) {
//             console.log("id:", id);
//             console.log("curPlayer:", curPlayer)
//             return id;
//         }
//     }
//     return null;
// })

// Search for a room waiting for a second player
function findOpenRoom() {
    for (const roomCode in gameRooms) {
        const game = gameRooms[roomCode];
        if (!game.isSinglePlayer && Object.keys(game.players).length === 1 && game.status === 'waiting') {
            return { roomCode, gameId: game.gameId };
        }
    }
    return null;
}

const removeDestroyShipLoc = (computer, destroyShip, roomCode) => {
    const gameRoom = gameRooms[roomCode];
    if (gameRoom == null) {
        return;
    }
    for (let i = gameRoom.players[computer].hitLocs.length - 1; i >= 0; i--) {
        if (destroyShip.includes(gameRoom.players[computer].hitLocs[i])) {
            gameRoom.players[computer].hitLocs.splice(i, 1);
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

const handleMissComm = ((misser, receiver, pos, roomCode) => {
    const gameRoom = gameRooms[roomCode];
    if (gameRoom == null) {
        return;
    }
    const { row, col } = getRowAndColumn(pos);
    gameRoom.players[misser].numMisses++;
    gameRoom.players[receiver].board[pos] = 3;
    gameRoom.messages.push(missMessage(row, col, gameRoom.players[misser].userName))
    io.to(gameRoom.roomCode).emit("message", gameRoom.messages[gameRoom.messages.length - 1])
    if (gameRoom.players[misser] instanceof Computer) {
        io.to(gameRoom.players[receiver].socketId).emit("omiss", pos, gameRoom.players[misser].numMisses)  // gameRoom.players[receiver].socketId
        // io.to.emit("turn")
    }
    else if (gameRoom.players[misser] instanceof Player) {
        io.to(gameRoom.players[misser].socketId).emit('miss', pos, gameRoom.players[misser].numMisses);
        if (gameRoom.players[receiver] instanceof Player) {
            io.to(gameRoom.players[receiver].socketId).emit("omiss", pos, gameRoom.players[misser].numMisses);
            io.to(gameRoom.players[receiver].socketId).emit("turn");
        }
    }
    gameRoom.turn = receiver;
})

const handleHitComm = ((hitter, receiver, pos, roomCode) => {
    const gameRoom = gameRooms[roomCode];
    if (gameRoom == null) {
        return;
    }
    gameRoom.players[receiver].board[pos] = 2;
    gameRoom.players[hitter].numHits++;
    const { row, col } = getRowAndColumn(pos);
    gameRoom.messages.push(hitMessage(row, col, gameRoom.players[hitter].userName))
    io.to(gameRoom.roomCode).emit("message", gameRoom.messages[gameRoom.messages.length - 1])
    if (gameRoom.players[receiver] instanceof Player) {
        io.to(gameRoom.players[receiver].socketId).emit("ohit", pos, gameRoom.players[hitter].numHits)
    }
    if (gameRoom.players[hitter] instanceof Computer) {
        gameRoom.players[hitter].hitLocs.push(pos)
    }
    if (gameRoom.players[hitter] instanceof Player) {
        gameRoom.players[hitter].allHitLocations.push(pos);
        io.to(gameRoom.players[hitter].socketId).emit('hit', pos, gameRoom.players[hitter].numHits); //gameRoom.players[hitter].socketId
    }
})

const handleDestroyComm = async (hitter, receiver, pos, roomCode) => {
    const gameRoom = gameRooms[roomCode];
    if (gameRoom == null) {
        return;
    }
    const result = checkShip(receiver, pos, roomCode);
    if (result != "normal") {
        gameRoom.players[hitter].numDestroyShip++;
        gameRoom.messages.push(destroyMessage(result[0], gameRoom.players[hitter].userName))
        io.to(gameRoom.roomCode).emit("message", gameRoom.messages[gameRoom.messages.length - 1])
        if (gameRoom.players[hitter] instanceof Player) {
            io.to(gameRoom.players[hitter].socketId).emit("destroy", result);
        }
        if (gameRoom.players[hitter].numDestroyShip == 5) {
            await handleGameEndDB(hitter, receiver, 'Complete', roomCode)
            if (gameRoom.players[hitter] instanceof Player) {
                const games = await findLast10GamesForUser(hitter);
                const allGameStats = await calculateWinRate(hitter)
                io.to(gameRoom.players[hitter].socketId).emit("win", "You win !", games, allGameStats);

                //gameRoom.players[hitter].mode = "";
            }
            if (gameRoom.players[receiver] instanceof Player) {
                const games = await findLast10GamesForUser(receiver)
                const allGameStats = await calculateWinRate(receiver)
                io.to(gameRoom.players[receiver].socketId).emit(
                    "owin",
                    loserGetUnHitShip(gameRoom.players[receiver].allHitLocations, gameRoom.players[hitter].shipLoc),
                    games,
                    allGameStats
                );
                //gameRoom.players[hitter].mode = "";
            }
            // if (gameRoom.players[hitter] instanceof Player && gameRoom.players[receiver] instanceof Player) {
            //     connectedMPClients -= 2; // did this so that other players can play multiplayer since only two at a time
            //     // need to reset hitter and receiver or should I do it when they press home ? 
            // }
            gameRoom.start = false;
        }
        else if (gameRoom.players[hitter] instanceof Computer) {
            handleAIDestroy(hitter, result, roomCode)
        }
    }

}

const checkExistingGame = async (userId) => {
    const user = await User.findById(userId)
    if (user.currGameRoom != null) {
        if (gameRooms[user.currGameRoom]) {
            const gameRoom = gameRooms[user.currGameRoom]
            if (gameRoom.players[userId]) {
                if (gameRoom.players[userId].connected == true) {
                    return false;
                }
                else {
                    const opponent = gameRoom.players[userId].opponent
                    console.log("got to check connected is false")
                    if (gameRoom.start) {  // opponent is guarenteed to be not null
                        if (gameRoom.isSinglePlayer) {
                            await handleGameEndDB(opponent, userId, "Quit", gameRoom.roomCode);
                            delete gameRooms[gameRoom.roomCode];
                        }
                        else if (gameRoom.players[opponent].connected == false) { // guarenteed to be multiplayer
                            if (userId == gameRoom.firstDisconnect) {
                                await handleGameEndDB(opponent, userId, "Quit", gameRoom.roomCode);
                            }
                            else {
                                await handleGameEndDB(userId, opponent, "Quit", gameRoom.roomCode);
                            }
                            delete gameRooms[gameRoom.roomCode];
                        }
                        else if (gameRoom.players[opponent].connected == true) {
                            await handleGameEndDB(opponent, userId, "Quit", gameRoom.roomCode);
                            gameRoom.start = false;
                            gameRoom.messages.push({ "admin": `Player ${gameRoom.players[userId].userName} has quit, player ${gameRoom.players[opponent].userName} has won!` });
                            io.to(gameRoom.players[opponent].socketId).emit("message", gameRoom.messages[gameRoom.messages.length - 1])
                            io.to(gameRoom.players[opponent].socketId).emit("info", `Your opponent ${gameRoom.players[userId].userName} has quit, you have won!`)
                            gameRoom.players[opponent].opponent = null
                            delete gameRoom.players[userId]

                        }
                    }
                    else {
                        if (gameRoom.isSinglePlayer == false && opponent && gameRoom.players[opponent] && gameRoom.players[opponent].connected == true) {
                            const message = `Your opponent ${gameRoom.players[userId].userName} has left`
                            io.to(gameRoom.players[opponent].socketId).emit("info", message)
                            gameRoom.messages.push({ "admin": `Player ${gameRoom.players[userId].userName} has left` });
                            io.to(gameRoom.players[opponent].socketId).emit("message", gameRoom.messages[gameRoom.messages.length - 1])
                            gameRoom.players[opponent].opponent = null
                            delete gameRoom.players[userId]
                        }
                        else {
                            delete gameRooms[gameRoom.roomCode]
                        }
                    }

                }
            }
        }
        user.currGameRoom = null;
        await user.save();
    }

    return true;
}
const handleGameEndDB = async (hitter, receiver, gameEndType, roomCode) => {
    try {
        const gameRoom = gameRooms[roomCode];

        const gameStartTime = gameRoom.gameStartTime
        const gameEndTime = new Date();
        const gameDuration = (gameEndTime - gameStartTime) / 1000;
        // Create player objects for winner (hitter) and loser (receiver)
        const winnerPlayer = {
            user: gameRoom.players[hitter] instanceof Player ? hitter : null,
            isComputer: gameRoom.players[hitter] instanceof Computer,
            numHits: gameRoom.players[hitter].numHits,
            numMisses: gameRoom.players[hitter].numMisses
        };

        const loserPlayer = {
            user: gameRoom.players[receiver] instanceof Player ? receiver : null,
            isComputer: gameRoom.players[receiver] instanceof Computer,
            numHits: gameRoom.players[receiver].numHits,
            numMisses: gameRoom.players[receiver].numMisses
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

        if (gameRoom.players[hitter] instanceof Player) {
            updatePromises.push(
                User.findByIdAndUpdate(
                    hitter,
                    { $push: { games: savedGame._id } },
                    { new: true }
                )
            );
        }

        if (gameRoom.players[receiver] instanceof Player) {
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
        res.json({
            message: 'Login successful',
            token,
            id: user._id,
            userName: user.userName,
            games: games,
            allGameStats: allGameStats,
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
        const curUser = await User.findById(user.userId)
        curUser.lastSeen = new Date();
        curUser.isLoggedIn = true;
        await curUser.save();
        // console.log("curUser", curUser)
        const games = await findLast10GamesForUser(user.userId);
        const allGameStats = await calculateWinRate(user.userId);
        res.json({ id: user.userId, userName: curUser.userName, games: games, allGameStats: allGameStats });
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

io.on('connection', async (socket) => {
    let gameRoom;
    const userId = socket.userId; // from middleware
    const userName = socket.userName;
    if (socket.recovered) {
        // recovery was successful: socket.id, socket.rooms and socket.data were restored
        console.log("🔄 Session recovered");
        console.log("socket room", socket.rooms, "socket data", socket.data)
        if (socket.data.roomCode && gameRooms[socket.data.roomCode]) {
            gameRoom = gameRooms[socket.data.roomCode]
            if (gameRoom.isSinglePlayer || gameRoom.allDisconnectTime != null) {
                gameRoom.allDisconnectTime = null;
                if (gameRoom.isSinglePlayer == false) {
                    gameRoom.firstDisconnect = null;
                }
            }
            const opponent = gameRoom.players[userId].opponent;
            const allMissLocations = [];
            const destroyedShips = {};
            for (let index = 0; index < gameRoom.players[opponent].board.length; index++) {
                if (gameRoom.players[opponent].board[index] == 3) {
                    allMissLocations.push(index);
                }
            }
            for (let ship in ships) {
                const shipPosition = gameRoom.players[opponent].shipLoc[ship]
                if (gameRoom.players[opponent].board[shipPosition[0]] == 4) {
                    destroyedShips[ship] = shipPosition
                }
            }
            const turn = gameRoom.turn == userId ? true : false
            gameRoom.messages.push({ "admin": `Player ${gameRoom.players[userId].userName} reconnected` });
            io.to(gameRoom.players[opponent].socketId).emit("message", gameRoom.messages[gameRoom.messages.length - 1])
            socket.emit("restoreGame", gameRoom.players[userId], gameRoom.isSinglePlayer, gameRoom.messages, gameRoom.players[opponent].numHits, gameRoom.players[opponent].numMisses, allMissLocations, destroyedShips, turn)
            socket.emit("message", { [gameRoom.players[userId].userName]: JSON.stringify(gameRoom.players[userId].shipLoc) })
            if (gameRoom.isSinglePlayer) {
                socket.emit("updatePossHitLocation", [...gameRoom.players[opponent].maxPossHitLocations]);
            }
            gameRoom.players[userId].connected = true;
            console.log("gameRoom.turn in reconnect", gameRoom.turn)
        }
        else{
            socket.emit("reload");
        }
    } else {
        // new or unrecoverable session
        console.log("🆕 New connection");
    }

    if (userSockets.has(userId)) {
        userSockets.get(userId).add(socket.id);
        socket.emit("userCountUpdate", userSockets.size);
    } else {
        userSockets.set(userId, new Set([socket.id]));
        io.emit("userCountUpdate", userSockets.size)
    }

    console.log("userSockets after adding in socket connection event: ", userSockets)

    socket.on('heartbeat', async () => {
        if (userId) {
            await User.updateOne({ _id: userId }, { $set: { lastSeen: new Date() } });
        }
    });
    socket.on("singleplayer", async () => {
        const canCreateGame = await checkExistingGame(userId);
        console.log("canCreateGame in singlePlayer", canCreateGame)
        if (canCreateGame == true) {
            const user = await User.findById(userId)
            const { roomCode, gameId } = createGameSession({
                isSinglePlayer: true,
                playerId: userId,
                socketId: socket.id,
                userName: user.userName
            }); user.currGameRoom = roomCode;
            socket.data.roomCode = roomCode;
            socket.join(roomCode);
            gameRoom = gameRooms[roomCode];
            user.currGameRoom = roomCode
            await user.save();
            socket.emit('singleplayer')

        }
        else {
            socket.emit("alert", "You are already in a game on another tab")
        }
        console.log("gameRooms in singleplayer event", gameRooms)
        console.log("userId", userId)
    })
    socket.on("multiplayer", async () => {
        const canCreateGame = await checkExistingGame(userId);
        console.log("canCreateGame in multiPlayer", canCreateGame)
        if (canCreateGame == true) {
            const user = await User.findById(userId)
            // Join or create
            let { roomCode, gameId } = findOpenRoom() || {};
            if (!roomCode) {
                ({ roomCode, gameId } = createGameSession({ isSinglePlayer: false, playerId: userId, socketId: socket.id, userName: user.userName }));
                gameRoom = gameRooms[roomCode]
            }
            else {
                gameRoom = gameRooms[roomCode]
                gameRoom.players[userId] = new Player(userId, user.userName, socket.id)
                for (let playerId in gameRoom.players) {
                    if (gameRoom.players.hasOwnProperty(playerId)) {
                        if (playerId != userId) {
                            const opponent = playerId
                            gameRoom.players[userId].opponent = opponent
                            gameRoom.players[opponent].opponent = userId
                            io.to(gameRoom.players[opponent].socketId).emit("info", `${user.userName} has joined`)
                        }
                    }
                }
            }
            user.currGameRoom = roomCode;
            await user.save();
            socket.data.roomCode = roomCode;
            socket.join(roomCode);
            socket.emit("multiplayer")
            if (Object.keys(gameRoom.players).length == 2) {
                const opponent = gameRoom.players[userId].opponent
                socket.emit("info", `You have joined a game room with player ${gameRoom.players[opponent].userName}`)
            }
        }
        else {
            socket.emit("alert", "You are already in a game on another tab")
        }
    })
    socket.on("random", () => { if (gameRoom.start == false) { randomBoatPlacement(socket.data.roomCode, userId); gameRoom.players[userId].numPlaceShip = 5; socket.emit("randomresult", gameRoom.players[userId].shipLoc); } })
    socket.on("flip", () => {
        gameRoom.players[userId].isFlipped = !gameRoom.players[userId].isFlipped;
        socket.emit("flip", gameRoom.players[userId].isFlipped)
    })
    socket.on("selectShip", (shipName) => {
        if (gameRoom.players[userId].shipLoc[shipName].length == 0) {
            if (gameRoom.players[userId].activeShip == shipName) {
                gameRoom.players[userId].activeShip = null;
            }
            else {
                gameRoom.players[userId].activeShip = shipName;
            }
            socket.emit("selectShip", gameRoom.players[userId].activeShip)
        }
        else {
            socket.emit("alert", "This ship is already placed, your game is potentially modified illegally, consider refreshing the page");
        }
    })
    socket.on("shipPlacement", (location) => {
        if (gameRoom.players[userId].activeShip == null || gameRoom.players[userId].shipLoc[gameRoom.players[userId].activeShip].length != 0) {
            socket.emit("alert", "This ship is already placed on the board or the ship has not been selected, and your game is potentially modified illegally, consider refreshing the page")
        }
        else {
            const row = Math.floor(location / 10);
            const col = location % 10;
            const shipSize = ships[gameRoom.players[userId].activeShip];
            const isValidLocation = (loc) => loc >= 0 && loc < 100;
            const isLocationOccupied = (loc) => gameRoom.players[userId].board[loc] == 1;
            let result = []
            if (gameRoom.players[userId].isFlipped) {
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
                    gameRoom.players[userId].board[element] = 1
                })
                gameRoom.players[userId].shipLoc[gameRoom.players[userId].activeShip] = result;
                gameRoom.players[userId].numPlaceShip++;
                console.log(gameRoom.players[userId].shipLoc)
                socket.emit("shipPlacement", result, gameRoom.players[userId].activeShip);
                gameRoom.players[userId].activeShip = null;
            }
            else {
                socket.emit("alert", "Cannot place on this cell for this " + gameRoom.players[userId].activeShip + " ship")
            }
        }
    })
    socket.on("shipReplacement", (shipName, index) => {
        if (gameRoom.players[userId].shipLoc[shipName].length == 0) {
            socket.emit("alert", "There is an issue with ship replacement, your game is potentially modified illegally, consider refreshing the page")
            socket.emit("selectShip", null);
        }
        else {
            gameRoom.players[userId].shipLoc[shipName].forEach((element) => {
                gameRoom.players[userId].board[element] = 0;
            })
            gameRoom.players[userId].shipLoc[shipName].forEach((loc) => { gameRoom.players[userId].board[loc] = 0 })
            gameRoom.players[userId].activeShip = shipName;
            socket.emit("selectShip", gameRoom.players[userId].activeShip)
            socket.emit("shipReplacement", gameRoom.players[userId].shipLoc[shipName], shipName, index);
            gameRoom.players[userId].shipLoc[shipName] = [];
            gameRoom.players[userId].numPlaceShip--;
        }
    })
    socket.on("start", () => {
        if (gameRoom.isSinglePlayer == true && gameRoom.start == false) {
            if (gameRoom.players[userId].numPlaceShip == 5) {
                const opponent = generateRandomString(10);
                gameRoom.players[opponent] = new Computer(opponent);
                gameRoom.players[userId].opponent = opponent;
                gameRoom.turn = userId;
                randomBoatPlacement(gameRoom.roomCode, opponent);
                gameRoom.start = true;
                socket.emit("start");
                socket.emit("turn");
                socket.emit("message", {
                    [gameRoom.players[userId].userName]: JSON.stringify(gameRoom.players[userId].shipLoc)
                });
                gameRoom.gameStartTime = new Date();
            } else {
                socket.emit("not enough ship", "Please place all your ship before starting");
            }
        }
        else if (gameRoom.isSinglePlayer == false && gameRoom.start == false && gameRoom.status == 'waiting') {
            const opponent = gameRoom.players[userId].opponent;
            // console.log("userId:", userId)
            // opponent = checkForMPOpponent(userId);
            if (gameRoom.players[userId].numPlaceShip != 5) {
                socket.emit("not enough ship", "Please place all your ship before starting")
            }
            else if (opponent == null) {
                socket.emit("info", "Waiting for a player to join");
            }
            else if (opponent != null && gameRoom.players[opponent].numPlaceShip != 5) {
                socket.emit("info", "Your opponent is not ready yet, please wait");
            }
            else if (opponent != null && gameRoom.players[opponent].numPlaceShip == 5) {
                // console.log("players array", players)
                gameRoom.start = true;
                gameRoom.status = 'in_progress'
                gameRoom.gameStartTime = new Date();
                socket.emit("start");
                socket.emit("message", { [gameRoom.players[userId].userName]: JSON.stringify(gameRoom.players[userId].shipLoc) });
                io.to(gameRoom.players[opponent].socketId).emit("ostart");
                io.to(gameRoom.players[opponent].socketId).emit("info", "Game has started, it's your opponent's turn")
                socket.emit("turn");
                gameRoom.turn = userId;
            }

        }
        // gameRoom.players[userId].displayGrid()
        //gameStartTime = new Date();
    })
    socket.on("ostart", () => {
        //gameRoom.players[userId].messages.push({ [gameRoom.players[userId].userName] :  JSON.stringify(gameRoom.players[userId].shipLoc) });
        socket.emit("message", { [gameRoom.players[userId].userName]: JSON.stringify(gameRoom.players[userId].shipLoc) })
    })
    socket.on("attack", async (pos) => {
        const opponent = gameRoom.players[userId].opponent
        switch (gameRoom.players[opponent].board[pos]) {
            case 1: {
                handleHitComm(userId, opponent, pos, gameRoom.roomCode);
                await handleDestroyComm(userId, opponent, pos, gameRoom.roomCode);
                break;
            }
            case 2:
            case 3:
            case 4:
                socket.emit('alert', "This location is not available to attack")
                break;
            case 0: {
                handleMissComm(userId, opponent, pos, gameRoom.roomCode);
                if (gameRoom.isSinglePlayer) {
                    socket.emit("info", "The AI is thinking ...")
                    setTimeout(async () => { await computerMove(userId, socket, opponent, gameRoom.roomCode) }, 500)
                }
                break;
            }
        }
    })
    socket.on('command', (commandString) => {
        try {

            const command = JSON.parse(commandString);
            if (isValidShipPlacement(command)) {
                gameRoom.players[userId].shipLoc = command;
                gameRoom.players[userId].board = Array(100).fill(0);
                for (const ship in command) {
                    if (command.hasOwnProperty(ship)) {
                        command[ship].forEach((position) => {
                            gameRoom.players[userId].board[position] = 1;
                        });
                    }
                }
                gameRoom.players[userId].numPlaceShip = 5;
                socket.emit("randomresult", gameRoom.players[userId].shipLoc);
            } else {
                socket.emit('alert', 'Invalid command format');
            }
        } catch (e) {
            socket.emit('error', 'Invalid JSON format');
        }
    })
    socket.on('message', (message) => {
        gameRoom.messages.push({ [gameRoom.players[userId].userName]: message }); // Save the new message to the session messages
        io.to(gameRoom.roomCode).emit("message", gameRoom.messages[gameRoom.messages.length - 1])
    });

    socket.on("userId", (userId) => {
        if (userId == null) {
            userId = userId;
        }
    })
    socket.on('disconnect', async (reason, details) => {  // now it is using oquit of the opponent on the server side to subtract connected clients
        console.log("Disconnected in server side because", reason);
        console.log('Server Disconnect details', details)
        const forceDisconnect = (reason == "server namespace disconnect" || reason == "client namespace disconnect" || reason == "server shutting down") ? true : false

        if (userId != null && gameRoom != null && gameRoom.players[userId] != null) {
            const opponent = gameRoom.players[userId].opponent;
            if (gameRoom.isSinglePlayer && forceDisconnect && gameRoom.start == true) {
                await handleGameEndDB(opponent, userId, 'Quit', gameRoom.roomCode);
                const user = await User.findById(userId)
                user.currGameRoom = null;
                await user.save();
                delete gameRooms[gameRoom.roomCode];
            }
            else if (gameRoom.isSinglePlayer && gameRoom.start == false) {  // includes both forceDisconnect false and true
                socket.leave(gameRoom.roomCode)
                socket.data.roomCode = null;
                const user = await User.findById(userId)
                user.currGameRoom = null;
                await user.save();
                delete gameRooms[gameRoom.roomCode];
            }
            else if (gameRoom.isSinglePlayer && forceDisconnect == false && gameRoom.start == true) {
                gameRoom.players[userId].connected = false;
                gameRoom.messages.push({ "admin": `Player ${gameRoom.players[userId].userName} disconnected` });
                gameRoom.allDisconnectTime = Date.now();
            }
            else if (gameRoom.isSinglePlayer == false && forceDisconnect == true && gameRoom.start == true) {
                if (gameRoom.players[opponent].connected == true) {
                    await handleGameEndDB(opponent, userId, 'Quit', gameRoom.roomCode);
                    const message = `Your opponent ${gameRoom.players[userId].userName} has quit, you have won!`
                    io.to(gameRoom.players[opponent].socketId).emit("oquit",  // tell the opponent this current player has quit/ clicked home
                        message,
                        await findLast10GamesForUser(opponent),
                        await calculateWinRate(opponent));
                    gameRoom.messages.push({ "admin": `Player ${gameRoom.players[userId].userName} has quit, player ${gameRoom.players[opponent].userName} has won!` });
                    io.to(gameRoom.players[opponent].socketId).emit("message", gameRoom.messages[gameRoom.messages.length - 1])
                    gameRoom.players[opponent].opponent = null;
                    delete gameRoom.players[userId]
                    gameRoom.start = false;
                }
                else {
                    if (gameRoom.players[userId].numHits >= gameRoom.players[opponent].numHits) {
                        await handleGameEndDB(userId, opponent, 'Quit', gameRoom.roomCode);
                    }
                    else {
                        await handleGameEndDB(opponent, userId, 'Quit', gameRoom.roomCode);
                    }
                    delete gameRooms[gameRoom.roomCode];
                }
                const user = await User.findById(userId)
                user.currGameRoom = null;
                await user.save();
            }
            else if (gameRoom.isSinglePlayer == false && gameRoom.start == false) { // includes both forceDisconnect false and true
                socket.leave(gameRoom.roomCode)
                socket.data.roomCode = null;
                if (opponent && gameRoom.players[opponent] && gameRoom.players[opponent].connected == true) {
                    gameRoom.players[opponent].opponent = null;
                    const message = `Your opponent ${gameRoom.players[userId].userName} has left`
                    io.to(gameRoom.players[opponent].socketId).emit("info", message)
                    gameRoom.messages.push({ "admin": `Player ${gameRoom.players[userId].userName} has left` });
                    io.to(gameRoom.players[opponent].socketId).emit("message", gameRoom.messages[gameRoom.messages.length - 1])
                    delete gameRoom.players[userId]

                }
                else {
                    delete gameRooms[gameRoom.roomCode]
                }
                const user = await User.findById(userId)
                user.currGameRoom = null;
                await user.save();

            }
            else if (gameRoom.isSinglePlayer == false && forceDisconnect == false && gameRoom.start == true) {
                gameRoom.players[userId].connected = false;
                gameRoom.messages.push({ "admin": `Player ${gameRoom.players[userId].userName} disconnected` });
                if (gameRoom.players[opponent].connected == true) {
                    const message = `Your opponent, ${gameRoom.players[userId].userName}, has been disconnected. You can wait up to two minutes for them to return, or you can quit now and claim the win.`;
                    io.to(gameRoom.players[opponent].socketId).emit("info", message)
                    io.to(gameRoom.players[opponent].socketId).emit("message", gameRoom.messages[gameRoom.messages.length - 1])
                }
                else {
                    gameRoom.allDisconnectTime = Date.now()
                    gameRoom.firstDisconnect = opponent;
                }
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
            socket.data.roomCode = null;
            socket.leave(gameRoom.roomCode)
            const opponent = gameRoom.players[userId].opponent
            // Check if the game has ended for the current player
            if (gameRoom.start) {
                await handleGameEndDB(opponent, userId, "Quit", gameRoom.roomCode);
            }
            // Handle multiplayer mode - communicate to the opponent player
            if (gameRoom.isSinglePlayer == false) {
                if (opponent && gameRoom.players[opponent] && gameRoom.players[opponent].connected == true) {
                    if (gameRoom.start) { // both player started game and game have not finished
                        io.to(gameRoom.players[opponent].socketId).emit("oquit",  // tell the opponent this current player has quit/ clicked home
                            `Your opponent ${gameRoom.players[userId].userName} has quit, you have won!`,
                            await findLast10GamesForUser(opponent),
                            await calculateWinRate(opponent));
                    } else if (gameRoom.start == false) { // this means that if both player finish their game or they haven't started playing yet
                        io.to(gameRoom.players[opponent].socketId).emit("info", `Your opponent ${gameRoom.players[opponent].userName} left`);
                        if (gameRoom.status == "in_progress") { // if game has started and is over
                            gameRoom.messages.push({ "admin": `Player ${gameRoom.players[userId].userName} has left` });
                            io.to(gameRoom.players[opponent].socketId).emit("message", gameRoom.messages[gameRoom.messages.length - 1])
                        }
                    }
                    gameRoom.players[opponent].opponent = null
                    delete gameRoom.players[userId]
                }
                else {
                    delete gameRooms[gameRoom.roomCode]
                }
            }
            else {
                delete gameRooms[gameRoom.roomCode]
            }
            let games, allGameStats;
            games = await findLast10GamesForUser(userId);
            allGameStats = await calculateWinRate(userId);
            socket.emit("home", games, allGameStats);
            const user = await User.findById(userId)
            user.currGameRoom = null;
            await user.save();
            gameRoom = null;
        } catch (err) {
            console.error(`error handling game end DB: ${err}`);
        }
    });

    //     socket.on("oquit", () => {
    //         // let tempMessage = gameRoom.players[userId].messages
    //         // gameRoom.players[userId].reset();
    //         // gameRoom.players[userId].messages = tempMessage
    //         gameRoom.start = false;
    //         //connectedMPClients--;
    //     })
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

setInterval(async () => {
    console.log("gameRooms in setInterval", gameRooms);

    for (const gameRoom of Object.values(gameRooms)) {
        if (gameRoom.allDisconnectTime != null && Date.now() - gameRoom.allDisconnectTime > 5 * 60 * 1000) {
            console.log("gameRooms", gameRoom.roomCode, "is deleted due to inactivity");

            if (gameRoom.start === true) {
                let winner;
                let loser;

                if (gameRoom.isSinglePlayer) {
                    for (let playerId in gameRoom.players) {
                        if (gameRoom.players.hasOwnProperty(playerId)) {
                            if (gameRoom.players[playerId] instanceof Computer) {
                                winner = playerId;
                            } else {
                                loser = playerId;
                            }
                        }
                    }
                } else {
                    for (let playerId in gameRoom.players) {
                        if (playerId === gameRoom.firstDisconnect) {
                            loser = playerId;
                        } else {
                            winner = playerId;
                        }
                    }
                }

                await handleGameEndDB(winner, loser, "Quit", gameRoom.roomCode);
            }

            delete gameRooms[gameRoom.roomCode];
        }
    }
}, 2 * 60 * 1000); // Run cleanup every 2 minutes



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

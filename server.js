require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const User = require('./schema');  // Import the User model

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const crypto = require('crypto');
let connectedMPClients = 0;
const maxConnections = 2;
const width = 10;
let AIFirstTimeHitNewShip = false;

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
.then(() => {
    console.log('MongoDB connected');
})
.catch(err => {
    console.error('Error connecting to MongoDB', err);
});

process.on('SIGINT', async () => {
    console.log('Shutting down server...');

    try {
        // Update the isLoggedIn status of all players to false
        await User.updateMany({ isLoggedIn: true }, { $set: { isLoggedIn: false } });
        console.log('All players have been logged out.');
    } catch (err) {
        console.error('Error logging out players:', err);
    }

    // Gracefully close the server
    process.exit();
});
class Player {
    constructor(id) {
        this.id = id;
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
        this.hitLocs = [];
        this.possHitDirections = [-1, -1, -1, -1] // north, west, south, east
        this.curHitDirection = null; // contain the direction of hit 0,1,2,3 representing north, west, south, east
        this.opponentShipRemain = { 'destroyer': 1, 'submarine': 1, 'cruiser': 1, 'battleship': 1, 'carrier': 1, 'minSizeShip': 2 }
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
const hitMessage = (col, row) => {
    return { 'player': "You hit at row " + row + " column " + col + "." }
}
const ohitMessage = (col, row) => {
    return { 'opponent': "Opponent hit at row " + row + " column " + col + "." }
}
const destroyMessage = (shipName) => {
    return { 'player': "You sunk the " + shipName + " ship" + "." }
}
const odestroyMessage = (shipName) => {
    return { 'opponent': "Opponent sunk the " + shipName + " ship" + "." }
}
const missMessage = (col, row) => {
    return { 'player': "You miss at row " + row + " column " + col + "." }
}
const omissMessage = (col, row) => {
    return { 'opponent': "Opponent miss at row " + row + " column " + col + "." }
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
    let nextHitLocations = checkMostValueableHit(players[computer].possHitLocations, players[computer].possHitLocations, players[computer].opponentShipRemain['minSizeShip'], players[computer].numMisses + players[computer].numHits)
    nextHitLocations = checkMinAllDirection(nextHitLocations, players[computer].possHitLocations, players[computer].opponentShipRemain['minSizeShip'])
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
        socket.emit("updatePossHitLocation", [...players[computer].possHitLocations]);
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
    let minSize = 5
    for (const shipName in ships) {
        if (players[computer].opponentShipRemain[shipName] == 1) {
            if (ships[shipName] < minSize) {
                minSize = ships[shipName]
            }
        }
    }
    players[computer].opponentShipRemain['minSizeShip'] = minSize;
    console.log('minSizeShip: ', players[computer].opponentShipRemain['minSizeShip'])

    if (players[computer].hitLocs.length != 0) {
        players[computer].possHitDirections = checkAdjacentCells(players[computer].hitLocs[0], players[computer].possHitLocations, players[computer].opponentShipRemain.minSizeShip, true, players[computer].hitLocs);
        players[computer].curHitDirection = pickDirection(players[computer].possHitDirections);
        AIFirstTimeHitNewShip = true;
    }
    else {
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
    if(horiPoss == minSizeShip || vertPoss == minSizeShip) {
        if (checkHit == false) {
            return true
        }
        else if(checkHit == true) {
            return getNextFourDirection(cellIndex, possHitLocations, hitLocs, horiPoss, vertPoss, minSizeShip)
        }
    }
    else if (checkHit == false) {
        return false;
    }         
}

const getNextFourDirection = (cellIndex, possHitLocations, hitLocs, horiPoss, vertPoss, minSizeShip) => {
    const nextHitLocations = [-1,-1,-1,-1]
    const cols = 10;
    let temp = cellIndex;
    if (horiPoss == minSizeShip) {
        if(temp % cols !== 0 && possHitLocations.has(temp - 1)) {  // check left
            temp = temp - 1;
            nextHitLocations[1] = temp;
        }
        else if(temp % cols !== 0 && hitLocs.includes(temp - 1)) {
            temp = temp - 1;
            while(temp % cols !== 0 && hitLocs.includes(temp - 1)) {
                temp = temp - 1;
            }
            if(possHitLocations.has(temp)) {
                nextHitLocations[1] = temp
            }
        }
        temp = cellIndex;
        if((temp + 1) % cols !== 0 && possHitLocations.has(temp + 1)) { // check right
            temp = temp + 1;
            nextHitLocations[3] = temp;
        } 
        else if((temp + 1) % cols !== 0 && hitLocs.includes(temp + 1)) {
            temp = temp + 1;
            while((temp + 1) % cols !== 0 && hitLocs.includes(temp + 1)) {
                temp = temp + 1;
            }
            if(possHitLocations.has(temp)) {
                nextHitLocations[3] = temp;
            }
        }
        temp = cellIndex;
    }

    if (vertPoss == minSizeShip) {
        if((temp - cols) >=0 && (possHitLocations.has(temp - cols))) { // check above
            temp = temp - cols;
            nextHitLocations[0] = temp
        } 
        else if((temp - cols) >= 0 && hitLocs.includes(temp - cols)) {
            temp = temp - cols;
            while((temp - cols) >=0 && hitLocs.includes(temp - cols)){
                temp = temp - cols;
            }
            if(possHitLocations.has(temp)) {
                nextHitLocations[0] = temp;
            }
        }
        temp = cellIndex;
        if((temp + cols) < 100 && (possHitLocations.has(temp + cols))) { //check below
            temp = temp + cols;
            nextHitLocations[2] = temp;
        }
        else if((temp + cols) < 100 && hitLocs.includes(temp + cols)) {
            temp = temp + cols;
            while((temp + cols) < 100 && hitLocs.includes(temp + cols)) {
                temp = temp + cols;
            }
            if(possHitLocations.has(temp)) {
                nextHitLocations[2] = temp;
            }
        }    
    }
    return nextHitLocations;
}

const checkMinAllDirection = (nextHitLocations, possHitLocations, minSizeShip) => {
    console.log("minSizeShip", minSizeShip)
    const countDirctionLocation = {0:[], 1:[], 2:[], 3:[], 4:[]}
    let temp = 1
    let count = 0
    for(let loc of nextHitLocations)    
    {
        while(temp <= minSizeShip) {   // check west
            if(temp == minSizeShip){
                count ++;
                temp = 1;
                break;
            }
            else{
                if((loc - temp + 1) % 10 !== 0 && possHitLocations.has(loc - temp)) {
                    temp +=1;
                }
                else{
                    temp = 1
                    break;
                }
            }
        }
        while(temp <= minSizeShip) { // check east
            if(temp == minSizeShip){
                count ++;
                temp = 1;
                break;
            }
            else{
                if ((loc + temp) % 10 !== 0 && possHitLocations.has(loc + temp)) {
                    temp += 1;
                }
                else{
                    temp = 1;
                    break;
                }
            }
        }
        while(temp <= minSizeShip) { // check north
            if(temp == minSizeShip){
                count ++;
                temp = 1;
                break;
            }
            else{
                if(((loc - (temp*10)) >= 0 && possHitLocations.has(loc - (temp *10)))) {
                    temp += 1;
                }
                else{
                    temp = 1;
                    break;
                }
            }
        }

        while(temp <= minSizeShip) { // check south
            if(temp == minSizeShip) {
                count ++;
                temp = 1;
                break;
            }
            else{
                if(((loc + (temp*10)) < 100) && possHitLocations.has(loc + (temp * 10))) {
                    temp += 1;
                }
                else{
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

const checkMostValueableHit = (nextHitLocations, possHitLocations, minSizeShip, totalHits) => {
    let mostEliminate = 0;
    let mostELocations = new Set();
    let tempPossHitLocations = new Set(possHitLocations);
    for(let pos of nextHitLocations) {
        tempPossHitLocations.delete(pos);
        for (let loc of tempPossHitLocations) { 
            const result = checkAdjacentCells(loc, tempPossHitLocations, minSizeShip, false, []);
            if (result == false) {
                tempPossHitLocations.delete(loc);
            }
        }
        let diffSize = possHitLocations.size - tempPossHitLocations.size;
        if(diffSize >= mostEliminate) {
            if(diffSize == mostEliminate){
                mostELocations.add(pos)
            }
            else{
                mostEliminate = diffSize;
                mostELocations = new Set([pos])
            }
        }
        tempPossHitLocations = new Set(possHitLocations)
    }
    console.log("mostEliminate", mostEliminate);
    if((minSizeShip == 2 && mostEliminate > 2) || minSizeShip > 2 || totalHits >= 30){
        return [...mostELocations]
    }
    return nextHitLocations;
}

function pickNumber(countDirectionLocation) {

    let probabilities = [
      { number: 4, probability: 70 },
      { number: 3, probability: 20 },
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
    for (let loc of players[computer].possHitLocations) {
        const result = checkAdjacentCells(loc, players[computer].possHitLocations, players[computer].opponentShipRemain['minSizeShip'], false, players[computer].hitLocs)
        if (result == false) {
            players[computer].possHitLocations.delete(loc)
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
}


const randomBoatPlacement = (user) => {
    players[user].board = Array(100).fill(0);
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
        const result = addShipPiece(players[user].board, ships[ship])
        players[user].shipLoc[ship] = result;
        result.forEach((pos) => { players[user].board[pos] = 1 })
    }
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

const checkForMPOpponent = ((curPlayer) => {
    for (let id in players) {
        if (players[id].mode == "multiplayer" && id != curPlayer) {
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
        players[receiver].messages.push(omissMessage(row, col))
        io.to(players[receiver].socketId).emit("message", players[receiver].messages)
        // io.to.emit("turn")
    }
    else if (players[misser] instanceof Player) {
        io.to(players[misser].socketId).emit('miss', pos, players[misser].numMisses);
        players[misser].messages.push(missMessage(row, col))
        io.to(players[misser].socketId).emit("message", players[misser].messages)
        if (players[receiver] instanceof Player) {
            io.to(players[receiver].socketId).emit("omiss", pos, players[misser].numMisses);
            io.to(players[receiver].socketId).emit("turn");
            players[receiver].messages.push(omissMessage(row, col));
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
        players[receiver].messages.push(ohitMessage(row, col))
        io.to(players[receiver].socketId).emit("message", players[receiver].messages)
    }
    if (players[hitter] instanceof Computer) {
        players[hitter].hitLocs.push(pos)
    }
    if (players[hitter] instanceof Player) {
        players[hitter].allHitLocations.push(pos);
        io.to(players[hitter].socketId).emit('hit', pos, players[hitter].numHits); //players[hitter].socketId
        players[hitter].messages.push(hitMessage(row, col))
        io.to(players[hitter].socketId).emit("message", players[hitter].messages)
    }
})

const handleDestroyComm = ((hitter, receiver, pos) => {
    const result = checkShip(receiver, pos);
    if (result != "normal") {
        players[hitter].numDestroyShip++;
        if (players[receiver] instanceof Player) {
            players[receiver].messages.push(odestroyMessage(result[0]))
            io.to(players[receiver].socketId).emit("message", players[receiver].messages);
        }
        if (players[hitter] instanceof Player) {
            io.to(players[hitter].socketId).emit("destroy", result);
            players[hitter].messages.push(destroyMessage(result[0]));
            io.to(players[hitter].socketId).emit("message", players[hitter].messages);
        }
        if (players[hitter].numDestroyShip == 5) {
            if (players[receiver] instanceof Player) {
                User.findOne({_id: receiver}).then(user => {
                    if (user) {
                        user.lossStep.push(players[receiver].numHits + players[receiver].numMisses);
                        user.games.push("loss");
                        if (user.games.length > 10) {
                            user.games = user.games.slice(-10);
                        }
                        return user.save().then(savedUser => {
                            const winRate = savedUser.games;
                            io.to(players[receiver].socketId).emit(
                                "owin",
                                loserGetUnHitShip(players[receiver].allHitLocations, players[hitter].shipLoc),
                                winRate
                                );
                        });
                    } else {
                        console.log('User not found:', receiver);
                    }
                }).catch(err => console.log('Error updating lossStep for user:', err));
            }

            if (players[hitter] instanceof Player) {
                User.findOne({_id: hitter}).then(user => {
                    if (user) {
                        user.winStep.push(players[hitter].numHits + players[hitter].numMisses);
                        user.games.push("win");
                        if (user.games.length > 10) {
                            user.games = user.games.slice(-10);
                        }
                        return user.save().then(savedUser => {
                            const winRate = savedUser.games;
                            io.to(players[hitter].socketId).emit("win", "You win!", winRate);
                        });
                    } else {
                        console.log('User not found:', hitter);
                    }
                }).catch(err => console.log('Error updating winStep for user:', err));
            }
        }
        else if (players[hitter] instanceof Computer) {
            handleAIDestroy(hitter, result)
        }
    }

})

io.on('connection', (socket) => {
    let opponent;
    let curPlayer;
    socket.on("login", async (userId) => {
        try{
            console.log("userId:", userId)
            const user = await User.findOne({_id : userId});
            console.log("user", user)
            if(user) {
                if(user.isLoggedIn == true) {
                    socket.emit('alert', "This user is already logged in");
                }
                else{
                    user.isLoggedIn = true;
                    await user.save(); // Save the updated user to the database
                    curPlayer = user._id.toString()
                    socket.emit('login', userId, user.averageGameOverSteps, user.games);
                }
            } else {
                socket.emit('alert', "invalid ID, please retry or be a new user ")
            }
        }
        catch (err) {
            socket.emit('alert', 'An error occurred while logging in');
        }
    })
    socket.on("new", async () => {
        try {
            const newUser = new User();
            newUser.isLoggedIn = true;
            // Save the new user to the database
            await newUser.save();
            console.log('User added to the database');
            curPlayer = newUser._id.toString();
            // Emit the user's ID after successful save
            socket.emit("login", newUser._id.toString(), newUser.averageGameOverSteps, newUser.games);
        } catch (err) {
            console.log('Error adding user to the database:', err);
        }
    });
    socket.on("logout", async () => {
        try {
            if (curPlayer) {
            // Find the user by curPlayer (which contains the userId)
                const user = await User.findOne({ _id: curPlayer });

                if (user) {
                // Set the user's isLoggedIn status to false
                    user.isLoggedIn = false;
                    await user.save();
                }

            // Clean up the players object if the player exists
                if (players[curPlayer] != null) {
                    delete players[curPlayer];
                }

            // Reset curPlayer
                curPlayer = null;

            // Emit the logout event
                socket.emit("logout");
            } else {
                socket.emit("alert", "No user is currently logged in");
            }
        } catch (err) {
        console.error(err); // Log the error for debugging
        socket.emit('alert', 'An error occurred while logging out');
    }
});
    socket.on('heartbeat', async () => {
        if (curPlayer) {
            await User.updateOne({ _id: curPlayer }, { $set: { lastSeen: new Date() } });
        }
    });
    socket.on("singleplayer", () => {
        if (players[curPlayer] == null) {
            players[curPlayer] = new Player(curPlayer);
            players[curPlayer].socketId = socket.id;
        }
        players[curPlayer].mode = "singleplayer";
        opponent = generateRandomString(10);
        players[opponent] = new Computer(opponent);
    })
    socket.on("multiplayer", () => {
        if (connectedMPClients >= maxConnections) {
            socket.emit("full", "sorry, the game room is currently full. Please try again later.")
        } else {
            if (players[curPlayer] == null) {
                players[curPlayer] = new Player(curPlayer);
                players[curPlayer].socketId = socket.id;
            }
            connectedMPClients++;
            players[curPlayer].mode = "multiplayer";
        }
        console.log("connectedMPClients", connectedMPClients)
    })
    socket.on("random", () => { if (players[curPlayer].start == false) { randomBoatPlacement(curPlayer); players[curPlayer].numPlaceShip = 5; socket.emit("randomresult", players[curPlayer].shipLoc); } })
    socket.on("flip", () => {
        players[curPlayer].isFlipped = !players[curPlayer].isFlipped;
        socket.emit("flip", players[curPlayer].isFlipped)
    })
    socket.on("selectShip", (shipName) => {
        if (players[curPlayer].shipLoc[shipName].length == 0) {
            if (players[curPlayer].activeShip == shipName) {
                players[curPlayer].activeShip = null;
            }
            else {
                players[curPlayer].activeShip = shipName;
            }
            socket.emit("selectShip", players[curPlayer].activeShip)
        }
        else {
            socket.emit("alert", "This ship is already placed, your game is potentially modified illegally, consider refreshing the page");
        }
    })
    socket.on("shipPlacement", (location) => {
        if (players[curPlayer].activeShip == null || players[curPlayer].shipLoc[players[curPlayer].activeShip].length != 0) {
            socket.emit("alert", "This ship is already placed on the board or the ship has not been selected, and your game is potentially modified illegally, consider refreshing the page")
        }
        else {
            const row = Math.floor(location / 10);
            const col = location % 10;
            const shipSize = ships[players[curPlayer].activeShip];
            const isValidLocation = (loc) => loc >= 0 && loc < 100;
            const isLocationOccupied = (loc) => players[curPlayer].board[loc] == 1;
            let result = []
            if (players[curPlayer].isFlipped) {
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
                    players[curPlayer].board[element] = 1
                })
                players[curPlayer].shipLoc[players[curPlayer].activeShip] = result;
                players[curPlayer].numPlaceShip++;
                console.log(players[curPlayer].shipLoc)
                socket.emit("shipPlacement", result, players[curPlayer].activeShip);
                players[curPlayer].activeShip = null;
            }
            else {
                socket.emit("alert", "Cannot place on this cell for this " + players[curPlayer].activeShip + " ship")
            }
        }
    })
    socket.on("shipReplacement", (shipName, index) => {
        if (players[curPlayer].shipLoc[shipName].length == 0) {
            socket.emit("alert", "There is an issue with ship replacement, your game is potentially modified illegally, consider refreshing the page")
            socket.emit("selectShip", null);
        }
        else {
            players[curPlayer].shipLoc[shipName].forEach((element) => {
                players[curPlayer].board[element] = 0;
            })
            players[curPlayer].shipLoc[shipName].forEach((loc) => { players[curPlayer].board[loc] = 0 })
            players[curPlayer].activeShip = shipName;
            socket.emit("selectShip", players[curPlayer].activeShip)
            socket.emit("shipReplacement", players[curPlayer].shipLoc[shipName], shipName, index);
            players[curPlayer].shipLoc[shipName] = [];
            players[curPlayer].numPlaceShip--;
            players[curPlayer].displayGrid()
        }
    })
    socket.on("start", () => {
        if (players[curPlayer].mode == "singleplayer" && players[curPlayer].start == false) {
            players[curPlayer].numPlaceShip == 5 ?
            (randomBoatPlacement(opponent), players[opponent].displayGrid(), players[curPlayer].start = true, socket.emit("start"), socket.emit("turn")) :
            socket.emit("not enough ship", "Please place all your ship before starting")
        }
        else if (players[curPlayer].mode == "multiplayer" && players[curPlayer].start == false) {
            opponent = checkForMPOpponent(curPlayer);
            if (players[curPlayer].numPlaceShip != 5) {
                socket.emit("not enough ship", "Please place all your ship before starting")
            }
            else if (opponent == null) {
                socket.emit("info", "Waiting for a player to join");
            }
            else if (opponent != null && players[opponent].numPlaceShip != 5) {
                socket.emit("info", "Your opponent is not ready yet, please wait");
            }
            else if (opponent != null && players[opponent].numPlaceShip == 5) {
                players[curPlayer].start = true;
                players[opponent].start = true;
                socket.emit("start");
                io.to(players[opponent].socketId).emit("ostart");
                socket.emit("turn");
                io.to(players[opponent].socketId).emit("info", "Game has started, it's your opponent's turn")
            }

        }
        players[curPlayer].displayGrid()
    })
    socket.on("findOpponent", () => {
        opponent = checkForMPOpponent(curPlayer);
        players[curPlayer].displayGrid()
    })
    socket.on("attack", (pos) => {
        switch (players[opponent].board[pos]) {
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
        if (players[curPlayer].mode == "singleplayer") {
            socket.emit("info", "The AI is thinking ...")
            setTimeout(() => { computerMove(curPlayer, socket, opponent) }, 500)
        }
        break;
    }
}
})
    socket.on('message', (message) => {
        players[curPlayer].messages.push({ 'player': "You: " + message }); // Save the new message to the session messages
        socket.emit("message", players[curPlayer].messages)
        if (players[curPlayer].mode == "multiplayer") {
            players[opponent].messages.push({ 'opponent': "Opponent: " + message });
            io.to(players[opponent].socketId).emit("message", players[opponent].messages)
        }
    });
    socket.on('disconnect', async   () => {
        console.log(`Client ${socket.id} disconnected`);
        if (curPlayer != null && players[curPlayer] != null) {
            if (players[curPlayer].mode != null && players[curPlayer].mode == "multiplayer" && players[opponent] != null) {
                io.to(players[opponent].socketId).emit("oquit", "Your opponent has quit, please restart")
            }
            else if (players[curPlayer].mode != null && players[curPlayer].mode == "singleplayer" && players[opponent] != null) {
                delete players[opponent];
            }
            if (players[curPlayer] != null) {
                if (connectedMPClients > 0 && players[curPlayer].mode == "multiplayer") {
                    connectedMPClients--;
                }
                delete players[curPlayer];
            }
        }

        if (curPlayer != null) {
            try {
            // Find the user in the db and set isLoggedIn to false
                const user = await User.findOne({ _id: curPlayer });

                if (user) {
                    user.isLoggedIn = false;
                    await user.save();
                    console.log(`User ${curPlayer} logged out successfully.`);
                } else {
                    console.log(`User ${curPlayer} not found in database.`);
                }
            } catch (err) {
                console.error(`Error logging out user ${curPlayer}:`, err);
            }
        }

    });
    socket.on("home", () => {
        players[curPlayer].reset();
        if (players[opponent] != null && players[curPlayer].mode == "multiplayer") {
            connectedMPClients--;
            players[curPlayer].mode = null;
            io.to(players[opponent].socketId).emit("oquit", "Your opponent has quit, please restart")
        }
        else if (players[opponent] != null && players[curPlayer].mode == "singleplayer") {
            delete players[opponent];
        }
        opponent = null;

        socket.emit("home");
    })
    socket.on("oquit", () => {
        players[curPlayer].reset();
        connectedMPClients--;
        opponent = null;
    })
});

setInterval(async () => {
    const timeout = 60 * 1000; // 60 seconds timeout for example
    const inactiveSince = new Date(Date.now() - timeout);

    try {
        await User.updateMany(
            { lastSeen: { $lt: inactiveSince }, isLoggedIn: true },
            { $set: { isLoggedIn: false } }
            );
    } catch (err) {
        console.error('Error logging out inactive users:', err);
    }
}, 30000); // Check every 30 seconds

server.listen(3001, () => { console.log('Server listening on port 3001'); });

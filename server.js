const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const crypto = require('crypto');
let connectedMPClients = 0;
const maxConnections = 2;
const width = 10;
let AIFirstTimeHitNewShip = false;
class Player {
    constructor(id) {
        this.id = id;
        this.board = Array(100).fill(0); // Initialize empty board
        this.flip = false;
        this.numplaceShip = 0;
        this.shipLoc = { 'destroyer': [], 'submarine': [], 'cruiser': [], 'battleship': [], 'carrier': [] }
        this.numDestroyShip = 0;
        this.numHits = 0;
        this.numMisses = 0;
        this.start = false;
        this.messages = [];
    }
    displayGrid() {
        let board = this.board;
        if (board.length !== 100) {
            console.error("Invalid board size. Expected an array of length 100.");
            return;
        }
        console.log(this.id)
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
        this.flip = false;
        this.numplaceShip = 0;
        this.shipLoc = { 'destroyer': [], 'submarine': [], 'cruiser': [], 'battleship': [], 'carrier': [] }
        this.numDestroyShip = 0;
        this.numHits = 0;
        this.numMisses = 0;
        this.start = false;
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
        console.log(this.id)
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
    return "You hit at row " + row + " column " + col + "."
}
const ohitMessage = (col, row) => {
    return "Opponent hit at row " + row + " column " + col + "."
}
const destroyMessage = (shipName) => {
    return "You sunk the " + shipName + " ship" + "."
}
const odestroyMessage = (shipName) => {
    return "Opponent sunk the " + shipName + " ship" + "."
}
const missMessage = (col, row) => {
    return "You miss at row " + row + " column " + col + "."
}
const omissMessage = (col, row) => {
    return "Opponent miss at row " + row + " column " + col + "."
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
    const possHitLocations = Array.from(players[computer].possHitLocations);
    const randomIndex = Math.floor(Math.random() * possHitLocations.length);
    return possHitLocations[randomIndex];
}

const handleAIMiss = (computer, loc) => {
    players[computer].numMisses++;
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
    }
}

const handleAIHit = (computer, loc) => {

    players[computer].numHits++;
    players[computer].hitLocs.push(loc);
    if (!players[computer].possHitDirections.some(element => element !== -1)) {   // if it contains all -1
        players[computer].possHitDirections = getAdjacentCells(loc, players[computer].possHitLocations, players[computer].opponentShipRemain.minSizeShip, true);
        players[computer].curHitDirection = pickDirection(players[computer].possHitDirections);
        AIFirstTimeHitNewShip = true;
    }
    else if (players[computer].curHitDirection != null) {
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
        players[computer].possHitDirections = getAdjacentCells(players[computer].hitLocs[0], players[computer].possHitLocations, players[computer].opponentShipRemain.minSizeShip, true);
        players[computer].curHitDirection = pickDirection(players[computer].possHitDirections);
        AIFirstTimeHitNewShip = true;
    }
    else {
        checkPossHitLocs(computer)
    }
}
function getAdjacentCells(cellIndex, possHitLocations, minSizeShip, checkHit) {      // check each of the cell within the minSizeShip
    const cols = 10;
    let horiPoss = 1;
    let vertPoss = 1;
    let temp = cellIndex;
    console.log("was here")
    while (horiPoss < minSizeShip) {  // check west    
        if (temp % cols !== 0 && possHitLocations.has(temp - 1)) {
            horiPoss += 1;
            temp -= 1;
        }
        else {
            break;
        }
    }

    temp = cellIndex;
    while (horiPoss < minSizeShip) {  //check east
        if ((temp + 1) % cols !== 0 && possHitLocations.has(temp + 1)) {
            horiPoss += 1;
            temp += 1;
        }
        else {
            break;
        }
    }
    temp = cellIndex;
    while (vertPoss < minSizeShip) { // check norht
        if (temp - cols >= 0 && possHitLocations.has(temp - cols)) {
            vertPoss += 1;
            temp -= cols;
        }
        else {
            break;
        }
    }
    temp = cellIndex;
    while (vertPoss < minSizeShip) { // check south
        if (temp + cols < 100 && possHitLocations.has(temp + cols)) {
            vertPoss += 1;
            temp += cols;
        }
        else {
            break;
        }
    }
    console.log("test")
    const above = cellIndex - cols >= 0 && possHitLocations.has(cellIndex - cols) && vertPoss == minSizeShip ? cellIndex - cols : -1;
    const below = cellIndex + cols < 100 && possHitLocations.has(cellIndex + cols) && vertPoss == minSizeShip ? cellIndex + cols : -1;
    const left = cellIndex % cols !== 0 && possHitLocations.has(cellIndex - 1) && horiPoss == minSizeShip ? cellIndex - 1 : -1;
    const right = (cellIndex + 1) % cols !== 0 && possHitLocations.has(cellIndex + 1) && horiPoss == minSizeShip ? cellIndex + 1 : -1;
    if (checkHit === true) {
        return [above, left, below, right];
    }
    else if (checkHit === false) {
        if (above === -1 && below === -1 && left === -1 && right === -1) {
            return false;
        } else {
            return true;
        }
    }
}
const pickDirection = (possHitDirections) => {
    const numDirRemain = possHitDirections.filter(element => element === -1).length;
    return numDirRemain == 1 ? possHitDirections.findIndex(element => element !== -1) : randomIndexNonMinusOne(possHitDirections)
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
    let possHitLocations = players[computer].possHitLocations;
    for (let loc of possHitLocations) {
        const result = getAdjacentCells(loc, players[computer].possHitLocations, players[computer].opponentShipRemain['minSizeShip'], false)
        if (result == false) {
            players[computer].possHitLocations.delete(loc)
        }
    }
}

const computerMove = (user, socket, computer) => {
    let hitPos;
    if (players[computer].hitLocs.length == 0) {
        hitPos = getRandomIndexWithOneValue(computer)
        console.log("from 1")
    }
    else if (players[computer].curHitDirection != null) {
        hitPos = players[computer].possHitDirections[players[computer].curHitDirection]
        console.log("from 2")
    }
    //players[computer].possHitLocations[hitPos] = 0;
    players[computer].possHitLocations.delete(hitPos);

    console.log(hitPos)
    if (players[user].board[hitPos] === 0) {  // miss
        players[user].board[hitPos] = 3;
        handleAIMiss(computer, hitPos)
        players[computer].displayPossHitGrid()
        socket.emit("omiss", hitPos)
        const { row, col } = getRowAndColumn(hitPos);
        players[user].messages.push(omissMessage(row, col))
        socket.emit("message", players[user].messages)
        socket.emit("turn")
    }
    else if (players[user].board[hitPos] === 1) { // hit
        console.log("here")
        players[user].board[hitPos] = 2;
        handleAIHit(computer, hitPos)
        socket.emit("ohit", hitPos)
        const { row, col } = getRowAndColumn(hitPos);
        players[user].messages.push(ohitMessage(row, col))
        socket.emit("message", players[user].messages)
        const result = checkShip(user, hitPos);
        if (result != "normal") {  // destroy ship
            players[computer].numDestroyShip++;
            players[user].messages.push(odestroyMessage(result[0]))
            socket.emit("message", players[user].messages)
            if (players[computer].numDestroyShip == 5) {
                socket.emit("owin", "Your computer/robot has won, shame!");
            }
            else {
                handleAIDestroy(computer, result);
                players[computer].displayPossHitGrid()
                socket.emit("info", "The AI is thinking ...")
                process.nextTick(() => {
                    setTimeout(() => {
                        computerMove(user, socket, computer);
                    }, 500);
                });
            }
        }
        else { // normal hit
            players[computer].displayPossHitGrid()
            socket.emit("info", "The AI is thinking ...")
            process.nextTick(() => {
                setTimeout(() => {
                    computerMove(user, socket, computer);
                }, 500);
            });
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

const checkForMPOpponent = ((curplayer) => {
    for (let id in players) {
        if (players[id].mode == "multiplayer" && id != curplayer) {
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

io.on('connection', (socket) => {
    socket.on("id", () => { socket.emit("id", socket.id) })
    let opponent;
    let curplayer;
    socket.on("singleplayer", () => {
        if (players[socket.id] == null) {
            players[socket.id] = new Player(socket.id);
            curplayer = socket.id;
        }
        players[curplayer].mode = "singleplayer";
        opponent = generateRandomString(10);
        players[opponent] = new Computer(opponent);
    })
    socket.on("multiplayer", () => {
        if (connectedMPClients >= maxConnections) {
            socket.emit("full", "sorry, the game room is currently full. Please try again later.")
        } else {
            if (players[socket.id] == null) {
                players[socket.id] = new Player(socket.id);
                curplayer = socket.id;
            }
            connectedMPClients++;
            players[curplayer].mode = "multiplayer";

        }
        console.log("connectedMPClients", connectedMPClients)
    })
    socket.on("random", () => { if (players[curplayer].start == false) { randomBoatPlacement(curplayer); players[curplayer].numplaceShip = 5; socket.emit("randomresult", players[curplayer].shipLoc); } })
    socket.on("shipPlacement", (shipLocs) => {
        let shipName;
        let valid = true;
        for (const loc of Object.keys(shipLocs)) {
            if (shipName == null) {
                shipName = shipLocs[loc]
            }
            if (players[curplayer].board[loc] == 1) {
                socket.emit("InvalidPlacement", "Invalid placement of ship")
                valid = false;
                players[curplayer].shipLoc[shipName] = []
                break;
            }
            players[curplayer].shipLoc[shipName].push(Number(loc))
        }
        if (valid) {
            Object.keys(shipLocs).forEach(loc => {
                players[curplayer].board[loc] = 1;
            });
            socket.emit("shipPlacement", shipLocs)
            players[curplayer].numplaceShip++;
        }
    })
    socket.on("shipReplacement", (shipName) => {
        players[curplayer].shipLoc[shipName].forEach((element) => {
            players[curplayer].board[element] = 0;
        })
        socket.emit("shipReplacement", players[curplayer].shipLoc[shipName])
        players[curplayer].shipLoc[shipName] = []
        players[curplayer].numplaceShip--;
    })
    socket.on("start", () => {
        if (players[curplayer].mode == "singleplayer" && players[curplayer].start == false) {
            players[curplayer].numplaceShip == 5 ?
                (randomBoatPlacement(opponent), players[opponent].displayGrid(), players[curplayer].start = true, socket.emit("start"), socket.emit("turn")) :
                socket.emit("not enough ship", "Please place all your ship before starting")
        }
        else if (players[curplayer].mode == "multiplayer" && players[curplayer].start == false) {
            opponent = checkForMPOpponent(curplayer);
            if (players[curplayer].numplaceShip != 5) {
                socket.emit("not enough ship", "Please place all your ship before starting")
            }
            else if (opponent == null) {
                socket.emit("info", "Waiting for a player to join");
            }
            else if (opponent != null && players[opponent].numplaceShip != 5) {
                socket.emit("info", "Your opponent is not ready yet, please wait");
            }
            else if (opponent != null && players[opponent].numplaceShip == 5) {
                players[curplayer].start = true;
                players[opponent].start = true;
                socket.emit("start");
                io.to(opponent).emit("ostart");
                socket.emit("turn");
                io.to(opponent).emit("info", "Game has started, it's your opponent's turn")
            }

        }
        players[curplayer].displayGrid()
    })
    socket.on("findOpponent", () => {
        opponent = checkForMPOpponent(curplayer);
        players[curplayer].displayGrid()
    })
    socket.on("attack", (pos) => {
        switch (players[opponent].board[pos]) {
            case 1: {
                curplayer.numHits++;
                players[opponent].board[pos] = 2;
                const result = checkShip(opponent, pos);
                const { row, col } = getRowAndColumn(pos);
                socket.emit("hit", pos)
                players[curplayer].messages.push(hitMessage(row, col));
                socket.emit("message", players[curplayer].messages);
                if (players[curplayer].mode == "multiplayer") {
                    io.to(opponent).emit("ohit", pos)
                    players[opponent].messages.push(ohitMessage(row, col));
                    io.to(opponent).emit("message", players[opponent].messages)
                }

                if (result != "normal") {
                    players[curplayer].numDestroyShip++;
                    socket.emit("destroy", result);
                    players[curplayer].messages.push(destroyMessage(result[0]))
                    socket.emit("message", players[curplayer].messages)
                    if (players[curplayer].mode == "multiplayer") {
                        players[opponent].messages.push(odestroyMessage(result[0]))
                        io.to(opponent).emit("message", players[opponent].messages)
                    }
                }

                if (players[curplayer].numDestroyShip == 5) {
                    socket.emit("win", "You win!");
                    io.to(opponent).emit("owin", "Your opponent has won, you loss")
                }
                break;
            }
            case 2:
            case 3:
                socket.emit('InvalidAttack', "This location is not available to attack")
                break;
            case 0: {
                const { row, col } = getRowAndColumn(pos);
                players[opponent].board[pos] = 3;
                curplayer.numMisses++;
                socket.emit('miss', pos);
                players[curplayer].messages.push(missMessage(row, col))
                socket.emit("message", players[curplayer].messages)
                players[curplayer].mode == "singleplayer"
                    ? (socket.emit("info", "The AI is thinking ..."), setTimeout(() => { computerMove(curplayer, socket, opponent) }, 500))
                    : (
                        io.to(opponent).emit("omiss", pos),
                        io.to(opponent).emit("turn"),
                        players[opponent].messages.push(omissMessage(row, col)),
                        io.to(opponent).emit("message", players[opponent].messages)
                    );
                break;
            }
        }
    })
    socket.on('message', (message) => {
        players[curplayer].messages.push("You: " + message); // Save the new message to the session messages
        socket.emit("message", players[curplayer].messages)
        if (players[curplayer].mode == "multiplayer") {
            players[opponent].messages.push("Opponent: " + message);
            io.to(opponent).emit("message", players[opponent].messages)
        }
    });
    socket.on('disconnect', () => {
        console.log(`Client ${socket.id} disconnected`);
        if (curplayer != null) {
            if (players[curplayer].mode == "multiplayer" && players[opponent] != null) {
                io.to(opponent).emit("oquit", "Your opponent has quit, please restart")
            }
            else if (players[curplayer].mode == "singleplayer" && players[opponent] != null) {
                delete players[opponent];
            }
            if (players[curplayer] != null) {
                if (connectedMPClients > 0 && players[curplayer].mode == "multiplayer") {
                    connectedMPClients--;
                }
                delete players[curplayer];
            }
        }
    });
    socket.on("oquit", () => {
        players[curplayer].reset();
        connectedMPClients--;
        opponent = null;
    })
});

server.listen(3001, () => { console.log('Server listening on port 3001'); });

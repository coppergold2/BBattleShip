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
    // Method to increase numHits
    incrementHits() {
        this.numHits++;
    }

    // Method to increase numMisses
    incrementMisses() {
        this.numMisses++;
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
        this.possibleHitLocs = Array(100).fill(1);
        this.hitLocs = [];
        this.possHitDirections = [-1,-1,-1,-1] // north, west, south, east
        this.curHitDirection = null; // contain the direction of hit 0,1,2,3 representing north, west, south, east
        this.OpponentShipRemain = { 'destroyer': 1, 'submarine': 1, 'cruiser': 1, 'battleship': 1, 'carrier': 1, 'minSizeShip': 2 }
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
    return "You sunk the "+ shipName + " ship" + "."
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



function getRandomIndexWithOneValue(arr) {
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * arr.length);
    } while (arr[randomIndex] !== 1);
    return randomIndex;
  }

const handleAIMiss = (computer, loc) => {
        players[computer].numMisses++;
        players[computer].possibleHitLocs[loc] = 0;
        if (players[computer].hitLocs.length != 0){
            players[computer].
        }
}

const computerMove = (user, socket, computer) => {
    if(players[computer].hitLocs.length == 0){
    const randomGo = getRandomIndexWithOneValue(players[computer].possibleHitLocs)
    players[computer].possibleHitLocs[randomGo] = 0;

    if (players[user].board[randomGo] === 0) {
        players[user].board[randomGo] = 3;
        handleAIMiss(computer, randomGo)
        socket.emit("omiss", randomGo)
        const { row, col } = getRowAndColumn(randomGo);
        players[user].messages.push(omissMessage(row, col))
        socket.emit("message", players[user].messages)
        socket.emit("turn", "Your turn to attack")
    }
    else if (players[user].board[randomGo] === 1) {
        players[user].board[randomGo] = 2;
        players[computer].numHits++;
        players[computer].hitLocs.push(randomGo);
        console.log("hitLocs", players[computer].hitLocs)
        players[computer].possibleHitLocs[randomGo] = 0;
        socket.emit("ohit", randomGo)
        const { row, col } = getRowAndColumn(randomGo);
        players[user].messages.push(ohitMessage(row, col))
        socket.emit("message", players[user].messages)
        const result = checkShip(user, randomGo);
        if (result != "normal") {
            players[computer].numDestroyShip++;
            if (players[computer].numDestroyShip == 5) {
                socket.emit("owin", "Your computer/robot has won, shame!");
            }
            else {
                removeDestroyShipLoc(computer, result);
                computerMove(user, socket, computer);
            }
            players[user].messages.push(odestroyMessage(result[0]))
            socket.emit("message", players[user].messages)
        }
        else {
            computerMove(user, socket, computer);
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
        if (destroyShip[1].includes(players[computer].hitLocs[i])) {
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
                (randomBoatPlacement(opponent), players[opponent].displayGrid(), players[curplayer].start = true, socket.emit("start"), socket.emit("turn", "Your turn to attack")) :
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
                socket.emit("turn", "Your turn to attack");
                io.to(opponent).emit("info", "Game has started, it's your opponent's turn")
            }

        }
        players[curplayer].displayGrid()
        console.log(players[curplayer].shipLoc)
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
                    players[opponent].messages.push(ohitMessage(row,col));
                    io.to(opponent).emit("message", players[opponent].messages)
                }

                if (result != "normal") {
                    players[curplayer].numDestroyShip++;
                    socket.emit("destroy", result);
                    players[curplayer].messages.push(destroyMessage(result[0]))
                    socket.emit("message",players[curplayer].messages)
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
                socket.emit("message",players[curplayer].messages)
                console.log(players[curplayer].mode == "singleplayer")
                players[curplayer].mode == "singleplayer"
                ? computerMove(curplayer, socket, opponent)
                : (
                    io.to(opponent).emit("omiss", pos),
                    io.to(opponent).emit("turn", "Your opponent missed, it's your turn to attack"),
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

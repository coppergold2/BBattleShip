const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
let connectedClients = 0;
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

const randomBoatPlacement = (user) => {
    user.board = Array(100).fill(0);
    function addShipPiece(allBoardBlocks, shipLength) {
        //const allBoardBlocks = document.querySelectorAll(`#${user} div`)
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
        //console.log(`Ship: ${ship}, Length: ${ships[ship]}`);
        const result = addShipPiece(user.board, ships[ship])
        user.shipLoc[ship] = result;
        result.forEach((pos) => { user.board[pos] = 1 })
    }
}


io.on('connection', (socket) => {
    if (connectedClients >= maxConnections) {
        socket.emit("full")
        socket.disconnect(true);
        connectedClients--;
    }
    const curplayer = new Player(socket.id)
    let opponent;
    players[curplayer.id] = curplayer;
    socket.on("singleplayer", () => { players[curplayer.id].mode = "singleplayer"; opponent = new Player(socket.id) })
    socket.on("multiplayer", () => { players[curplayer.id].mode = "multiplayer"; connectedClients++; })
    socket.on("random", () => { randomBoatPlacement(players[curplayer.id]); socket.emit("randomresult", players[curplayer.id].shipLoc) })
    socket.on("start", () => {players[curplayer.id].mode == "singleplayer" ? (socket.emit("start"), socket.emit("turn"), randomBoatPlacement(opponent), opponent.displayGrid()) : null})
    socket.on("attack", (pos) => { console.log(pos)
        switch (opponent.board[pos]) {
            case 1:
                socket.emit('hit', pos);
                opponent.board[pos] = 2;
                break;
            case 2 || 3:
                socket.emit('InvalidAttack')
                break;
            case 0:
                socket.emit('miss', pos);
                console.log("server pos", pos);
                opponent.board[pos] = 3;
                break;
        }
    })
    socket.on('disconnect', () => { console.log(`Client ${socket.id} disconnected`); connectedClients--; });
});
server.listen(3001, () => { console.log('Server listening on port 3001'); });
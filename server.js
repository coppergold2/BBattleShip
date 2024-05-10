const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
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

const computerMove = (user, socket, opponent) => {
    // console.log(opponent.numHits);
    let randomGo = Math.floor(Math.random() * width * width)
    if ([2, 3].includes(user.board[randomGo])) {
        computerMove(user, socket, opponent);
    }
    else if (user.board[randomGo] === 0) {
        user.board[randomGo] = 3;
        opponent.numMisses++;
        socket.emit("omiss", randomGo)
        socket.emit("turn")
    }
    else if (user.board[randomGo] === 1) {
        user.board[randomGo] = 2;
        opponent.numHits++;
        socket.emit("ohit", randomGo)
        computerMove(user, socket, opponent);
    }
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

const checkShip = (curplayer, opponent, pos) => {
    let shipPosition = [];
    let shipName = "";
    for (let ship in ships) {
        if (opponent.shipLoc[ship].includes(pos)) { shipPosition = opponent.shipLoc[ship]; shipName = ship; break; }
    }
    let shipDestoryed = true;
    shipPosition.forEach((index) => {
        if (opponent.board[index] != 2) {
            shipDestoryed = false;
        }
    })
    if (shipDestoryed == true) {
        curplayer.numDestroyShip++;
        return [shipName, shipPosition];
    }
    else {
        return "normal";
    }
}

io.on('connection', (socket) => {
    let opponent;
    let curplayer;
    socket.on("singleplayer", () => { 
         players[socket.id] = new Player(socket.id); curplayer = players[socket.id]; curplayer.mode = "singleplayer"; opponent = new Player(socket.id) })
    socket.on("multiplayer", () => {
        if (connectedMPClients >= maxConnections) {
            socket.emit("full")
            socket.disconnect(true);
        } else {players[socket.id] = new Player(socket.id); curplayer = players[socket.id]; curplayer.mode = "multiplayer"; connectedMPClients++; }
        console.log(connectedMPClients)
    })
    socket.on("random", () => { if (curplayer.start == false)  {randomBoatPlacement(curplayer); curplayer.numplaceShip = 5; socket.emit("randomresult", curplayer.shipLoc); curplayer.displayGrid()} })
    socket.on("start", () => { curplayer.mode == "singleplayer" && curplayer.start == false ? (curplayer.numplaceShip == 5 ? (randomBoatPlacement(opponent), opponent.displayGrid(), curplayer.start = true, socket.emit("start"), socket.emit("turn")) : socket.emit("not enough ship")) : null })
    socket.on("attack", (pos) => {
        console.log(pos)
        switch (opponent.board[pos]) {
            case 1:
                curplayer.numHits++;
                opponent.board[pos] = 2;
                const result = checkShip(curplayer, opponent, pos);
                if (result == "normal") {
                    socket.emit("hit", pos)
                }
                else {
                    socket.emit("destroy", result)
                }
                if (curplayer.numDestroyShip == 5) {
                    socket.emit("win")
                }
                break;
            case 2:
            case 3:
                socket.emit('InvalidAttack')
                break;
            case 0:
                opponent.board[pos] = 3;
                curplayer.numMisses++;
                socket.emit('miss', pos);
                computerMove(curplayer, socket, opponent)
                break;
        }
    })
    socket.on('disconnect', () => { console.log(`Client ${socket.id} disconnected`); if(connectedMPClients>0) connectedMPClients--; });
});
server.listen(3001, () => { console.log('Server listening on port 3001'); });
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
let connectedClients = 0;
const maxConnections = 2;
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
}
const players = {};

function getValidity(allBoardBlocks, isHorizontal, startIndex, ship) {
    let validStart = isHorizontal ?
        (startIndex <= width * width - ship.length ? startIndex : width * width - ship.length) :
        (startIndex <= width * width - width * ship.length ? startIndex : startIndex - ship.length * width + width)

    let shipBlocks = []
    for (let i = 0; i < ship.length; i++) {
        if (isHorizontal) {
            shipBlocks.push(allBoardBlocks[Number(validStart) + i])
        } else {
            shipBlocks.push(allBoardBlocks[Number(validStart) + i * width]) // has an issue when the random index + i * width is bigger than 99
        }
    }
    let valid

    if (isHorizontal) {
        shipBlocks.every((_shipBlock, index) =>
            valid = shipBlocks[0].id % width !== width - (shipBlocks.length - (index + 1)))
    } else {
        shipBlocks.every((_shipBlock, index) =>
            valid = shipBlocks[0].id < 90 + (width * index + 1)
        )
    }

    const notTaken = shipBlocks.every(shipBlock => !shipBlock.classList.contains('taken'))

    return { shipBlocks, valid, notTaken }
}

function randomBoatPlacement() {
    
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
    socket.on("random", {})
    socket.on('disconnect', () => { console.log(`Client ${socket.id} disconnected`); connectedClients--; });
});
server.listen(3001, () => { console.log('Server listening on port 3001'); });
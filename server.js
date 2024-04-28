const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
let connectedClients = 0;
const maxConnections = 2;
class Player {
    #numHits;
    #numMisses;
    constructor(id) {
        this.id = id;
        //this.board = createBoard(); // Initialize empty board
        this.flip = false;
        this.numplaceShip = 0;
        this.shipLoc = { 'destroyer': [], 'submarine': [], 'cruiser': [], 'battleship': [], 'carrier': [] }
        this.numDestroyShip = 0;
        this.numHits = 0;
        this.numMisses = 0;
    }
    // Method to increase numHits
    incrementHits() {
        this.#numHits++;
    }

    // Method to increase numMisses
    incrementMisses() {
        this.#numMisses++;
    }

    // Getter methods to access numHits and numMisses
    getNumHits() {
        return this.#numHits;
    }

    getNumMisses() {
        return this.#numMisses;
    }
}
const players = [];



io.on('connection', (socket) => {
    if (connectedClients >= maxConnections) {
        socket.emit("full")
        socket.disconnect(true);
        connectedClients--;
    }
    connectedClients++;
    const curplayer =  new Player(socket.id)
    socket.on('disconnect', () => { console.log(`Client ${socket.id} disconnected`); connectedClients--;});
});
server.listen(3001, () => { console.log('Server listening on port 3001');  });
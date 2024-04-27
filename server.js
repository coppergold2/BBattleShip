const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

class Player {
    constructor(id) {
        this.id = id;
        //this.board = createBoard(); // Initialize empty board
        this.angle = 0;
        this.numplaceShip = 0;
        this.shipLoc = { 'destroyer': [], 'submarine': [], 'cruiser': [], 'battleship': [], 'carrier': [] }
        this.numDestroyShip = 0;
        this.numHits = 0;
        this.numMisses = 0;
    }
}
const players = [];



io.on('connection', (socket) => {
    console.log(`Client connected with ID: ${socket.id}`);
    const curplayer =  new Player(socket.id)
    console.log(curplayer.id)
    socket.on('disconnect', () => { console.log(`Client ${socket.id} disconnected`); });
});
server.listen(3001, () => { console.log('Server listening on port 3001'); });
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
io.on('connection', (socket) => {
    console.log('New client connected');
    socket.on('disconnect', () => { console.log('Client disconnected'); });
});
server.listen(3001, () => { console.log('Server listening on port 3001'); });
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
    let randomGo = Math.floor(Math.random() * width * width)
    if ([2, 3].includes(players[user].board[randomGo])) {
        computerMove(user, socket, opponent);
    }
    else if (players[user].board[randomGo] === 0) {
        players[user].board[randomGo] = 3;
        players[opponent].numMisses++;
        socket.emit("omiss", randomGo)
        socket.emit("turn", "Your turn to attack")
    }
    else if (players[user].board[randomGo] === 1) {
        players[user].board[randomGo] = 2;
        players[opponent].numHits++;
        socket.emit("ohit", randomGo)
        const result = checkShip(user, randomGo);
        if (result != "normal") {
            players[opponent].numDestroyShip++;
            if (players[opponent].numDestroyShip == 5) {
                socket.emit("owin", "Your opponent/robot has won, shame!");
            }
            else {
                computerMove(user, socket, opponent);
            }
        }
        else {
            computerMove(user, socket, opponent);
        }
    }
}

const randomBoatPlacement = (user) => {
    players[user].board = Array(100).fill(0);
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
io.on('connection', (socket) => {
    socket.on("id", () => { socket.emit("id", socket.id) })
    let opponent;
    let curplayer;
    socket.on("singleplayer", () => {
        if(players[socket.id] == null){
        players[socket.id] = new Player(socket.id);
        curplayer = socket.id;
        }
        players[curplayer].mode = "singleplayer";
        opponent = generateRandomString(10);
        players[opponent] = new Player(opponent);
    })
    socket.on("multiplayer", () => {
        if (connectedMPClients >= maxConnections) {
            socket.emit("full", "sorry, the game room is currently full. Please try again later.")
            socket.disconnect(true);
        } else {
            if(players[socket.id] == null){
            players[socket.id] = new Player(socket.id);
            curplayer = socket.id;
            connectedMPClients++;
            }
            players[curplayer].mode = "multiplayer";
            
        }
        console.log("connectedMPClients", connectedMPClients)
    })
    socket.on("random", () => { if (players[curplayer].start == false) { randomBoatPlacement(curplayer); players[curplayer].numplaceShip = 5; socket.emit("randomresult", players[curplayer].shipLoc); players[curplayer].displayGrid() } })
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
    })
    socket.on("findOpponent", () => {
        opponent = checkForMPOpponent(curplayer);
    })
    socket.on("attack", (pos) => {
        console.log("opponent in attack", opponent);
        switch (players[opponent].board[pos]) {
            case 1:
                curplayer.numHits++;
                players[opponent].board[pos] = 2;
                const result = checkShip(opponent, pos);
                if (result == "normal") {
                    socket.emit("hit", pos)
                    io.to(opponent).emit("ohit", pos)
                }
                else {
                    players[curplayer].numDestroyShip++;
                    socket.emit("destroy", result);
                    io.to(opponent).emit("ohit", pos)
                }
                if (players[curplayer].numDestroyShip == 5) {
                    socket.emit("win", "You win!");
                    io.to(opponent).emit("owin", "Your opponent has won, you loss")
                }
                break;
            case 2:
            case 3:
                socket.emit('InvalidAttack')
                break;
            case 0:
                players[opponent].board[pos] = 3;
                curplayer.numMisses++;
                socket.emit('miss', pos);
                players[curplayer].mode == "singleplayer" ? computerMove(curplayer, socket, opponent) : io.to(opponent).emit("omiss", pos), io.to(opponent).emit("turn", "Your opponent miss, it's your turn to attack")
                break;
        }
    })
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
        opponent = null;
    })
    console.log("players length", Object.keys(players).length);
});

server.listen(3001, () => { console.log('Server listening on port 3001'); });

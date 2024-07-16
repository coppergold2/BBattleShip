Built with React and Node JS

    'npm install' to install required packages
    'node server.js' to run the backend server
    'npm start' to run the frontend game
    currently it is only optimized for 1920 by 1080p FHD resolution Aimed to store and manage all the game state in the server side and the AI should be good, if not AGI

Have a .env file with this Local: MONGO_URI=mongodb://localhost:27017/battleship. Online: MONGO_URI=mongodb+srv://username:pwd@battleship.ikcw47f.mongodb.net/battleship?retryWrites=true&w=majority&appName=Battleship

Linux user run this to start mongoDB sudo service mongod start

This is AI with function getRandomIndexWithOneValue(computer) { let nextHitLocations = checkMinAllDirection(players[computer].possHitLocations, players[computer].opponentShipRemain['minSizeShip']) nextHitLocations = checkMostValueableHit(nextHitLocations, players[computer].possHitLocations, players[computer].opponentShipRemain['minSizeShip']) const randomIndex = Math.floor(Math.random() * nextHitLocations.length); return nextHitLocations[randomIndex]; }

checkMostValueableHit: if((minSizeShip == 2 && mostEliminate > 2) || minSizeShip > 2){ return [...mostELocations] } return nextHitLocations;

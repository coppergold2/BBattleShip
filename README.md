Built with React and Node JS, Express, socket.io and Mongo DB
Pre. need to install mongoDB
1. 'npm install' to install required packages
2. 'node server.js' to run the backend server
3. 'npm start' to run the frontend game
4. should be playable on mobile devices
Aimed to store and manage all the game state in the server side and the AI should be good, if not AGI

Have a .env file with the following, adjust appropriately if hosted online instead of locally
MONGO_URI=mongodb://localhost:27017/battleship.
JWT_SECRET=generate your own JWT secret key
REACT_APP_API_URL=http://localhost:3001
REACT_APP_SOCKET_URL=http://localhost:3001

Linux user run this to start mongoDB
sudo service mongod start

Example command format for placing saving ship position: {"destroyer":[7,8],"submarine":[30,40,50],"cruiser":[69,79,89],"battleship":[1,2,3,4],"carrier":[90,91,92,93,94]}

Currently, the game is hosted on https://bbattleship.onrender.com/
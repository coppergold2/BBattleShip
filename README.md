Built with React and Node JS
1. 'npm install' to install required packages
2. 'node server.js' to run the backend server
3. 'npm start' to run the frontend game
4. currently it is only optimized for 1920 by 1080p FHD resolution
Aimed to store and manage all the game state in the server side and the AI should be good, if not AGI

Have a .env file with this
Local: MONGO_URI=mongodb://localhost:27017/battleship.
Online: MONGO_URI=mongodb+srv://username:pwd@battleship.ikcw47f.mongodb.net/battleship?retryWrites=true&w=majority&appName=Battleship

Linux user run this to start mongoDB
sudo service mongod start

command format for placing saving ship position: {"destroyer":[7,8],"submarine":[30,40,50],"cruiser":[69,79,89],"battleship":[1,2,3,4],"carrier":[90,91,92,93,94]}
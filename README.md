Built with React and Node JS, Express, socket.io and Mongo DB
Pre. need to install mongoDB
1. Run `npm install` to install required packages.
2. Start MongoDB.
3. Run `npm start` to start the React frontend and backend together.

To run only the backend (for example, when the frontend is hosted separately), use `npm run start:server`. The backend serves the production frontend from `build/` when that directory is present.
4.  Aimed to store and manage all the game state in the server side and the AI should be good, if not AGI

Create a `.env` file with the following local-development values. Keep secrets server-side and configure origins/URLs for deployment:
MONGO_URI=mongodb://localhost:27017/battleship

JWT_SECRET=generate your own JWT secret key

CLIENT_ORIGIN=http://localhost:3000

REACT_APP_API_URL=http://localhost:3001

For local development, the React development server proxies API and Socket.IO requests to `http://localhost:3001`; the `REACT_APP_API_URL` value can therefore be omitted. For a separately hosted frontend, set `REACT_APP_API_URL` and `REACT_APP_SOCKET_URL` to the backend's public origin and configure `CLIENT_ORIGIN` (or comma-separated `CLIENT_ORIGINS`) on the backend to the frontend origin(s). These `REACT_APP_*` variables are public build-time URLs and must not contain secrets.

Linux user run this to start mongoDB
sudo service mongod start

Example command format for placing saving ship position: {"destroyer":[7,8],"submarine":[30,40,50],"cruiser":[69,79,89],"battleship":[1,2,3,4],"carrier":[90,91,92,93,94]}

The game is hosted on https://bbattleship.onrender.com/

Multiple tabs can be logged in using the same account, but only one game can be played at a time per account. It is not possible to play two games simultaneously using the same account.

The website is primarily designed for desktop screens but is also optimized for mobile and smaller screens. However, the disconnect-to-reconnect logic on mobile devices is not very stable.

import { io } from 'socket.io-client';

const socketUrl = process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL;

export const createSocket = () => io(socketUrl, {
  withCredentials: true,
});

import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SERVER_URL || (import.meta.env.PROD ? '' : 'http://localhost:3005');

export const socket = io(URL, { autoConnect: true });

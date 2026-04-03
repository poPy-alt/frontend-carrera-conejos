import { io } from 'socket.io-client';

// Use current window location to find the backend (assuming same network)
const SOCKET_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

export const socket = io(SOCKET_URL);

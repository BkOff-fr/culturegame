import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = async (token: string): Promise<Socket> => {
  if (socket?.connected) {
    return socket;
  }

  // Se connecter directement au serveur Socket.io principal
  socket = io({
    auth: {
      token
    },
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    timeout: 20000,
    forceNew: false
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
// hooks/useSocketIO.ts
import { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';

interface SocketHook {
  socket: Socket | null;
  connect: (roomId: string, userId: string) => void;
}

export const useSocketIO = (): SocketHook => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(process.env.SOCKET_IO_SERVER!, {
      transports: ['websocket'],
      query: { token: 'user-auth-token' }, // Replace with actual auth token
    });
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const connect = (roomId: string, userId: string) => {
    if (socket) {
      socket.emit('joinRoom', roomId, userId);
      socket.on('playerJoined', (data: { userId: string; playerNumber: number }) => {
        console.log('Player joined:', data);
      });
      socket.on('diceRolled', (data: { roomId: string; diceValue: number }) => {
        console.log('Dice rolled:', data);
      });
      socket.on('tokenMoved', (data: { roomId: string; tokenIndex: number; newPosition: number }) => {
        console.log('Token moved:', data);
      });
    }
  };

  return { socket, connect };
};
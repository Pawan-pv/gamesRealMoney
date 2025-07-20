// server/index.ts

import { Client, Databases } from 'react-native-appwrite';
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

// --- ENVIRONMENT ---
const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '';
const API_KEY = process.env.APPWRITE_API_KEY || '';
const DB_ID = process.env.APPWRITE_DATABASE_ID || '';
const ROOMS_COLLECTION = process.env.APPWRITE_ROOMS_COLLECTION || '';
const GAME_STATES_COLLECTION = process.env.APPWRITE_GAME_STATES_COLLECTION || '';

// --- APPWRITE CLIENT SETUP ---
const appwrite = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID);
// API keys with Appwrite SDK v10+ should be set via headers on each request/repository!
const databases = new Databases(appwrite);

// --- EXPRESS & SOCKET.IO SETUP ---
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Restrict to actual client(s) for production!
    methods: ['GET', 'POST'],
  },
});

// --- TYPES ---
type PlayerKey = 'player1' | 'player2' | 'player3' | 'player4';
type Color = 'red' | 'green' | 'yellow' | 'blue';

interface Player {
  userId: string;
  playerNumber: number;
  joinedAt: string;
  isReady: boolean;
  isBot: boolean;
}
interface Token {
  position: number;
  isHome: boolean;
  isSafe: boolean;
  color: Color;
}
interface GameRoom {
  $id: string;
  roomCode: string;
  entryFee: number;
  maxPlayers: number;
  currentPlayers: number;
  gameType: 'classic' | 'quick' | 'tournament';
  status: 'waiting' | 'playing' | 'completed' | 'cancelled';
  prizePool: number;
  commission: number;
  winner?: string;
  players: Player[];
  gameSettings: {
    timeLimit: number;
    autoPlay: boolean;
    botsEnabled: boolean;
    moveLimit: number;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

type GameHistoryEvent = {
  player: number;
  action: 'move' | 'roll' | 'capture';
  dice?: number;
  tokenIndex?: number;
  from?: number;
  to?: number;
  timestamp: string;
};

interface GameState {
  $id: string;
  roomId: string;
  currentPlayer: number;
  diceValue: number;
  moveCounts: Record<PlayerKey, number>;
  room: GameRoom;
  players: Player[];
  gameBoard: Record<PlayerKey, { tokens: Token[] }>;
  gameHistory: GameHistoryEvent[];
  startedAt: string;
  updatedAt: string;
}

// --- DOC MAPPERS ---
function mapToGameRoom(doc: any): GameRoom {
  return {
    $id: doc.$id,
    roomCode: doc.roomCode,
    entryFee: doc.entryFee,
    maxPlayers: doc.maxPlayers,
    currentPlayers: doc.currentPlayers,
    gameType: doc.gameType,
    status: doc.status,
    prizePool: doc.prizePool,
    commission: doc.commission,
    winner: doc.winner,
    players: doc.players ?? [],
    gameSettings: doc.gameSettings,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
function mapToGameState(doc: any, room: GameRoom): GameState {
  return {
    $id: doc.$id,
    roomId: doc.roomId,
    currentPlayer: doc.currentPlayer,
    diceValue: doc.diceValue,
    moveCounts: doc.moveCounts,
    gameBoard: doc.gameBoard,
    gameHistory: (doc.gameHistory ?? []).map(mapToGameHistoryEvent),
    startedAt: doc.startedAt,
    updatedAt: doc.updatedAt,
    room,
    players: room.players,
  };
}
function mapToGameHistoryEvent(e: any): GameHistoryEvent {
  // restrict action only to allowed values, fallback to 'move'
  let action: GameHistoryEvent["action"];
  if (e.action === 'move' || e.action === 'roll' || e.action === 'capture') action = e.action;
  else action = 'move';
  return {
    player: e.player,
    action,
    dice: e.dice,
    tokenIndex: e.tokenIndex,
    from: e.from,
    to: e.to,
    timestamp: e.timestamp,
  };
}

// --- HELPERS ---
const getNextPlayer = (currentPlayer: number): number => (currentPlayer % 4) + 1;
const isValidMove = (token: Token, newPosition: number, gameState: GameState, diceValue: number): boolean => {
  if (token.isHome && diceValue !== 6) return false;
  const currentPosition = token.position;
  const moveDistance = newPosition - currentPosition;
  return moveDistance === diceValue && newPosition >= 0 && newPosition <= 56;
};
const isSafePosition = (position: number): boolean =>
  [0, 1, 9, 14, 22, 27, 35, 40, 48].includes(position);

const checkCapture = (newPosition: number, gameState: GameState): { player: number; tokenIndex: number } | null => {
  const players = [1, 2, 3, 4].filter((p) => p !== gameState.currentPlayer);
  for (const player of players) {
    const playerKey = `player${player}` as PlayerKey;
    const tokens = gameState.gameBoard[playerKey].tokens;
    const captured = tokens.findIndex((t) => t.position === newPosition && !t.isSafe);
    if (captured !== -1) return { player, tokenIndex: captured };
  }
  return null;
};
const checkWin = (tokens: Token[]): boolean => tokens.every((t) => t.position === 56);

// --- SOCKET.IO EVENTS ---
io.on('connection', (socket: Socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('joinRoom', async (roomId: string) => {
    try {
      const rawRoom = await databases.getDocument(DB_ID, ROOMS_COLLECTION, roomId);
      const rawGameState = await databases.getDocument(DB_ID, GAME_STATES_COLLECTION, roomId);
      if (!rawRoom || !rawGameState) {
        socket.emit('error', { message: 'Room or game state not found' });
        return;
      }
      const room = mapToGameRoom(rawRoom);
      const gameState = mapToGameState(rawGameState, room);

      socket.join(roomId);
      io.to(roomId).emit('updateGameState', gameState);

      // Start game if room is full
      if (room.currentPlayers >= room.maxPlayers && room.status === 'waiting') {
        await databases.updateDocument(DB_ID, ROOMS_COLLECTION, roomId, { status: 'playing' });
        io.to(roomId).emit('roomFull', { roomId });
      }
    } catch (error) {
      console.error('Join Room Error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('rollDice', async (roomId: string, diceValue: number) => {
    try {
      const rawGameState = await databases.getDocument(DB_ID, GAME_STATES_COLLECTION, roomId);
      const rawRoom = await databases.getDocument(DB_ID, ROOMS_COLLECTION, roomId);
      if (!rawRoom || !rawGameState) {
        socket.emit('error', { message: 'Room or game state not found' });
        return;
      }
      const room = mapToGameRoom(rawRoom);
      const gameState = mapToGameState(rawGameState, room);

      const nextPlayer = getNextPlayer(gameState.currentPlayer);
      const newGameHistory: GameHistoryEvent[] = [
        ...gameState.gameHistory,
        {
          player: gameState.currentPlayer,
          action: 'roll',
          dice: diceValue,
          timestamp: new Date().toISOString(),
        },
      ];

      await databases.updateDocument(DB_ID, GAME_STATES_COLLECTION, roomId, {
        diceValue,
        currentPlayer: nextPlayer,
        gameHistory: newGameHistory,
      });

      const updatedGameState: GameState = {
        ...gameState,
        diceValue,
        currentPlayer: nextPlayer,
        gameHistory: newGameHistory,
      };
      io.to(roomId).emit('updateGameState', updatedGameState);
    } catch (error) {
      console.error('Roll Dice Error:', error);
      socket.emit('error', { message: 'Failed to roll dice' });
    }
  });

  socket.on('moveToken', async (roomId: string, data: { tokenIndex: number; newPosition: number }) => {
    try {
      const { tokenIndex, newPosition } = data;
      const rawGameState = await databases.getDocument(DB_ID, GAME_STATES_COLLECTION, roomId);
      const rawRoom = await databases.getDocument(DB_ID, ROOMS_COLLECTION, roomId);
      if (!rawRoom || !rawGameState) {
        socket.emit('error', { message: 'Room or game state not found' });
        return;
      }
      const room = mapToGameRoom(rawRoom);
      const gameState = mapToGameState(rawGameState, room);

      const playerKey = `player${gameState.currentPlayer}` as PlayerKey;
      const updatedBoard = { ...gameState.gameBoard };
      const token = updatedBoard[playerKey].tokens[tokenIndex];

      if (!isValidMove(token, newPosition, gameState, gameState.diceValue)) {
        socket.emit('error', { message: 'Invalid move' });
        return;
      }
      const moveCount = gameState.moveCounts[playerKey] || 0;
      const moveLimit = room.gameSettings.moveLimit || 10;
      if (moveCount >= moveLimit) {
        socket.emit('error', { message: 'Move limit reached' });
        return;
      }

      updatedBoard[playerKey].tokens[tokenIndex] = {
        ...token,
        position: newPosition,
        isHome: newPosition === 0,
        isSafe: isSafePosition(newPosition),
      };

      const capture = checkCapture(newPosition, gameState);
      if (capture) {
        const opponentKey = `player${capture.player}` as PlayerKey;
        updatedBoard[opponentKey].tokens[capture.tokenIndex] = {
          position: 0,
          isHome: true,
          isSafe: false,
          color: updatedBoard[opponentKey].tokens[capture.tokenIndex].color,
        };
      }

      const newMoveCounts: Record<PlayerKey, number> = {
        ...gameState.moveCounts,
        [playerKey]: moveCount + 1,
      };
      const newGameHistory: GameHistoryEvent[] = [
        ...gameState.gameHistory,
        {
          player: gameState.currentPlayer,
          action: 'move',
          tokenIndex,
          from: token.position,
          to: newPosition,
          timestamp: new Date().toISOString(),
        },
      ];

      await databases.updateDocument(DB_ID, GAME_STATES_COLLECTION, roomId, {
        gameBoard: updatedBoard,
        moveCounts: newMoveCounts,
        gameHistory: newGameHistory,
      });

      const updatedGameState: GameState = {
        ...gameState,
        gameBoard: updatedBoard,
        moveCounts: newMoveCounts,
        gameHistory: newGameHistory,
      };

      if (checkWin(updatedBoard[playerKey].tokens)) {
        await databases.updateDocument(DB_ID, ROOMS_COLLECTION, roomId, {
          status: 'completed',
          winner: gameState.players.find((p) => p.playerNumber === gameState.currentPlayer)?.userId,
        });
        io.to(roomId).emit('gameOver', {
          winner: gameState.players.find((p) => p.playerNumber === gameState.currentPlayer)?.userId,
        });
      }

      io.to(roomId).emit('updateGameState', updatedGameState);
    } catch (error: any) {
      console.error('Move Token Error:', error);
      socket.emit('error', { message: error?.message || 'Move failed' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// --- EXPRESS ROUTE (type safe) ---
app.get('/health', (_: Request, res: Response) => {
  res.status(200).json({ status: 'Server is running' });
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

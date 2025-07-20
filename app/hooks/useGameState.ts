// app/hooks/useGameState.ts

import { useEffect, useState } from 'react';
import { databases } from '../lib/appwrite';
import { GameRoom, GameState, Token } from '../lib/types';
import { useSocketIO } from './useSocketIo';

const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'YOUR_DATABASE_ID';
const APPWRITE_ROOMS_COLLECTION = process.env.APPWRITE_ROOMS_COLLECTION || 'YOUR_ROOMS_COLLECTION';
const APPWRITE_GAME_STATES_COLLECTION = process.env.APPWRITE_GAME_STATES_COLLECTION || 'YOUR_GAME_STATES_COLLECTION';

interface GameStateHook {
  gameState: GameState | null;
  isLoading: boolean;
  rollDice: () => Promise<void>;
  moveToken: (tokenIndex: number, newPosition: number) => Promise<void>;
}

// --- Mapping helpers ---

function mapDocumentToGameRoom(doc: any): GameRoom {
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
    players: doc.players,
    gameSettings: doc.gameSettings,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function mapDocumentToGameState(doc: any, room: GameRoom): GameState {
  return {
    $id: doc.$id,
    roomId: doc.roomId,
    currentPlayer: doc.currentPlayer,
    diceValue: doc.diceValue,
    moveCounts: doc.moveCounts,
    gameBoard: doc.gameBoard,
    gameHistory: doc.gameHistory,
    startedAt: doc.startedAt,
    updatedAt: doc.updatedAt,
    room,
    players: room.players,
  };
}

// ---

export const useGameState = (roomId: string): GameStateHook => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { socket } = useSocketIO();

  useEffect(() => {
    const fetchGameState = async () => {
      try {
        const gameStateDoc = await databases.getDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_GAME_STATES_COLLECTION,
          roomId
        );
        const roomDoc = await databases.getDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_ROOMS_COLLECTION,
          roomId
        );
        const room = mapDocumentToGameRoom(roomDoc);
        const gameState = mapDocumentToGameState(gameStateDoc, room);
        setGameState(gameState);
        setIsLoading(false);
      } catch (error) {
        console.error('Fetch Game State Error:', error);
        setIsLoading(false);
      }
    };

    fetchGameState();

    if (socket) {
      socket.emit('joinRoom', roomId);
      socket.on('updateGameState', async (state: GameState) => {
        const roomDoc = await databases.getDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_ROOMS_COLLECTION,
          roomId
        );
        const room = mapDocumentToGameRoom(roomDoc);
        setGameState(mapDocumentToGameState(state, room));
        setIsLoading(false);
      });
    }

    return () => {
      if (socket) socket.off('updateGameState');
    };
  }, [socket, roomId]);

  const rollDice = async () => {
    try {
      const diceValue = Math.floor(Math.random() * 6) + 1;
      if (!gameState) throw new Error('Game state not loaded');
      if (socket) {
        socket.emit('rollDice', roomId, diceValue);
      }
      await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_GAME_STATES_COLLECTION,
        roomId,
        {
          diceValue,
          currentPlayer: getNextPlayer(gameState.currentPlayer),
          gameHistory: [
            ...(gameState.gameHistory || []),
            {
              player: gameState.currentPlayer || 1,
              action: 'roll',
              dice: diceValue,
              timestamp: new Date().toISOString(),
            },
          ],
        }
      );
    } catch (error) {
      console.error('Roll Dice Error:', error);
      throw error;
    }
  };

  const moveToken = async (tokenIndex: number, newPosition: number) => {
    try {
      if (!gameState || !socket) throw new Error('Game state or socket not available');
      const playerKey = `player${gameState.currentPlayer}` as keyof GameState['gameBoard'];
      const updatedBoard = { ...gameState.gameBoard };
      const token = updatedBoard[playerKey].tokens[tokenIndex];

      if (!isValidMove(token, newPosition, gameState, gameState.diceValue)) {
        throw new Error('Invalid move');
      }

      const moveCount = gameState.moveCounts[playerKey] || 0;
      const moveLimit = gameState.room?.gameSettings.moveLimit || 10;
      if (moveCount >= moveLimit) {
        throw new Error('Move limit reached');
      }

      updatedBoard[playerKey].tokens[tokenIndex] = {
        ...token,
        position: newPosition,
        isHome: newPosition === 0,
        isSafe: isSafePosition(newPosition),
      };

      const capture = checkCapture(newPosition, gameState);
      if (capture) {
        const opponentKey = `player${capture.player}` as keyof GameState['gameBoard'];
        updatedBoard[opponentKey].tokens[capture.tokenIndex] = {
          position: 0,
          isHome: true,
          isSafe: false,
          color: updatedBoard[opponentKey].tokens[capture.tokenIndex].color,
        };
      }

      await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_GAME_STATES_COLLECTION,
        roomId,
        {
          gameBoard: updatedBoard,
          moveCounts: {
            ...gameState.moveCounts,
            [playerKey]: moveCount + 1,
          },
          gameHistory: [
            ...gameState.gameHistory,
            {
              player: gameState.currentPlayer,
              action: 'move',
              tokenIndex,
              from: token.position,
              to: newPosition,
              timestamp: new Date().toISOString(),
            },
          ],
        }
      );

      if (checkWin(updatedBoard[playerKey].tokens)) {
        await databases.updateDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_ROOMS_COLLECTION,
          roomId,
          {
            status: 'completed',
            winner: gameState.players.find((p) => p.playerNumber === gameState.currentPlayer)?.userId,
          }
        );
      }

      socket.emit('moveToken', roomId, { tokenIndex, newPosition });
    } catch (error) {
      console.error('Move Token Error:', error);
      throw error;
    }
  };

  return { gameState, rollDice, moveToken, isLoading };
};

// Helper functions

const getNextPlayer = (currentPlayer?: number): number => {
  return currentPlayer ? (currentPlayer % 4) + 1 : 1;
};

const isValidMove = (token: Token, newPosition: number, gameState: GameState, diceValue: number): boolean => {
  if (token.isHome && diceValue !== 6) return false;
  const currentPosition = token.position;
  const moveDistance = newPosition - currentPosition;
  return moveDistance === diceValue && newPosition >= 0 && newPosition <= 56;
};

const isSafePosition = (position: number): boolean => {
  const safePositions = [0, 1, 9, 14, 22, 27, 35, 40, 48];
  return safePositions.includes(position);
};

const checkCapture = (newPosition: number, gameState: GameState): { player: number; tokenIndex: number } | null => {
  const players = [1, 2, 3, 4].filter((p) => p !== gameState.currentPlayer);
  for (const player of players) {
    const playerKey = `player${player}` as keyof GameState['gameBoard'];
    const tokens = gameState.gameBoard[playerKey].tokens;
    const captured = tokens.findIndex((t) => t.position === newPosition && !t.isSafe);
    if (captured !== -1) return { player, tokenIndex: captured };
  }
  return null;
};

const checkWin = (tokens: Token[]): boolean => {
  return tokens.every((t) => t.position === 56);
};

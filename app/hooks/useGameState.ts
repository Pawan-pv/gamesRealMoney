// hooks/useGameState.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { GameRoom, GameState, Token } from '../lib/types';

interface GameStateHook {
  gameState: GameState | null;
  isLoading: boolean;
  rollDice: () => Promise<void>;
  moveToken: (tokenIndex: number, newPosition: number) => Promise<void>;
}

const DEFAULT_GAMESTATE: GameState = {
  $id: '',
  roomId: '',
  currentPlayer: 1,
  diceValue: 1,
  moveCounts: { player1: 0, player2: 0, player3: 0, player4: 0 },
  room: {} as GameRoom,
  players: [],
  gameBoard: {
    player1: { tokens: [] },
    player2: { tokens: [] },
    player3: { tokens: [] },
    player4: { tokens: [] },
  },
  gameHistory: [],
  startedAt: '',
  updatedAt: '',
};

export const useGameState = (roomId: string): GameStateHook => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchGameState = async () => {
      try {
        // Fetch game state row
        const { data: gameStateDoc, error: gameStateError } = await supabase
          .from('game_states')
          .select('*')
          .eq('roomId', roomId)
          .single();
        if (gameStateError) throw gameStateError;

        // Fetch room data
        const { data: roomDoc, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('$id', roomId)
          .single();
        if (roomError) throw roomError;

        if (isMounted && gameStateDoc && roomDoc) {
          const room = { ...roomDoc, $id: roomDoc.$id ?? roomDoc.id };

          const fullGameState: GameState = {
            ...DEFAULT_GAMESTATE,
            ...gameStateDoc,
            room,
            players: room.players,
            $id: gameStateDoc.$id ?? roomDoc.$id ?? roomDoc.id ?? '',
            roomId: gameStateDoc.roomId ?? roomId,
            moveCounts: gameStateDoc.moveCounts ?? { player1: 0, player2: 0, player3: 0, player4: 0 },
            gameBoard: gameStateDoc.gameBoard ?? DEFAULT_GAMESTATE.gameBoard,
            gameHistory: gameStateDoc.gameHistory ?? [],
            startedAt: gameStateDoc.startedAt ?? '',
            updatedAt: gameStateDoc.updatedAt ?? '',
            currentPlayer: gameStateDoc.currentPlayer ?? 1,
            diceValue: gameStateDoc.diceValue ?? 1,
          };
          setGameState(fullGameState);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Fetch Game State Error:', error);
        if (isMounted) setIsLoading(false);
      }
    };
    fetchGameState();

    // Real-time updates
    const channel = supabase
      .channel(`game_state:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_states', filter: `roomId=eq.${roomId}` },
        async (payload) => {
          if (!payload?.new) return;

          // Optionally fetch latest room state for player updates
          const { data: roomDoc, error: roomError } = await supabase
            .from('rooms')
            .select('*')
            .eq('$id', roomId)
            .single();
          if (roomError || !roomDoc) return;
          const room = { ...roomDoc, $id: roomDoc.$id ?? roomDoc.id };

          // Set full game state (type safe)
          if (isMounted) {
            const updateState = payload.new;
            const fullGameState: GameState = {
              ...DEFAULT_GAMESTATE,
              ...updateState,
              room,
              players: room.players,
              $id: updateState.$id ?? roomDoc.$id ?? roomDoc.id ?? '',
              roomId: updateState.roomId ?? roomId,
              moveCounts: updateState.moveCounts ?? { player1: 0, player2: 0, player3: 0, player4: 0 },
              gameBoard: updateState.gameBoard ?? DEFAULT_GAMESTATE.gameBoard,
              gameHistory: updateState.gameHistory ?? [],
              startedAt: updateState.startedAt ?? '',
              updatedAt: updateState.updatedAt ?? '',
              currentPlayer: updateState.currentPlayer ?? 1,
              diceValue: updateState.diceValue ?? 1,
            };
            setGameState(fullGameState);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // ----------- ACTIONS -----------

  const rollDice = async () => {
    if (!gameState) throw new Error('Game state not loaded');
    try {
      const diceValue = Math.floor(Math.random() * 6) + 1;

      const { error } = await supabase
        .from('game_states')
        .update({
          diceValue,
          currentPlayer: getNextPlayer(gameState.currentPlayer),
          gameHistory: [
            ...(gameState.gameHistory || []),
            {
              player: gameState.currentPlayer,
              action: 'roll',
              dice: diceValue,
              timestamp: new Date().toISOString(),
            },
          ],
        })
        .eq('roomId', roomId);
      if (error) throw error;
    } catch (error) {
      console.error('Roll Dice Error:', error);
      throw error;
    }
  };

  const moveToken = async (tokenIndex: number, newPosition: number) => {
    if (!gameState) throw new Error('Game state not available');
    try {
      const playerKey = `player${gameState.currentPlayer}` as keyof GameState['gameBoard'];
      const updatedBoard = { ...gameState.gameBoard };
      const token = updatedBoard[playerKey].tokens[tokenIndex];

      if (!isValidMove(token, newPosition, gameState, gameState.diceValue)) {
        throw new Error('Invalid move');
      }

      const moveCount = gameState.moveCounts[playerKey] || 0;
      const moveLimit = gameState.room?.gameSettings.moveLimit || 10;
      if (moveCount >= moveLimit) throw new Error('Move limit reached');

      updatedBoard[playerKey].tokens[tokenIndex] = {
        ...token,
        position: newPosition,
        isHome: newPosition === 0,
        isSafe: isSafePosition(newPosition),
        color: token.color,
      };

      // Check and reset captured token if needed
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

      const { error } = await supabase
        .from('game_states')
        .update({
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
        })
        .eq('roomId', roomId);
      if (error) throw error;

      // Win check and update room if needed
      if (checkWin(updatedBoard[playerKey].tokens)) {
        const winnerId = gameState.players.find((p) => p.playerNumber === gameState.currentPlayer)?.userId;
        const { error: roomError } = await supabase
          .from('rooms')
          .update({
            status: 'completed',
            winner: winnerId,
          })
          .eq('$id', gameState.room.$id);
        if (roomError) throw roomError;
      }
    } catch (error) {
      console.error('Move Token Error:', error);
      throw error;
    }
  };

  return { gameState, rollDice, moveToken, isLoading };
};

// --- Helper functions (unchanged) ---

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

const checkWin = (tokens: Token[]): boolean => tokens.every((t) => t.position === 56);

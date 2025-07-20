// lib/types.ts

// USER
export interface User {
  $id: string;
  email: string;
  name: string;
  phone?: string;
  googleId: string;
  avatar?: string;
  wallet: {
    balance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    totalWinnings: number;
  };
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
    totalEarnings: number;
  };
  kyc: {
    status: 'pending' | 'verified' | 'rejected';
    documents: string[];
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// GAME KEYS & COLORS
export type PlayerKey = 'player1' | 'player2' | 'player3' | 'player4';
export type Color = 'red' | 'green' | 'yellow' | 'blue';

// GENERIC TOKEN FOR ALL PLAYERS
export type Token = {
  position: number;
  isHome: boolean;
  isSafe: boolean;
  color: Color;
};

// GAME ROOM
export interface GameRoom {
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
  players: Array<{
    userId: string;
    playerNumber: number;
    joinedAt: string;
    isReady: boolean;
    isBot: boolean;
  }>;
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

// GAME STATE (CORRECTED)
export interface GameState {
  $id: string;
  roomId: string;
  currentPlayer: number; // 1=Red, 2=Green, 3=Yellow, 4=Blue
  diceValue: number;
  moveCounts: Record<PlayerKey, number>;
  room: GameRoom;
  players: GameRoom['players'];
  gameBoard: Record<PlayerKey, { tokens: Token[] }>;
  gameHistory: Array<{
    player: number;
    action: 'move' | 'roll' | 'capture';
    dice?: number;
    tokenIndex?: number;
    from?: number;
    to?: number;
    timestamp: string;
  }>;
  startedAt: string;
  updatedAt: string;
}

// TRANSACTION
export interface Transaction {
  $id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'game_entry' | 'game_winning' | 'commission';
  amount: number;
  currency: 'INR' | 'USD';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod: 'stripe' | 'other';
  stripePaymentId?: string;
  gameRoomId?: string;
  description: string;
  metadata?: {
    stripeCustomerId?: string;
    paymentMethodId?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// LEADERBOARD
export interface LeaderboardEntry {
  $id: string;
  userId: string;
  username: string;
  avatar?: string;
  totalWinnings: number;
  gamesWon: number;
  winRate: number;
  rank: number;
  period: 'daily' | 'weekly' | 'monthly' | 'all-time';
  updatedAt: string;
}

// MOVE (for bots or analysis)
export interface Move {
  tokenIndex: number;
  newPosition: number;
  priority: number;
}

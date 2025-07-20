
import { createContext, useContext, useState } from 'react';
import { ENTRY_FEES } from '../constants/fees';
import { User } from '../lib/types';

interface GameContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  entryFee: keyof typeof ENTRY_FEES | null;
  setEntryFee: (fee: keyof typeof ENTRY_FEES) => void;
  playerColor: string | null;
  setPlayerColor: (color: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [entryFee, setEntryFee] = useState<keyof typeof ENTRY_FEES | null>(null);
  const [playerColor, setPlayerColor] = useState<string | null>(null);

  return (
    <GameContext.Provider value={{ user, setUser, entryFee, setEntryFee, playerColor, setPlayerColor }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};
// app/constants/fees.ts
export const ENTRY_FEES = {
  micro: 2,
  beginner: 5,
  amateur: 10,
  pro: 25,
  expert: 50,
  master: 100,
  elite: 250,
  legend: 500,
  champion: 1000,
  ultimate: 5000,
} as const;

export const COMMISSION_RATE = 0.05; // 5% platform commission

export const calculatePrizePool = (
  entryFee: number,
  playerCount: number
): {
  totalPool: number;
  commission: number;
  prizePool: number;
  winnerAmount: number;
  runnerUpAmount: number;
} => {
  const totalPool = entryFee * playerCount;
  const commission = totalPool * COMMISSION_RATE;
  const prizePool = totalPool - commission;

  return {
    totalPool,
    commission,
    prizePool,
    winnerAmount: prizePool * 0.8,
    runnerUpAmount: prizePool * 0.2,
  };
};
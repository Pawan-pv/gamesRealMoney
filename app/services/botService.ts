// import { GameState, Move, Token } from '../lib/types';

// export class BotService {
//   static makeMove(gameState: GameState, playerNumber: number): Move | null {
//     const availableMoves = this.getAvailableMoves(gameState, playerNumber);

//     if (!availableMoves.length) return null;

//     return availableMoves.reduce((best, current) =>
//       current.priority > best.priority ? current : best
//     );
//   }

//   private static getAvailableMoves(gameState: GameState, playerNumber: number): Move[] {
//     const moves: Move[] = [];
//     const playerKey = `player${playerNumber}` as keyof GameState['gameBoard'];
//     const tokens = gameState.gameBoard[playerKey].tokens;
//     const diceValue = gameState.diceValue;

//     tokens.forEach((token, index) => {
//       if (this.isValidMove(token, diceValue, gameState)) {
//         const newPosition = token.position + diceValue;
//         let priority = 0;

//         if (this.isCaptureMove(newPosition, gameState)) priority += 100;
//         if (this.isSafePosition(newPosition)) priority += 50;
//         if (this.isTowardsFinish(newPosition)) priority += 25;
//         if (token.isHome && diceValue === 6) priority += 10;

//         moves.push({ tokenIndex: index, newPosition, priority });
//       }
//     });

//     return moves;
//   }

//   private static isValidMove(token: Token, diceValue: number, gameState: GameState): boolean {
//     const newPosition = token.position + diceValue;
//     return newPosition >= 0 && newPosition <= 56 && (!token.isHome || diceValue === 6);
//   }

//   private static isCaptureMove(newPosition: number, gameState: GameState): boolean {
//     return !!this.checkCapture(newPosition, gameState);
//   }

//   private static isSafePosition(position: number): boolean {
//     const safePositions = [0, 1, 9, 14, 22, 27, 35, 40, 48];
//     return safePositions.includes(position);
//   }

//   private static isTowardsFinish(position: number): boolean {
//     return position > 50;
//   }

//   private static checkCapture(newPosition: number, gameState: GameState): { player: number; tokenIndex: number } | null {
//     const players = [1, 2, 3, 4].filter((p) => p !== gameState.currentPlayer);
//     for (const player of players) {
//       const playerKey = `player${player}` as keyof GameState['gameBoard'];
//       const tokens = gameState.gameBoard[playerKey].tokens;
//       const captured = tokens.findIndex((t) => t.position === newPosition && !t.isSafe);
//       if (captured !== -1) return { player, tokenIndex: captured };
//     }
//     return null;
//   }
// }

import { GameState, Move, Token } from '../lib/types';

export class BotService {
  static makeMove(gameState: GameState, playerNumber: number): Move | null {
    const availableMoves = this.getAvailableMoves(gameState, playerNumber);

    if (!availableMoves.length) return null;

    return availableMoves.reduce((best, current) =>
      current.priority > best.priority ? current : best
    );
  }

  private static getAvailableMoves(gameState: GameState, playerNumber: number): Move[] {
    const moves: Move[] = [];
    const playerKey = `player${playerNumber}` as keyof GameState['gameBoard'];
    const tokens = gameState.gameBoard[playerKey].tokens;
    const diceValue = gameState.diceValue;

    tokens.forEach((token, index) => {
      if (this.isValidMove(token, diceValue, gameState)) {
        const newPosition = token.position + diceValue;
        let priority = 0;

        if (this.isCaptureMove(newPosition, gameState)) priority += 100;
        if (this.isSafePosition(newPosition)) priority += 50;
        if (this.isTowardsFinish(newPosition)) priority += 25;
        if (token.isHome && diceValue === 6) priority += 10;

        moves.push({ tokenIndex: index, newPosition, priority });
      }
    });

    return moves;
  }

  private static isValidMove(token: Token, diceValue: number, gameState: GameState): boolean {
    const newPosition = token.position + diceValue;
    return newPosition >= 0 && newPosition <= 56 && (!token.isHome || diceValue === 6);
  }

  private static isCaptureMove(newPosition: number, gameState: GameState): boolean {
    return !!this.checkCapture(newPosition, gameState);
  }

  private static isSafePosition(position: number): boolean {
    const safePositions = [0, 1, 9, 14, 22, 27, 35, 40, 48];
    return safePositions.includes(position);
  }

  private static isTowardsFinish(position: number): boolean {
    return position > 50;
  }

  private static checkCapture(newPosition: number, gameState: GameState): { player: number; tokenIndex: number } | null {
    const players = [1, 2, 3, 4].filter((p) => p !== gameState.currentPlayer);
    for (const player of players) {
      const playerKey = `player${player}` as keyof GameState['gameBoard'];
      const tokens = gameState.gameBoard[playerKey].tokens;
      const captured = tokens.findIndex((t) => t.position === newPosition && !t.isSafe);
      if (captured !== -1) return { player, tokenIndex: captured };
    }
    return null;
  }
}
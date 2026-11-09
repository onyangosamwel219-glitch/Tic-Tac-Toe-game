import { BoardState, PlayerMark, AiDifficulty } from '../types/game';

export const WINNING_COMBINATIONS = [
  [0, 1, 2], // Row 1
  [3, 4, 5], // Row 2
  [6, 7, 8], // Row 3
  [0, 3, 6], // Col 1
  [1, 4, 7], // Col 2
  [2, 5, 8], // Col 3
  [0, 4, 8], // Diagonal 1
  [2, 4, 6], // Diagonal 2
];

export function checkBoardWinner(board: BoardState): { 
  winner: 'X' | 'O' | 'draw' | null; 
  line: number[] | null 
} {
  for (const combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: combo };
    }
  }

  const isFull = board.every((cell) => cell !== null);
  if (isFull) {
    return { winner: 'draw', line: null };
  }

  return { winner: null, line: null };
}

export function getAvailableCells(board: BoardState): number[] {
  const cells: number[] = [];
  board.forEach((cell, idx) => {
    if (cell === null) cells.push(idx);
  });
  return cells;
}

/**
 * Classic Minimax algorithm implementation for Tic-Tac-Toe
 * Pure deterministic minimax tree search with depth-penalty.
 */
function minimax(
  board: BoardState,
  depth: number,
  isMaximizing: boolean,
  aiMark: PlayerMark,
  humanMark: PlayerMark
): { score: number; move?: number } {
  const result = checkBoardWinner(board);

  if (result.winner === aiMark) {
    return { score: 10 - depth };
  }
  if (result.winner === humanMark) {
    return { score: depth - 10 };
  }
  if (result.winner === 'draw') {
    return { score: 0 };
  }

  const available = getAvailableCells(board);

  if (isMaximizing) {
    let bestScore = -Infinity;
    let bestMove = available[0];

    for (const move of available) {
      board[move] = aiMark;
      const evalResult = minimax(board, depth + 1, false, aiMark, humanMark);
      board[move] = null; // backtrack

      if (evalResult.score > bestScore) {
        bestScore = evalResult.score;
        bestMove = move;
      }
    }

    return { score: bestScore, move: bestMove };
  } else {
    let bestScore = Infinity;
    let bestMove = available[0];

    for (const move of available) {
      board[move] = humanMark;
      const evalResult = minimax(board, depth + 1, true, aiMark, humanMark);
      board[move] = null; // backtrack

      if (evalResult.score < bestScore) {
        bestScore = evalResult.score;
        bestMove = move;
      }
    }

    return { score: bestScore, move: bestMove };
  }
}

/**
 * Computes AI move based on selected difficulty
 */
export function calculateAiMove(
  board: BoardState,
  aiMark: PlayerMark = 'O',
  difficulty: AiDifficulty = 'hard'
): number {
  const available = getAvailableCells(board);
  if (available.length === 0) return -1;

  const humanMark: PlayerMark = aiMark === 'X' ? 'O' : 'X';

  // Fast first move optimization if board is mostly empty
  if (available.length === 9) {
    // Take center or random corner
    const choices = [4, 0, 2, 6, 8];
    return choices[Math.floor(Math.random() * choices.length)];
  }

  if (available.length === 8 && board[4] === null) {
    // If center is free, 80% grab center
    if (Math.random() < 0.8) return 4;
  }

  // 1. Easy mode: casual, occasional random moves
  if (difficulty === 'easy') {
    // 50% random, 50% basic tactic (block or win if obvious)
    if (Math.random() < 0.5) {
      return available[Math.floor(Math.random() * available.length)];
    }
  }

  // 2. Medium mode: 30% heuristic, 70% minimax
  if (difficulty === 'medium') {
    // Check if AI can win immediately
    for (const move of available) {
      board[move] = aiMark;
      const res = checkBoardWinner(board);
      board[move] = null;
      if (res.winner === aiMark) return move;
    }

    // Check if human can win immediately, block it
    for (const move of available) {
      board[move] = humanMark;
      const res = checkBoardWinner(board);
      board[move] = null;
      if (res.winner === humanMark) return move;
    }

    // 30% chance of random available move instead of optimal
    if (Math.random() < 0.3) {
      return available[Math.floor(Math.random() * available.length)];
    }
  }

  // 3. Hard mode / Fallback: Full Unbeatable Minimax
  const optimal = minimax(board, 0, true, aiMark, humanMark);
  return optimal.move ?? available[0];
}

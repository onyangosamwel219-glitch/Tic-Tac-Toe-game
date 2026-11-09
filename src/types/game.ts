export type PlayerMark = 'X' | 'O';
export type BoardCell = PlayerMark | null;
export type BoardState = BoardCell[]; // Length 9

export type GameMode = 'ai' | 'pvp';
export type AiDifficulty = 'easy' | 'medium' | 'hard';
export type GameStatus = 'waiting' | 'in_progress' | 'completed' | 'abandoned';
export type GameWinner = 'X' | 'O' | 'draw' | 'none' | null;

export interface UserProfile {
  uid: string;
  email?: string | null;
  displayName: string;
  photoURL?: string | null;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesTied: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GamePlayer {
  id: string;
  name: string;
  photoURL?: string | null;
  isAi?: boolean;
}

export interface GameDoc {
  id: string;
  shortCode: string;
  mode: GameMode;
  aiDifficulty?: AiDifficulty;
  status: GameStatus;
  playerXId: string;
  playerXName: string;
  playerXPhoto?: string | null;
  playerOId?: string | null;
  playerOName?: string | null;
  playerOPhoto?: string | null;
  playerOIsAi?: boolean;
  currentTurn: PlayerMark;
  winner: GameWinner;
  winningLine?: number[] | null;
  turnCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GameEvent {
  id: string;
  gameId: string;
  type: 'MOVE' | 'ROLLBACK';
  turnIndex: number;
  player: PlayerMark;
  playerId: string;
  position: number; // 0..8
  targetTurnIndex?: number;
  createdAt: string;
}

export interface TurnSnapshot {
  turnIndex: number;
  board: BoardState;
  nextTurn: PlayerMark;
  lastMove?: {
    player: PlayerMark;
    position: number;
    playerId: string;
    timestamp: string;
  };
  winner: GameWinner;
  winningLine: number[] | null;
}

export interface ReconstructedState {
  board: BoardState;
  currentTurn: PlayerMark;
  winner: GameWinner;
  winningLine: number[] | null;
  isGameOver: boolean;
  moveEvents: GameEvent[];
  snapshots: TurnSnapshot[];
  totalTurns: number;
}

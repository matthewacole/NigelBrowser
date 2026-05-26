import type { BoardSquare } from './BoardSquare';
import type { Player } from './Player';
import type { Tile } from './Tile';
import { createStandardBoard } from './BoardSquare';
import { TileBag } from '../engine/TileBag';

export type GamePhase = 'setup' | 'playing' | 'gameOver';

export type TurnActionRecord =
  | { type: 'play'; word: string; score: number }
  | { type: 'exchange'; tileCount: number }
  | { type: 'pass' };

export interface RecordedMove {
  playerIndex: number;
  action: TurnActionRecord;
  scoreGained: number;
  turnNumber: number;
}

export interface AnalyzedMove {
  word: string;
  score: number;
}

export interface GameState {
  board: BoardSquare[][];
  players: Player[];
  currentPlayerIndex: number;
  bag: TileBag;
  moveHistory: RecordedMove[];
  boardSnapshots: BoardSquare[][][];
  phase: GamePhase;
  turnNumber: number;
}

export function createInitialGameState(): GameState {
  return {
    board: createStandardBoard(),
    players: [],
    currentPlayerIndex: 0,
    bag: new TileBag(),
    moveHistory: [],
    boardSnapshots: [],
    phase: 'setup',
    turnNumber: 0,
  };
}

export function getCurrentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

export function getIsFirstMove(state: GameState): boolean {
  return state.board[7][7].tile === null;
}

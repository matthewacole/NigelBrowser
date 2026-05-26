import type { BonusType } from './Constants';
import { bonusTypeFor } from './Constants';
import type { Tile } from './Tile';

export interface BoardSquare {
  id: string;
  row: number;
  col: number;
  bonus: BonusType;
  tile: Tile | null;
}

export function createBoardSquare(row: number, col: number, tile?: Tile): BoardSquare {
  return {
    id: `cell-${row}-${col}`,
    row,
    col,
    bonus: bonusTypeFor(row, col),
    tile: tile ?? null,
  };
}

export function createStandardBoard(): BoardSquare[][] {
  const board: BoardSquare[][] = [];
  for (let row = 0; row < 15; row++) {
    const rowSquares: BoardSquare[] = [];
    for (let col = 0; col < 15; col++) {
      rowSquares.push(createBoardSquare(row, col));
    }
    board.push(rowSquares);
  }
  return board;
}

export function cloneBoard(board: BoardSquare[][]): BoardSquare[][] {
  return board.map(row => row.map(sq => ({ ...sq, tile: sq.tile ? { ...sq.tile } : null })));
}

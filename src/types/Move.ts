import type { Tile } from './Tile';

export type MoveDirection = 'horizontal' | 'vertical';

export interface PlacedTile {
  tile: Tile;
  row: number;
  col: number;
}

export interface Move {
  tiles: PlacedTile[];
  direction: MoveDirection;
  score: number;
  wordsFormed: string[];
  isBingo: boolean;
  startRow: number;
  startCol: number;
  tileCount: number;
}

export function createMove(
  tiles: PlacedTile[],
  direction: MoveDirection,
  score: number,
  wordsFormed: string[],
  isBingo: boolean
): Move {
  return {
    tiles,
    direction,
    score,
    wordsFormed,
    isBingo,
    startRow: Math.min(...tiles.map(t => t.row)),
    startCol: Math.min(...tiles.map(t => t.col)),
    tileCount: tiles.length,
  };
}

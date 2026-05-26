import { TILE_DISTRIBUTION } from './Constants';

export interface Tile {
  id: string;
  letter: string;
  score: number;
}

export function createTile(letter: string, id?: string): Tile {
  return {
    id: id ?? crypto.randomUUID(),
    letter: letter.toUpperCase(),
    score: TILE_DISTRIBUTION[letter.toUpperCase()]?.score ?? 0,
  };
}

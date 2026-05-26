import type { Tile } from '../types/Tile';
import { createTile } from '../types/Tile';
import { TILE_DISTRIBUTION } from '../types/Constants';

export class TileBag {
  private _tiles: Tile[];

  constructor(tiles?: Tile[]) {
    if (tiles) {
      this._tiles = tiles;
    } else {
      const all: Tile[] = [];
      for (const [letter, info] of Object.entries(TILE_DISTRIBUTION)) {
        for (let i = 0; i < info.count; i++) {
          all.push(createTile(letter));
        }
      }
      this._tiles = shuffleArray(all);
    }
  }

  get tiles(): readonly Tile[] {
    return this._tiles;
  }

  get isEmpty(): boolean {
    return this._tiles.length === 0;
  }

  get count(): number {
    return this._tiles.length;
  }

  draw(count: number): Tile[] {
    const n = Math.min(count, this._tiles.length);
    const drawn = this._tiles.slice(0, n);
    this._tiles = this._tiles.slice(n);
    return drawn;
  }

  returnTiles(tiles: Tile[]): void {
    this._tiles.push(...tiles);
    this._tiles = shuffleArray(this._tiles);
  }

  toJSON(): Tile[] {
    return this._tiles;
  }

  static fromJSON(tiles: Tile[]): TileBag {
    return new TileBag(tiles);
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

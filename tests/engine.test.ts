import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createStandardBoard } from '../src/types/BoardSquare';
import { TileBag } from '../src/engine/TileBag';
import { validatePlacement, calculateScore } from '../src/engine/GameEngine';
import { wordValidator } from '../src/engine/WordValidator';
import { BOARD_SIZE, STARTING_SQUARE, BINGO_BONUS } from '../src/types/Constants';
import type { BoardSquare } from '../src/types/BoardSquare';
import type { Tile } from '../src/types/Tile';
import type { PlacedTile } from '../src/types/Move';

function makeTile(letter: string): Tile {
  const scores: Record<string, number> = {
    A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10
  };
  return { id: crypto.randomUUID(), letter: letter.toUpperCase(), score: scores[letter.toUpperCase()] || 0 };
}

function placeOnBoard(board: BoardSquare[][], row: number, col: number, letter: string): BoardSquare[][] {
  board[row][col] = { ...board[row][col], tile: makeTile(letter) };
  return board;
}

function getPlacedTile(board: BoardSquare[][], row: number, col: number): PlacedTile {
  return { tile: board[row][col].tile!, row, col };
}

describe('Scrabble Rules', () => {
  let board: BoardSquare[][];
  let tiles: Tile[];

  beforeAll(() => {
    wordValidator.loadWords(['HELLO', 'WORLD', 'HI', 'CAT', 'DOG', 'HE', 'OW', 'LO', 'OR', 'NO', 'ON', 'IT', 'AT', 'TO', 'FOR', 'AX', 'AXE', 'OX', 'EXIT', 'TEST', 'BEST', 'REST', 'WEST', 'EAST', 'NOTE', 'BONE', 'CONE', 'ZONE', 'ALONE', 'BALL', 'CALL', 'FALL', 'TALL', 'WALL', 'BAT', 'BAL', 'BALD', 'BALE', 'BALLS', 'BALLOT', 'BALLOON', 'BALSA', 'BAN', 'BANE', 'BANG', 'BANK', 'BANS', 'BANAL'].map(w => w.toUpperCase()));
  });

  beforeEach(() => {
    board = createStandardBoard();
  });

  it('first move must cover center square', () => {
    const tile = makeTile('H');
    const placed: PlacedTile[] = [{ tile, row: 0, col: 0 }];
    const result = validatePlacement(placed, board);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('center');
  });

  it('first move on center square is valid (single tile is a word)', () => {
    const tile = makeTile('A');
    const placed: PlacedTile[] = [{ tile, row: STARTING_SQUARE.row, col: STARTING_SQUARE.col }];
    const result = validatePlacement(placed, board);
    expect(result.valid).toBe(true);
  });

  it('places tiles must be in a single row or column', () => {
    const a = makeTile('A');
    const b = makeTile('B');
    const placed: PlacedTile[] = [
      { tile: a, row: STARTING_SQUARE.row, col: STARTING_SQUARE.col },
      { tile: b, row: STARTING_SQUARE.row + 1, col: STARTING_SQUARE.col + 1 },
    ];
    const result = validatePlacement(placed, board);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('row or column');
  });

  it('horizontal placement is valid', () => {
    const a = makeTile('H');
    const b = makeTile('I');
    const placed: PlacedTile[] = [
      { tile: a, row: 7, col: 7 },
      { tile: b, row: 7, col: 8 },
    ];
    const result = validatePlacement(placed, board);
    expect(result.valid).toBe(true);
  });

  it('vertical placement is valid', () => {
    const a = makeTile('H');
    const b = makeTile('I');
    const placed: PlacedTile[] = [
      { tile: a, row: 7, col: 7 },
      { tile: b, row: 8, col: 7 },
    ];
    const result = validatePlacement(placed, board);
    expect(result.valid).toBe(true);
  });

  it('gaps are not allowed in a word', () => {
    const a = makeTile('H');
    const b = makeTile('I');
    const placed: PlacedTile[] = [
      { tile: a, row: 7, col: 7 },
      { tile: b, row: 7, col: 9 },
    ];
    const result = validatePlacement(placed, board);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Gap');
  });

  it('non-first move must connect to existing tiles', () => {
    placeOnBoard(board, 7, 7, 'H');
    placeOnBoard(board, 7, 8, 'I');
    const tile = makeTile('A');
    const placed: PlacedTile[] = [{ tile, row: 3, col: 3 }];
    const result = validatePlacement(placed, board);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('connect');
  });

  it('tiles can extend an existing word horizontally', () => {
    placeOnBoard(board, 7, 7, 'H');
    placeOnBoard(board, 7, 8, 'I');
    const tile = makeTile('T');
    const placed: PlacedTile[] = [{ tile, row: 7, col: 6 }];
    const result = validatePlacement(placed, board);
    expect(result.valid).toBe(true);
  });

  it('tiles can extend an existing word vertically', () => {
    placeOnBoard(board, 7, 7, 'H');
    placeOnBoard(board, 8, 7, 'I');
    const tile = makeTile('T');
    const placed: PlacedTile[] = [{ tile, row: 6, col: 7 }];
    const result = validatePlacement(placed, board);
    expect(result.valid).toBe(true);
  });

  it('no tiles placed returns invalid', () => {
    const result = validatePlacement([], board);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No tiles');
  });

  it('board boundary: tiles must be within 0-14', () => {
    const tile = makeTile('A');
    const placed: PlacedTile[] = [{ tile, row: 15, col: 7 }];
    const result = validatePlacement(placed, board);
    expect(result.valid).toBe(false);
  });
});

describe('Score Calculation', () => {
  let board: BoardSquare[][];

  beforeEach(() => {
    board = createStandardBoard();
  });

  it('scores a word on non-bonus squares', () => {
    placeOnBoard(board, 7, 7, 'H');
    placeOnBoard(board, 7, 8, 'I');
    const placed: PlacedTile[] = [
      { tile: makeTile('T'), row: 10, col: 2 },
      { tile: makeTile('O'), row: 10, col: 3 },
    ];
    const result = calculateScore(placed, 'horizontal', board);
    expect(result.words[0].word).toBe('TO');
  });

  it('center square gives double word bonus on first move', () => {
    const placed: PlacedTile[] = [
      { tile: makeTile('H'), row: 7, col: 7 },
      { tile: makeTile('I'), row: 7, col: 8 },
    ];
    const result = calculateScore(placed, 'horizontal', board);
    expect(result.score).toBe((4 + 1) * 2);
  });

  it('bingo bonus adds 50 points for using 7 tiles', () => {
    const letters = ['B', 'A', 'L', 'L', 'O', 'O', 'N'];
    const placed: PlacedTile[] = letters.map((l, i) => ({
      tile: makeTile(l), row: 7, col: 7 + i
    }));
    const result = calculateScore(placed, 'horizontal', board);
    expect(result.isBingo).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(50);
  });

  it('scores multiple cross words', () => {
    placeOnBoard(board, 8, 7, 'A');
    const placed: PlacedTile[] = [
      { tile: makeTile('B'), row: 7, col: 7 },
      { tile: makeTile('E'), row: 7, col: 8 },
      { tile: makeTile('T'), row: 7, col: 9 },
    ];
    const result = calculateScore(placed, 'horizontal', board);
    expect(result.score).toBeGreaterThan(0);
    expect(result.words.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Tile Distribution', () => {
  it('bag contains 98 tiles with correct distribution', () => {
    const bag = new TileBag();
    expect(bag.count).toBe(98);
    const counts: Record<string, number> = {};
    for (const t of bag.tiles) {
      counts[t.letter] = (counts[t.letter] || 0) + 1;
    }
    expect(counts['A']).toBe(9);
    expect(counts['B']).toBe(2);
    expect(counts['Q']).toBe(1);
    expect(counts['Z']).toBe(1);
    expect(counts['E']).toBe(12);
  });

  it('drawing 7 tiles reduces bag count', () => {
    const bag = new TileBag();
    const drawn = bag.draw(7);
    expect(drawn.length).toBe(7);
    expect(bag.count).toBe(91);
  });

  it('drawing from empty bag returns empty array', () => {
    const bag = new TileBag([]);
    expect(bag.draw(5)).toEqual([]);
    expect(bag.isEmpty).toBe(true);
  });

  it('return tiles to bag increases count', () => {
    const bag = new TileBag();
    const drawn = bag.draw(3);
    bag.returnTiles(drawn);
    expect(bag.count).toBe(98);
  });

  it('no blank tiles in distribution', () => {
    const bag = new TileBag();
    const hasBlank = bag.tiles.some(t => t.letter === ' ' || t.letter === '_');
    expect(hasBlank).toBe(false);
  });
});

describe('Board Creation', () => {
  it('creates a 15x15 board', () => {
    const board = createStandardBoard();
    expect(board.length).toBe(15);
    expect(board[0].length).toBe(15);
  });

  it('center square (7,7) has center bonus', () => {
    const board = createStandardBoard();
    expect(board[7][7].bonus).toBe('center');
  });

  it('all squares have unique IDs', () => {
    const board = createStandardBoard();
    const ids = board.flat().map(s => s.id);
    expect(new Set(ids).size).toBe(225);
  });
});

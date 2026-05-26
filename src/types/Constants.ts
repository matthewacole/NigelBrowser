export const BOARD_SIZE = 15;
export const RACK_SIZE = 7;
export const TOTAL_TILES = 98;
export const BINGO_BONUS = 50;
export const MAX_PLAYERS = 4;

export const STARTING_SQUARE = { row: 7, col: 7 };

export function bonusTypeFor(row: number, col: number): BonusType {
  const r = row, c = col;
  if (r === 7 && c === 7) return 'center';

  const tripleWord: Set<string> = new Set([
    "0,0", "0,7", "0,14", "7,0", "7,14", "14,0", "14,7", "14,14"
  ]);
  if (tripleWord.has(`${r},${c}`)) return 'tripleWord';

  const doubleWord: Set<string> = new Set([
    "1,1", "2,2", "3,3", "4,4", "10,10", "11,11", "12,12", "13,13",
    "1,13", "2,12", "3,11", "4,10", "10,4", "11,3", "12,2", "13,1"
  ]);
  if (doubleWord.has(`${r},${c}`)) return 'doubleWord';

  const tripleLetter: Set<string> = new Set([
    "1,5", "1,9", "5,1", "5,5", "5,9", "5,13",
    "9,1", "9,5", "9,9", "9,13", "13,5", "13,9"
  ]);
  if (tripleLetter.has(`${r},${c}`)) return 'tripleLetter';

  const doubleLetter: Set<string> = new Set([
    "0,3", "0,11", "2,6", "2,8", "3,0", "3,7", "3,14",
    "6,2", "6,6", "6,8", "6,12", "7,3", "7,11",
    "8,2", "8,6", "8,8", "8,12", "11,0", "11,7", "11,14",
    "12,6", "12,8", "14,3", "14,11"
  ]);
  if (doubleLetter.has(`${r},${c}`)) return 'doubleLetter';

  return 'normal';
}

export type BonusType = 'normal' | 'doubleLetter' | 'doubleWord' | 'tripleLetter' | 'tripleWord' | 'center';

export function bonusDisplayText(bonus: BonusType): string {
  switch (bonus) {
    case 'normal': return '';
    case 'doubleLetter': return 'DL';
    case 'doubleWord': return 'DW';
    case 'tripleLetter': return 'TL';
    case 'tripleWord': return 'TW';
    case 'center': return '★';
  }
}

export function bonusScoreMultiplier(bonus: BonusType): { letter: number; word: number } {
  switch (bonus) {
    case 'normal': return { letter: 1, word: 1 };
    case 'doubleLetter': return { letter: 2, word: 1 };
    case 'doubleWord': return { letter: 1, word: 2 };
    case 'tripleLetter': return { letter: 3, word: 1 };
    case 'tripleWord': return { letter: 1, word: 3 };
    case 'center': return { letter: 1, word: 2 };
  }
}

export const TILE_DISTRIBUTION: Record<string, { count: number; score: number }> = {
  A: { count: 9, score: 1 },  B: { count: 2, score: 3 },  C: { count: 2, score: 3 },
  D: { count: 4, score: 2 },  E: { count: 12, score: 1 }, F: { count: 2, score: 4 },
  G: { count: 3, score: 2 },  H: { count: 2, score: 4 },  I: { count: 9, score: 1 },
  J: { count: 1, score: 8 },  K: { count: 1, score: 5 },  L: { count: 4, score: 1 },
  M: { count: 2, score: 3 },  N: { count: 6, score: 1 },  O: { count: 8, score: 1 },
  P: { count: 2, score: 3 },  Q: { count: 1, score: 10 }, R: { count: 6, score: 1 },
  S: { count: 4, score: 1 },  T: { count: 6, score: 1 },  U: { count: 4, score: 1 },
  V: { count: 2, score: 4 },  W: { count: 2, score: 4 },  X: { count: 1, score: 8 },
  Y: { count: 2, score: 4 },  Z: { count: 1, score: 10 },
};

export const ALL_LETTERS = Object.keys(TILE_DISTRIBUTION);

import type { Tile } from './Tile';

export type PlayerType = 'human' | 'computer';
export type Difficulty = 'beginner' | 'intermediate' | 'expert';

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  difficulty: Difficulty | null;
  score: number;
  rack: Tile[];
  consecutivePasses: number;
}

export function createPlayer(name: string, type: PlayerType, difficulty?: Difficulty): Player {
  return {
    id: crypto.randomUUID(),
    name,
    type,
    difficulty: difficulty ?? null,
    score: 0,
    rack: [],
    consecutivePasses: 0,
  };
}

export function difficultyDisplayName(d: Difficulty): string {
  switch (d) {
    case 'beginner': return 'Beginner';
    case 'intermediate': return 'Intermediate';
    case 'expert': return 'Expert';
  }
}

export function difficultyAiName(d: Difficulty): string {
  switch (d) {
    case 'beginner': return 'Beginner Bob';
    case 'intermediate': return 'Intermediate Ivy';
    case 'expert': return 'Expert Nigel';
  }
}

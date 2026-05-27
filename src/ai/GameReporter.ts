import type { AppState } from '../state/gameReducer';
import { TILE_DISTRIBUTION } from '../types/Constants';

export const TOTAL_TILES = Object.values(TILE_DISTRIBUTION).reduce((sum, info) => sum + info.count, 0);

export interface TurnRecord {
  turnNumber: number;
  playerIndex: number;
  action: 'play' | 'pass' | 'exchange';
  word: string;
  score: number;
  isBingo: boolean;
}

export interface PlayerReport {
  name: string;
  difficulty: string;
  score: number;
  wordsPlayed: string[];
  bingos: number;
  avgWordScore: number;
  rackAtEnd: string[];
}

export interface GameReport {
  players: PlayerReport[];
  turns: TurnRecord[];
  totalTurns: number;
  highestScoringWord: { word: string; score: number; player: string };
  longestWord: string;
  totalBingos: number;
  bingoBreakdown: { player: string; words: string[] }[];
  bagUsagePercent: number;
}

export interface BatchResult {
  games: GameReport[];
  totalGames: number;
  winCounts: Record<string, number>;
  avgScores: Record<string, number>;
  avgTurnsPerGame: number;
  avgBingosPerGame: number;
  avgScorePerGame: number;
  avgBagUsage: number;
}

export function generateReport(state: AppState, turnRecords: TurnRecord[]): GameReport {
  const game = state.game;
  const players: PlayerReport[] = game.players.map((p, i) => {
    const playerTurns = turnRecords.filter(t => t.playerIndex === i && t.action === 'play');
    const wordsPlayed = playerTurns.map(t => t.word);
    const bingos = playerTurns.filter(t => t.isBingo).length;
    const avgWordScore = playerTurns.length > 0
      ? Math.round(playerTurns.reduce((s, t) => s + t.score, 0) / playerTurns.length)
      : 0;
    return {
      name: p.name,
      difficulty: p.difficulty ?? 'human',
      score: p.score,
      wordsPlayed,
      bingos,
      avgWordScore,
      rackAtEnd: p.rack.map(t => t.letter),
    };
  });

  const allPlayTurns = turnRecords.filter(t => t.action === 'play');
  const highestScoringWord = allPlayTurns.reduce(
    (best, t) => (t.score > best.score ? { word: t.word, score: t.score, player: game.players[t.playerIndex]?.name ?? '' } : best),
    { word: '', score: 0, player: '' }
  );
  const longestWord = allPlayTurns.reduce(
    (longest, t) => (t.word.length > longest.length ? t.word : longest),
    ''
  );

  const totalBingos = allPlayTurns.filter(t => t.isBingo).length;
  const bingoBreakdown: Record<string, string[]> = {};
  for (const t of allPlayTurns) {
    if (t.isBingo) {
      const name = game.players[t.playerIndex]?.name ?? '';
      if (!bingoBreakdown[name]) bingoBreakdown[name] = [];
      bingoBreakdown[name].push(t.word);
    }
  }

  const tilesUsed = TOTAL_TILES - game.bag.count;
  const bagUsagePercent = Math.round((tilesUsed / TOTAL_TILES) * 100);

  return {
    players,
    turns: turnRecords,
    totalTurns: turnRecords.length,
    highestScoringWord,
    longestWord,
    totalBingos,
    bingoBreakdown: Object.entries(bingoBreakdown).map(([player, words]) => ({ player, words })),
    bagUsagePercent,
  };
}

export function aggregateBatch(reports: GameReport[]): BatchResult {
  const winCounts: Record<string, number> = {};
  const totalScores: Record<string, number> = {};
  let totalTurns = 0;
  let totalBingos = 0;
  let totalScoreSum = 0;
  let totalBagUsage = 0;

  for (const report of reports) {
    const winner = report.players.reduce(
      (best, p) => (p.score > best.score ? p : best),
      { name: '', score: -1, difficulty: '', wordsPlayed: [], bingos: 0, avgWordScore: 0, rackAtEnd: [] }
    );
    winCounts[winner.name] = (winCounts[winner.name] ?? 0) + 1;

    for (const p of report.players) {
      totalScores[p.name] = (totalScores[p.name] ?? 0) + p.score;
    }

    totalTurns += report.totalTurns;
    totalBingos += report.totalBingos;
    totalBagUsage += report.bagUsagePercent;
    for (const p of report.players) {
      totalScoreSum += p.score;
    }
  }

  const avgScores: Record<string, number> = {};
  for (const [name, total] of Object.entries(totalScores)) {
    avgScores[name] = Math.round(total / reports.length);
  }

  return {
    games: reports,
    totalGames: reports.length,
    winCounts,
    avgScores,
    avgTurnsPerGame: Math.round(totalTurns / reports.length),
    avgBingosPerGame: Math.round(totalBingos / reports.length * 10) / 10,
    avgScorePerGame: Math.round(totalScoreSum / reports.length),
    avgBagUsage: Math.round(totalBagUsage / reports.length),
  };
}

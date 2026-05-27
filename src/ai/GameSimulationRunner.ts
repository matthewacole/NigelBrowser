import { gameReducer, initialAppState, type AppState, type GameAction } from '../state/gameReducer';
import type { Player } from '../types/Player';
import type { Move } from '../types/Move';
import { solverManager } from '../solver/SolverManager';
import type { GameReport, TurnRecord } from './GameReporter';

export type Speed = 'instant' | 'fast' | 'normal' | 'slow';

export const SPEED_MS: Record<Speed, number> = {
  instant: 0,
  fast: 100,
  normal: 500,
  slow: 2000,
};

export interface SimulationCallbacks {
  onStateChange?: (state: AppState) => void;
  onTurn?: (turn: TurnRecord) => void;
  onAIThinking?: (playerIndex: number) => void;
  onAIMove?: (move: Move) => void;
  onError?: (error: string) => void;
  onComplete?: (report: GameReport) => void;
}

export class GameSimulationRunner {
  private state: AppState;
  private callbacks: SimulationCallbacks;
  private _isRunning = false;
  private _isPaused = false;
  private _aborted = false;
  private speed: Speed = 'normal';
  private turnCount = 0;
  private turnRecords: TurnRecord[] = [];

  constructor(callbacks: SimulationCallbacks = {}) {
    this.state = initialAppState;
    this.callbacks = callbacks;
  }

  get isRunning(): boolean { return this._isRunning; }
  get isPaused(): boolean { return this._isPaused; }
  get currentState(): AppState { return this.state; }
  get currentTurnRecords(): TurnRecord[] { return this.turnRecords; }

  setSpeed(speed: Speed): void {
    this.speed = speed;
  }

  pause(): void {
    this._isPaused = true;
  }

  resume(): void {
    this._isPaused = false;
  }

  abort(): void {
    this._aborted = true;
    this._isRunning = false;
    this._isPaused = false;
  }

  private dispatch(action: GameAction): void {
    this.state = gameReducer(this.state, action);
  }

  initialize(players: Player[]): void {
    this.dispatch({ type: 'NEW_GAME', players });
    this.turnRecords = [];
    this.turnCount = 0;
    this._aborted = false;
    this._isRunning = false;
    this._isPaused = false;
    this.callbacks.onStateChange?.(this.state);
  }

  async runSingleTurn(): Promise<boolean> {
    if (this.state.game.phase !== 'playing') return false;

    const currentPlayer = this.state.game.players[this.state.game.currentPlayerIndex];

    if (currentPlayer.type === 'computer') {
      this.callbacks.onAIThinking?.(this.state.game.currentPlayerIndex);

      const difficulty = currentPlayer.difficulty;
      if (!difficulty) {
        this.dispatch({ type: 'PASS' });
        this.recordTurn('pass', 0, '');
        this.callbacks.onStateChange?.(this.state);
        return this.state.game.phase === 'playing';
      }

      const result = await solverManager.getAIMove(
        this.state.game.board,
        currentPlayer.rack,
        difficulty
      );

      if (!result.found || !result.word || result.score === undefined) {
        this.dispatch({ type: 'PASS' });
        this.recordTurn('pass', 0, '');
        this.callbacks.onStateChange?.(this.state);
        return this.state.game.phase === 'playing';
      }

      const placements: { tile: import('../types/Tile').Tile; row: number; col: number }[] = [];
      const chars = result.word.split('');
      const rack = this.state.game.players[this.state.game.currentPlayerIndex].rack;
      for (let i = 0; i < chars.length; i++) {
        const r = result.horizontal ? result.row! : result.row! + i;
        const c = result.horizontal ? result.col! + i : result.col!;
        if (this.state.game.board[r][c].tile !== null) continue;
        const tileIdx = rack.findIndex(t => t.letter === chars[i]);
        if (tileIdx === -1) {
          this.callbacks.onError?.(`AI rack missing letter '${chars[i]}' for word '${result.word}'`);
          this.dispatch({ type: 'PASS' });
          this.recordTurn('pass', 0, '');
          this.callbacks.onStateChange?.(this.state);
          return this.state.game.phase === 'playing';
        }
        placements.push({ tile: rack[tileIdx], row: r, col: c });
      }

      if (placements.length === 0) {
        this.dispatch({ type: 'PASS' });
        this.recordTurn('pass', 0, '');
        this.callbacks.onStateChange?.(this.state);
        return this.state.game.phase === 'playing';
      }

      const isBingo = placements.length === 7;
      const move: Move = {
        tiles: placements.map(p => ({ tile: p.tile, row: p.row, col: p.col })),
        direction: result.horizontal ? 'horizontal' : 'vertical',
        score: result.score,
        wordsFormed: [result.word],
        isBingo,
        startRow: Math.min(...placements.map(p => p.row)),
        startCol: Math.min(...placements.map(p => p.col)),
        tileCount: placements.length,
      };

      this.callbacks.onAIMove?.(move);
      this.dispatch({ type: 'COMMIT_MOVE', move });
      this.recordTurn('play', result.score, result.word, isBingo);
      this.callbacks.onStateChange?.(this.state);
    } else {
      this.dispatch({ type: 'PASS' });
      this.recordTurn('pass', 0, '');
      this.callbacks.onStateChange?.(this.state);
    }

    return this.state.game.phase === 'playing';
  }

  private recordTurn(action: 'play' | 'pass' | 'exchange', score: number, word: string, isBingo = false): void {
    const prevState = this.state.game.moveHistory.length > 0
      ? this.state.game.moveHistory[this.state.game.moveHistory.length - 1]
      : null;
    this.turnCount++;
    this.turnRecords.push({
      turnNumber: this.turnCount,
      playerIndex: prevState?.playerIndex ?? 0,
      action,
      word,
      score,
      isBingo,
    });
    this.callbacks.onTurn?.(this.turnRecords[this.turnRecords.length - 1]);
  }

  async runGame(players: Player[], speed: Speed = 'normal'): Promise<GameReport> {
    this.initialize(players);
    this.speed = speed;
    this._isRunning = true;
    this._isPaused = false;

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    while (this.state.game.phase === 'playing' && !this._aborted) {
      if (this._isPaused) {
        await delay(100);
        continue;
      }

      const speedMs = SPEED_MS[this.speed];
      const continueGame = await this.runSingleTurn();

      if (speedMs > 0 && continueGame) {
        await delay(speedMs);
      }
    }

    this._isRunning = false;

    const { generateReport } = await import('./GameReporter');
    const report = generateReport(this.state, this.turnRecords);
    this.callbacks.onComplete?.(report);
    return report;
  }

  async runBatch(players: Player[], count: number, speed: Speed = 'instant'): Promise<import('./GameReporter').BatchResult> {
    const { aggregateBatch } = await import('./GameReporter');
    const reports: GameReport[] = [];

    for (let i = 0; i < count; i++) {
      const report = await this.runGame(players, speed);
      reports.push(report);
      this.callbacks.onStateChange?.(this.state);
    }

    return aggregateBatch(reports);
  }
}

import type { BoardSquare } from '../types/BoardSquare';
import type { Tile } from '../types/Tile';
import type { Difficulty } from '../types/Player';
import type { AnalyzedMove } from '../types/GameState';

export interface AIMoveResult {
  found: boolean;
  word?: string;
  row?: number;
  col?: number;
  horizontal?: boolean;
  score?: number;
}

export class SolverManager {
  private trie: any = null;
  private config: any = null;
  private ready = false;
  private loadPromise: Promise<void> | null = null;

  get isReady(): boolean {
    return this.ready;
  }

  async load(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this._load();
    return this.loadPromise;
  }

  private async _load(): Promise<void> {
    try {
      const [TrieModule, solverModule, configsModule] = await Promise.all([
        import('@kamilmielnik/trie'),
        import('@scrabble-solver/solver'),
        import('@scrabble-solver/configs'),
      ]);

      const response = await fetch(`${import.meta.env.BASE_URL}twl06.txt`);
      const text = await response.text();
      const words = text.split(/\r?\n/).map(w => w.trim().toLowerCase()).filter(w => w.length > 0);

      this.trie = TrieModule.Trie.fromArray(words);
      this.config = configsModule.languages.englishUsScrabble;
      this.ready = true;
      console.log(`[Solver] Ready: ${words.length} words`);
    } catch (e) {
      console.error('[Solver] Load failed:', e);
      throw e;
    }
  }

  async getAIMove(
    board: BoardSquare[][],
    rack: Tile[],
    difficulty: Difficulty
  ): Promise<AIMoveResult> {
    if (!this.ready) await this.load();
    try {
      const moves = await this._getAllMoves(board, rack);
      if (moves.length === 0) return { found: false };

      const sorted = [...moves].sort((a, b) => a.score - b.score);

      let chosen: AnalyzedMove;
      switch (difficulty) {
        case 'beginner':
          chosen = sorted[0];
          break;
        case 'intermediate':
          chosen = sorted[Math.floor(sorted.length / 2)];
          break;
        case 'expert':
          chosen = sorted[sorted.length - 1];
          break;
        default:
          chosen = sorted[sorted.length - 1];
      }

      const found = this._findWordPlacement(chosen.word, board, rack);
      if (!found) return { found: false };

      return {
        found: true,
        word: chosen.word,
        row: found.row,
        col: found.col,
        horizontal: found.horizontal,
        score: chosen.score,
      };
    } catch (e) {
      console.error('[Solver] AI move failed:', e);
      return { found: false };
    }
  }

  async analyzeMoves(board: BoardSquare[][], rack: Tile[]): Promise<AnalyzedMove[]> {
    if (!this.ready) await this.load();
    try {
      const moves = await this._getAllMoves(board, rack);
      return moves.sort((a, b) => a.score - b.score);
    } catch (e) {
      console.error('[Solver] Analysis failed:', e);
      return [];
    }
  }

  private async _getAllMoves(board: BoardSquare[][], rack: Tile[]): Promise<AnalyzedMove[]> {
    const { Board, Tile: SolverTile } = await import('@scrabble-solver/types');
    const { solve } = await import('@scrabble-solver/solver');

    const stringRows: string[] = [];
    for (let y = 0; y < 15; y++) {
      let row = '';
      for (let x = 0; x < 15; x++) {
        const cell = board[y]?.[x];
        row += cell && cell.tile ? cell.tile.letter.toLowerCase() : ' ';
      }
      stringRows.push(row);
    }

    const solverBoard = Board.fromStringArray(stringRows);
    const tiles: any[] = rack.map(t => new SolverTile({ character: t.letter.toLowerCase() }));

    const results = solve(this.trie, this.config, solverBoard, tiles);

    const unique = new Map<string, number>();
    for (const r of results) {
      const word = r.cells.map((c: any) => c.tile.character).join('').toUpperCase();
      if (!unique.has(word) || unique.get(word)! < r.points) {
        unique.set(word, r.points);
      }
    }

    return Array.from(unique.entries()).map(([word, score]) => ({ word, score }));
  }

  private _findWordPlacement(
    word: string,
    board: BoardSquare[][],
    rack: Tile[]
  ): { row: number; col: number; horizontal: boolean } | null {
    const wordUpper = word.toUpperCase();
    const letters = wordUpper.split('');

    const rackLetters = rack.map(t => t.letter);

    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 15; col++) {
        if (board[row][col].tile !== null) {
          for (let startOffset = 0; startOffset < letters.length; startOffset++) {
            const startCol = col - startOffset;
            if (startCol >= 0 && startCol + letters.length <= 15) {
              if (this._canPlaceWord(letters, row, startCol, true, board, rackLetters)) {
                return { row, col: startCol, horizontal: true };
              }
            }
            const startRow = row - startOffset;
            if (startRow >= 0 && startRow + letters.length <= 15) {
              if (this._canPlaceWord(letters, startRow, col, false, board, rackLetters)) {
                return { row: startRow, col, horizontal: false };
              }
            }
          }
        }
      }
    }

    if (board[7][7].tile === null) {
      for (let startOffset = 0; startOffset < letters.length; startOffset++) {
        const startCol = 7 - startOffset;
        if (startCol >= 0 && startCol + letters.length <= 15) {
          if (this._canPlaceWord(letters, 7, startCol, true, board, rackLetters)) {
            return { row: 7, col: startCol, horizontal: true };
          }
        }
        const startRow = 7 - startOffset;
        if (startRow >= 0 && startRow + letters.length <= 15) {
          if (this._canPlaceWord(letters, startRow, 7, false, board, rackLetters)) {
            return { row: startRow, col: 7, horizontal: false };
          }
        }
      }
    }

    return null;
  }

  private _canPlaceWord(
    letters: string[],
    startRow: number,
    startCol: number,
    horizontal: boolean,
    board: BoardSquare[][],
    rackLetters: string[]
  ): boolean {
    const usedRackLetters = [...rackLetters];

    for (let i = 0; i < letters.length; i++) {
      const r = horizontal ? startRow : startRow + i;
      const c = horizontal ? startCol + i : startCol;

      if (r < 0 || r >= 15 || c < 0 || c >= 15) return false;

      const existing = board[r][c].tile;
      if (existing) {
        if (existing.letter !== letters[i]) return false;
      } else {
        const rackIdx = usedRackLetters.indexOf(letters[i]);
        if (rackIdx === -1) return false;
        usedRackLetters.splice(rackIdx, 1);
      }
    }

    return true;
  }
}

export const solverManager = new SolverManager();

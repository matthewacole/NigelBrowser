import type { BoardSquare } from '../types/BoardSquare';
import type { Player } from '../types/Player';
import type { Tile } from '../types/Tile';
import type { MoveDirection, PlacedTile, Move } from '../types/Move';
import { BOARD_SIZE, RACK_SIZE, STARTING_SQUARE, BINGO_BONUS } from '../types/Constants';
import { bonusScoreMultiplier } from '../types/Constants';
import { createStandardBoard } from '../types/BoardSquare';
import { TileBag } from './TileBag';
import { wordValidator } from './WordValidator';
import { createMove } from '../types/Move';
import type { GameState, RecordedMove } from '../types/GameState';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  words?: { word: string; positions: { row: number; col: number }[] }[];
  direction?: MoveDirection;
  placedTiles?: PlacedTile[];
}

export function initializeNewGame(players: Player[]): { board: BoardSquare[][]; players: Player[]; bag: TileBag } {
  const bag = new TileBag();
  for (const idx of players.keys()) {
    players[idx].rack = bag.draw(RACK_SIZE);
  }
  return { board: createStandardBoard(), players, bag };
}

export function validatePlacement(
  tiles: PlacedTile[],
  board: BoardSquare[][]
): ValidationResult {
  if (tiles.length === 0) {
    return { valid: false, error: 'No tiles placed' };
  }

  const placedPositions = new Set(tiles.map(t => `${t.row},${t.col}`));
  const hasExistingTiles = board.some(row =>
    row.some(sq => sq.tile !== null && !placedPositions.has(`${sq.row},${sq.col}`))
  );

  if (!hasExistingTiles) {
    const coversCenter = tiles.some(t => t.row === STARTING_SQUARE.row && t.col === STARTING_SQUARE.col);
    if (!coversCenter) {
      return { valid: false, error: 'First move must cover the center square' };
    }
  } else {
    const touchesExisting = tiles.some(pt =>
      hasAdjacentPlacedTile(pt.row, pt.col, board, tiles.map(t => ({ row: t.row, col: t.col })))
    );
    if (!touchesExisting) {
      return { valid: false, error: 'Tiles must connect to existing words on the board' };
    }
  }

  const rows = new Set(tiles.map(t => t.row));
  const cols = new Set(tiles.map(t => t.col));

  let direction: MoveDirection;
  if (tiles.length === 1) {
    direction = 'horizontal';
  } else if (rows.size === 1) {
    direction = 'horizontal';
  } else if (cols.size === 1) {
    direction = 'vertical';
  } else {
    return { valid: false, error: 'Tiles must be placed in a single row or column' };
  }

  const sorted = direction === 'horizontal'
    ? [...tiles].sort((a, b) => a.col - b.col)
    : [...tiles].sort((a, b) => a.row - b.row);

  if (direction === 'horizontal') {
    for (let i = 0; i < sorted.length - 1; i++) {
      let col = sorted[i].col + 1;
      while (col < sorted[i + 1].col) {
        if (board[sorted[i].row][col].tile === null) {
          return { valid: false, error: 'Gaps are not allowed in a word' };
        }
        col++;
      }
    }
  } else {
    for (let i = 0; i < sorted.length - 1; i++) {
      let row = sorted[i].row + 1;
      while (row < sorted[i + 1].row) {
        if (board[row][sorted[i].col].tile === null) {
          return { valid: false, error: 'Gaps are not allowed in a word' };
        }
        row++;
      }
    }
  }

  const words = extractWords(sorted, direction, board);

  return { valid: true, words, direction, placedTiles: sorted };
}

export function calculateScore(
  tiles: PlacedTile[],
  direction: MoveDirection,
  board: BoardSquare[][]
): { score: number; isBingo: boolean; words: { word: string; score: number }[] } {
  const virtualBoard = createVirtualBoard(board, tiles);
  const words = extractWords(tiles, direction, board);
  let totalScore = 0;
  const scoredWords: { word: string; score: number }[] = [];
  const placedPositions = new Set(tiles.map(t => `${t.row},${t.col}`));

  for (const { positions } of words) {
    let wordMultiplier = 1;
    let wordScore = 0;

    for (const { row, col } of positions) {
      const square = board[row][col];
      const virtualSquare = virtualBoard[row][col];
      if (virtualSquare.tile) {
        const isNewlyPlaced = placedPositions.has(`${row},${col}`);
        if (isNewlyPlaced) {
          const mult = bonusScoreMultiplier(square.bonus);
          wordMultiplier *= mult.word;
          wordScore += virtualSquare.tile.score * mult.letter;
        } else {
          wordScore += virtualSquare.tile.score;
        }
      }
    }

    wordScore *= wordMultiplier;
    totalScore += wordScore;
    const wordStr = positions.map(p => virtualBoard[p.row][p.col].tile!.letter).join('');
    scoredWords.push({ word: wordStr, score: wordScore });
  }

  const isBingo = tiles.length === RACK_SIZE;
  if (isBingo) {
    totalScore += BINGO_BONUS;
  }

  return { score: totalScore, isBingo, words: scoredWords };
}

export function commitMove(
  state: GameState,
  move: Move
): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const playerIndex = newState.currentPlayerIndex;
  const player = newState.players[playerIndex];

  player.score += move.score;
  player.consecutivePasses = 0;

  for (const pt of move.tiles) {
    if (newState.board[pt.row][pt.col].tile === null) {
      newState.board[pt.row][pt.col].tile = pt.tile;
    }
    const rackIdx = player.rack.findIndex(t => t.id === pt.tile.id);
    if (rackIdx >= 0) {
      player.rack.splice(rackIdx, 1);
    }
  }

  const tilesUsed = move.tileCount;
  const tilesToDraw = Math.min(tilesUsed, newState.bag.count);
  const drawn = newState.bag.draw(tilesToDraw);
  player.rack.push(...drawn);

  newState.boardSnapshots.push(JSON.parse(JSON.stringify(newState.board)));

  newState.moveHistory.push({
    playerIndex,
    action: { type: 'play', word: move.wordsFormed.join(', '), score: move.score },
    scoreGained: move.score,
    turnNumber: newState.turnNumber,
  });

  return newState;
}

export function exchangeTiles(state: GameState, tileIds: string[]): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const playerIndex = newState.currentPlayerIndex;
  const player = newState.players[playerIndex];

  const tiles: Tile[] = [];
  for (const id of tileIds) {
    const idx = player.rack.findIndex(t => t.id === id);
    if (idx >= 0) {
      tiles.push(player.rack.splice(idx, 1)[0]);
    }
  }

  const drawn = newState.bag.draw(tiles.length);
  player.rack.push(...drawn);
  newState.bag.returnTiles(tiles);
  player.consecutivePasses = 0;

  newState.moveHistory.push({
    playerIndex,
    action: { type: 'exchange', tileCount: tiles.length },
    scoreGained: 0,
    turnNumber: newState.turnNumber,
  });

  return newState;
}

export function passTurn(state: GameState): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const playerIndex = newState.currentPlayerIndex;
  newState.players[playerIndex].consecutivePasses += 1;

  newState.moveHistory.push({
    playerIndex,
    action: { type: 'pass' },
    scoreGained: 0,
    turnNumber: newState.turnNumber,
  });

  return newState;
}

export function advanceTurn(state: GameState): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
  if (newState.currentPlayerIndex === 0) {
    newState.turnNumber += 1;
  }
  return newState;
}

export function checkGameOver(state: GameState): boolean {
  for (const player of state.players) {
    if (player.rack.length === 0 && state.bag.isEmpty) {
      return true;
    }
  }
  return state.players.every(p => p.consecutivePasses >= 1);
}

export function calculateFinalScores(state: GameState): { player: Player; finalScore: number; adjustment: number }[] {
  const results: { player: Player; finalScore: number; adjustment: number }[] = [];
  const playerWhoFinished = state.players.find(p => p.rack.length === 0);

  for (const player of state.players) {
    const rackValue = player.rack.reduce((sum, t) => sum + t.score, 0);
    let adjustment = 0;

    if (playerWhoFinished) {
      if (player.id === playerWhoFinished.id) {
        for (const other of state.players) {
          if (other.id !== player.id) {
            adjustment += other.rack.reduce((sum, t) => sum + t.score, 0);
          }
        }
      } else {
        adjustment = -rackValue;
      }
    } else {
      adjustment = -rackValue;
    }

    results.push({ player, finalScore: player.score + adjustment, adjustment });
  }

  return results;
}

function hasAdjacentPlacedTile(
  row: number,
  col: number,
  board: BoardSquare[][],
  placedTiles: { row: number; col: number }[]
): boolean {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
    if (board[nr][nc].tile !== null && !placedTiles.some(p => p.row === nr && p.col === nc)) {
      return true;
    }
  }
  return false;
}

function createVirtualBoard(board: BoardSquare[][], newTiles: PlacedTile[]): BoardSquare[][] {
  const vb = board.map(row => row.map(sq => ({
    ...sq,
    tile: sq.tile ? { ...sq.tile } : null,
    bonus: sq.bonus as any,
  })));
  for (const t of newTiles) {
    vb[t.row][t.col] = { ...vb[t.row][t.col], tile: { ...t.tile } };
  }
  return vb;
}

function extractWords(
  tiles: PlacedTile[],
  direction: MoveDirection,
  board: BoardSquare[][]
): { word: string; positions: { row: number; col: number }[] }[] {
  const virtualBoard = createVirtualBoard(board, tiles);
  const words: { word: string; positions: { row: number; col: number }[] }[] = [];

  if (direction === 'horizontal') {
    const firstTile = tiles[0];
    const row = firstTile.row;
    let startCol = firstTile.col;
    while (startCol > 0 && virtualBoard[row][startCol - 1].tile !== null) startCol--;
    const positions: { row: number; col: number }[] = [];
    let col = startCol;
    while (col < BOARD_SIZE && virtualBoard[row][col].tile !== null) {
      positions.push({ row, col });
      col++;
    }
    if (positions.length >= 2) {
      const wordStr = positions.map(p => virtualBoard[p.row][p.col].tile!.letter).join('');
      words.push({ word: wordStr, positions });
    }
  } else {
    const firstTile = tiles[0];
    const col = firstTile.col;
    let startRow = firstTile.row;
    while (startRow > 0 && virtualBoard[startRow - 1][col].tile !== null) startRow--;
    const positions: { row: number; col: number }[] = [];
    let row = startRow;
    while (row < BOARD_SIZE && virtualBoard[row][col].tile !== null) {
      positions.push({ row, col });
      row++;
    }
    if (positions.length >= 2) {
      const wordStr = positions.map(p => virtualBoard[p.row][p.col].tile!.letter).join('');
      words.push({ word: wordStr, positions });
    }
  }

  for (const pt of tiles) {
    const cross = extractCrossWord(pt.row, pt.col, direction === 'horizontal' ? 'vertical' : 'horizontal', virtualBoard);
    if (cross) words.push(cross);
  }

  return words;
}

function extractCrossWord(
  row: number,
  col: number,
  direction: MoveDirection,
  vboard: BoardSquare[][]
): { word: string; positions: { row: number; col: number }[] } | null {
  const positions: { row: number; col: number }[] = [];

  if (direction === 'vertical') {
    let startRow = row;
    while (startRow > 0 && vboard[startRow - 1][col].tile !== null) startRow--;
    let r = startRow;
    while (r < BOARD_SIZE && vboard[r][col].tile !== null) {
      positions.push({ row: r, col });
      r++;
    }
  } else {
    let startCol = col;
    while (startCol > 0 && vboard[row][startCol - 1].tile !== null) startCol--;
    let c = startCol;
    while (c < BOARD_SIZE && vboard[row][c].tile !== null) {
      positions.push({ row, col: c });
      c++;
    }
  }

  if (positions.length >= 2) {
    const wordStr = positions.map(p => vboard[p.row][p.col].tile!.letter).join('');
    return { word: wordStr, positions };
  }
  return null;
}

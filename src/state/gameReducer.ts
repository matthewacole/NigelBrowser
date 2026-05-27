import type { GameState, RecordedMove, AnalyzedMove } from '../types/GameState';
import type { Player, Difficulty } from '../types/Player';
import type { Move } from '../types/Move';
import { TileBag } from '../engine/TileBag';
import { createInitialGameState, getCurrentPlayer } from '../types/GameState';
import { RACK_SIZE, BOARD_SIZE } from '../types/Constants';
import { createStandardBoard } from '../types/BoardSquare';
import { debugLogger } from '../utils/DebugLogger';
import { wordValidator } from '../engine/WordValidator';

function cloneGameState(state: GameState): GameState {
  const clone = structuredClone(state);
  clone.bag = TileBag.fromJSON((clone.bag as any)._tiles || []);
  return clone;
}

export type GameAction =
  | { type: 'NEW_GAME'; players: Player[] }
  | { type: 'LOAD_GAME'; state: GameState }
  | { type: 'COMMIT_MOVE'; move: Move }
  | { type: 'EXCHANGE_TILES'; tileIds: string[] }
  | { type: 'PASS' }
  | { type: 'FORFEIT' }
  | { type: 'SHUFFLE_RACK' }
  | { type: 'FINISH_GAME' }
  | { type: 'CHECK_GAME_OVER' }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'SET_ANALYSIS'; turn: number; moves: AnalyzedMove[] }
  | { type: 'CLEAR_GAME' };

export interface UIState {
  isAIThinking: boolean;
  aiThinkingPlayerIndex: number | null;
  errorMessage: string | null;
  lastMoveDescription: string | null;
  showBingoConfetti: boolean;
  bingoScore: number;
  showGameOver: boolean;
  winners: { player: Player; finalScore: number }[];
  turnAnalyses: Record<number, AnalyzedMove[]>;
  savedReportURL: string | null;
  showGameLogPrompt: boolean;
  lastPlacedTilePositions: { row: number; col: number }[];
}

export const initialUIState: UIState = {
  isAIThinking: false,
  aiThinkingPlayerIndex: null,
  errorMessage: null,
  lastMoveDescription: null,
  showBingoConfetti: false,
  bingoScore: 0,
  showGameOver: false,
  winners: [],
  turnAnalyses: {},
  savedReportURL: null,
  showGameLogPrompt: false,
  lastPlacedTilePositions: [],
};

export type AppState = {
  game: GameState;
  ui: UIState;
};

export const initialAppState: AppState = {
  game: createInitialGameState(),
  ui: initialUIState,
};

function advanceTurn(state: GameState): GameState {
  const newState = cloneGameState(state);
  newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
  if (newState.currentPlayerIndex === 0) {
    newState.turnNumber += 1;
  }
  return newState;
}

function checkGameOver(state: GameState): boolean {
  for (const player of state.players) {
    if (player.rack.length === 0 && state.bag.isEmpty) return true;
  }
  return state.players.every(p => p.consecutivePasses >= 1);
}

function calculateFinalScores(state: GameState): { player: Player; finalScore: number; adjustment: number }[] {
  const results: { player: Player; finalScore: number; adjustment: number }[] = [];
  const finisher = state.players.find(p => p.rack.length === 0);
  for (const player of state.players) {
    const rackValue = player.rack.reduce((sum, t) => sum + t.score, 0);
    let adjustment = 0;
    if (finisher) {
      if (player.id === finisher.id) {
        for (const other of state.players) {
          if (other.id !== player.id) adjustment += other.rack.reduce((s, t) => s + t.score, 0);
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

export function gameReducer(state: AppState, action: GameAction): AppState {
  switch (action.type) {
    case 'NEW_GAME': {
      const bag = new TileBag();
      const players = action.players.map((p, i) => {
        const rack = bag.draw(RACK_SIZE);
        return { ...p, rack, score: 0, consecutivePasses: 0 };
      });
      return {
        game: {
          board: createStandardBoard(),
          players,
          currentPlayerIndex: 0,
          bag,
          moveHistory: [],
          boardSnapshots: [],
          phase: 'playing',
          turnNumber: 1,
        },
        ui: { ...initialUIState },
      };
    }

    case 'LOAD_GAME': {
      const loaded = action.state;
      loaded.bag = TileBag.fromJSON((loaded.bag as any)._tiles || (loaded.bag as any).tiles || []);
      return { game: loaded, ui: { ...initialUIState } };
    }

    case 'COMMIT_MOVE': {
      const newGame = cloneGameState(state.game);
      const playerIndex = newGame.currentPlayerIndex;
      const player = newGame.players[playerIndex];
      const move = action.move;

      player.score += move.score;
      player.consecutivePasses = 0;

      for (const pt of move.tiles) {
        if (newGame.board[pt.row][pt.col].tile === null) {
          newGame.board[pt.row][pt.col].tile = pt.tile;
        }
        const rackIdx = player.rack.findIndex(t => t.id === pt.tile.id);
        if (rackIdx >= 0) player.rack.splice(rackIdx, 1);
      }

      // Defense-in-depth: scan board for any invalid words after placement
      const scannedWords = new Set<string>();
      const invalidWords: string[] = [];
      for (const pt of move.tiles) {
        // Horizontal word at this position
        const hKey = `${pt.row},${pt.col}:H`;
        if (!scannedWords.has(hKey)) {
          scannedWords.add(hKey);
          let hs = pt.col;
          while (hs > 0 && newGame.board[pt.row][hs - 1].tile) hs--;
          let he = pt.col;
          while (he < BOARD_SIZE - 1 && newGame.board[pt.row][he + 1].tile) he++;
          if (he - hs >= 1) {
            let word = '';
            for (let c = hs; c <= he; c++) word += newGame.board[pt.row][c].tile!.letter;
            if (!wordValidator.isValidWord(word) && !invalidWords.includes(word)) {
              invalidWords.push(word);
            }
          }
        }
        // Vertical word at this position
        const vKey = `${pt.row},${pt.col}:V`;
        if (!scannedWords.has(vKey)) {
          scannedWords.add(vKey);
          let vs = pt.row;
          while (vs > 0 && newGame.board[vs - 1][pt.col].tile) vs--;
          let ve = pt.row;
          while (ve < BOARD_SIZE - 1 && newGame.board[ve + 1][pt.col].tile) ve++;
          if (ve - vs >= 1) {
            let word = '';
            for (let r = vs; r <= ve; r++) word += newGame.board[r][pt.col].tile!.letter;
            if (!wordValidator.isValidWord(word) && !invalidWords.includes(word)) {
              invalidWords.push(word);
            }
          }
        }
      }
      if (invalidWords.length > 0) {
        debugLogger.log(newGame.turnNumber, player.name, 'ERROR',
          `Board has invalid word(s) after commit: ${invalidWords.join(', ')}`);
      }

      const tilesUsed = move.tileCount;
      const tilesToDraw = Math.min(tilesUsed, newGame.bag.count);
      const drawn = newGame.bag.draw(tilesToDraw);
      player.rack.push(...drawn);

      if (player.rack.length > RACK_SIZE) {
        const excess = player.rack.length - RACK_SIZE;
        debugLogger.log(newGame.turnNumber, player.name, 'ERROR', `Rack exceeded ${RACK_SIZE} tiles — ${excess} excess returned to bag`);
        const removed = player.rack.splice(RACK_SIZE);
        newGame.bag.returnTiles(removed);
      }

      if (drawn.length > 0) {
        debugLogger.log(newGame.turnNumber, player.name, 'DRAW', `Drew ${drawn.length} tiles from bag`, { drawn: drawn.map(t => t.letter).join(''), bag_remaining: newGame.bag.count });
      }

      newGame.boardSnapshots.push(structuredClone(newGame.board));

      newGame.moveHistory.push({
        playerIndex,
        action: { type: 'play' as const, word: move.wordsFormed.join(', '), score: move.score },
        scoreGained: move.score,
        turnNumber: newGame.turnNumber,
      });

      const isBingo = move.isBingo;
      const bingoScore = move.score;
      const desc = isBingo
        ? `${player.name} played a BINGO! ${move.wordsFormed.join(', ')} for ${move.score} points (+50 bonus)`
        : `${player.name} played ${move.wordsFormed.join(', ')} for ${move.score} points`;

      debugLogger.log(newGame.turnNumber, player.name, 'COMMIT', `${player.name} committed ${move.wordsFormed.join(', ')} for ${move.score} pts`, { words: move.wordsFormed.join(', '), score: move.score, tiles_used: tilesUsed, tiles_drawn: drawn.length, player_score: player.score, bag_remaining: newGame.bag.count });

      for (const pt of move.tiles) {
        const bonus = newGame.board[pt.row][pt.col].bonus;
        debugLogger.log(newGame.turnNumber, player.name, 'PLACE',
          `Placed ${pt.tile.letter} at (${pt.row},${pt.col}) [base: ${pt.tile.score}, bonus: ${bonus}]`,
          { letter: pt.tile.letter, row: pt.row, col: pt.col, tile_score: pt.tile.score, bonus_square: bonus }
        );
      }

      if (isBingo) {
        debugLogger.log(newGame.turnNumber, player.name, 'BINGO', `${player.name} scored a BINGO! +${move.score} pts`);
      }

      const gameOver = checkGameOver(newGame);
      const nextGame = gameOver ? newGame : advanceTurn(newGame);
      const tilePositions = move.tiles.map(t => ({ row: t.row, col: t.col }));

      if (gameOver) {
        nextGame.phase = 'gameOver';
        const results = calculateFinalScores(nextGame);
        const winners = results.map(r => ({ player: r.player, finalScore: r.finalScore })).sort((a, b) => b.finalScore - a.finalScore);
        return {
          game: nextGame,
          ui: {
            ...state.ui,
            showBingoConfetti: isBingo,
            bingoScore,
            lastMoveDescription: desc,
            showGameOver: true,
            winners,
            errorMessage: null,
            lastPlacedTilePositions: tilePositions,
          },
        };
      }

      return {
        game: nextGame,
        ui: {
          ...state.ui,
          showBingoConfetti: isBingo,
          bingoScore,
          lastMoveDescription: desc,
          errorMessage: null,
          lastPlacedTilePositions: tilePositions,
        },
      };
    }

    case 'EXCHANGE_TILES': {
      let newGame = cloneGameState(state.game);
      const playerIndex = newGame.currentPlayerIndex;
      const player = newGame.players[playerIndex];

      const tiles = player.rack.filter(t => action.tileIds.includes(t.id));
      for (const t of tiles) {
        const idx = player.rack.findIndex(rt => rt.id === t.id);
        if (idx >= 0) player.rack.splice(idx, 1);
      }

      debugLogger.log(newGame.turnNumber, player.name, 'EXCHANGE', `Exchanging ${tiles.length} tiles: ${tiles.map(t => t.letter).join('')}`);

      const drawn = newGame.bag.draw(tiles.length);
      player.rack.push(...drawn);
      newGame.bag.returnTiles(tiles);
      player.consecutivePasses = 0;

      if (drawn.length > 0) {
        debugLogger.log(newGame.turnNumber, player.name, 'DRAW', `Drew ${drawn.length} tiles from bag`, { drawn: drawn.map(t => t.letter).join(''), bag_remaining: newGame.bag.count });
      }

      newGame.moveHistory.push({
        playerIndex,
        action: { type: 'exchange', tileCount: tiles.length },
        scoreGained: 0,
        turnNumber: newGame.turnNumber,
      });

      const desc = `${player.name} exchanged ${tiles.length} tile(s)`;
      const nextGame = advanceTurn(newGame);

      return {
        game: nextGame,
        ui: { ...state.ui, lastMoveDescription: desc, errorMessage: null },
      };
    }

    case 'PASS': {
      let newGame = cloneGameState(state.game);
      const playerIndex = newGame.currentPlayerIndex;
      newGame.players[playerIndex].consecutivePasses += 1;

      debugLogger.log(newGame.turnNumber, newGame.players[playerIndex].name, 'PASS', `${newGame.players[playerIndex].name} passed (consecutive: ${newGame.players[playerIndex].consecutivePasses})`);

      newGame.moveHistory.push({
        playerIndex,
        action: { type: 'pass' },
        scoreGained: 0,
        turnNumber: newGame.turnNumber,
      });

      const desc = `${newGame.players[playerIndex].name} passed`;
      const gameOver = checkGameOver(newGame);
      const nextGame = gameOver ? newGame : advanceTurn(newGame);

      if (gameOver) {
        nextGame.phase = 'gameOver';
        const results = calculateFinalScores(nextGame);
        const winners = results.map(r => ({ player: r.player, finalScore: r.finalScore })).sort((a, b) => b.finalScore - a.finalScore);
        return {
          game: nextGame,
          ui: { ...state.ui, lastMoveDescription: desc, showGameOver: true, winners, errorMessage: null },
        };
      }

      return {
        game: nextGame,
        ui: { ...state.ui, lastMoveDescription: desc, errorMessage: null },
      };
    }

    case 'FORFEIT': {
      const newGame = cloneGameState(state.game);
      debugLogger.log(newGame.turnNumber, newGame.players[newGame.currentPlayerIndex]?.name ?? '?', 'FORFEIT', `${newGame.players[newGame.currentPlayerIndex]?.name ?? 'Player'} forfeited the game`);
      newGame.phase = 'gameOver';
      const results = calculateFinalScores(newGame);
      const winners = results.map(r => ({ player: r.player, finalScore: r.finalScore })).sort((a, b) => b.finalScore - a.finalScore);
      return {
        game: newGame,
        ui: { ...state.ui, showGameOver: true, winners, errorMessage: null },
      };
    }

    case 'SHUFFLE_RACK': {
      const newGame = cloneGameState(state.game);
      const player = newGame.players[newGame.currentPlayerIndex];
      for (let i = player.rack.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [player.rack[i], player.rack[j]] = [player.rack[j], player.rack[i]];
      }
      return { ...state, game: newGame };
    }

    case 'FINISH_GAME': {
      const newGame = cloneGameState(state.game);
      newGame.phase = 'gameOver';
      const results = calculateFinalScores(newGame);
      const winners = results.map(r => ({ player: r.player, finalScore: r.finalScore })).sort((a, b) => b.finalScore - a.finalScore);
      return {
        game: newGame,
        ui: { ...state.ui, showGameOver: true, winners },
      };
    }

    case 'CHECK_GAME_OVER': {
      if (checkGameOver(state.game)) {
        return gameReducer(state, { type: 'FINISH_GAME' });
      }
      return state;
    }

    case 'SET_ANALYSIS': {
      return {
        ...state,
        ui: {
          ...state.ui,
          turnAnalyses: { ...state.ui.turnAnalyses, [action.turn]: action.moves },
        },
      };
    }

    case 'SET_ERROR': {
      return { ...state, ui: { ...state.ui, errorMessage: action.message } };
    }

    case 'CLEAR_GAME': {
      return initialAppState;
    }

    default:
      return state;
  }
}

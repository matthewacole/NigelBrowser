import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { gameReducer, initialAppState, type AppState, type GameAction, type UIState } from './gameReducer';
import type { GameState, AnalyzedMove } from '../types/GameState';
import type { Player } from '../types/Player';
import type { Move } from '../types/Move';
import { solverManager } from '../solver/SolverManager';
import { saveGame, loadGame, hasSavedGame, deleteSavedGame } from '../utils/persistence';
import { generateReport, downloadReport } from '../utils/reportGenerator';
import { debugLogger } from '../utils/DebugLogger';
import { validatePlacement } from '../engine/GameEngine';
import { wordValidator } from '../engine/WordValidator';

interface GameContextValue {
  state: AppState;
  dispatch: React.Dispatch<GameAction>;
  attemptPlay: (move: Move) => void;
  exchangeTiles: (tileIds: string[]) => void;
  pass: () => void;
  forfeit: () => void;
  shuffleRack: () => void;
  startNewGame: (players: Player[]) => void;
  loadSavedGame: () => boolean;
  getSavedGameExists: () => boolean;
  saveCurrentGame: () => void;
  saveReport: () => void;
  isAIThinking: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialAppState);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAIThinkingRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const getSavedGameExists = useCallback(() => hasSavedGame(), []);

  const saveCurrentGame = useCallback(() => {
    if (state.game.phase === 'playing') saveGame(state.game);
    else deleteSavedGame();
  }, [state.game]);

  useEffect(() => {
    if (state.game.phase === 'playing') saveGame(state.game);
  }, [state.game]);

  const startNewGame = useCallback((players: Player[]) => {
    debugLogger.clear();
    dispatch({ type: 'NEW_GAME', players });
  }, []);

  const loadSavedGameAction = useCallback((): boolean => {
    const saved = loadGame();
    if (saved) {
      dispatch({ type: 'LOAD_GAME', state: saved });
      return true;
    }
    return false;
  }, []);

  const attemptPlay = useCallback((move: Move) => {
    dispatch({ type: 'COMMIT_MOVE', move });
  }, []);

  const exchangeTiles = useCallback((tileIds: string[]) => {
    dispatch({ type: 'EXCHANGE_TILES', tileIds });
  }, []);

  const passAction = useCallback(() => {
    dispatch({ type: 'PASS' });
  }, []);

  const forfeit = useCallback(() => {
    dispatch({ type: 'FORFEIT' });
  }, []);

  const shuffleRack = useCallback(() => {
    dispatch({ type: 'SHUFFLE_RACK' });
  }, []);

  const saveReport = useCallback(() => {
    const endReason = state.ui.winners.length > 0
      ? `${state.ui.winners[0].player.name} wins with ${state.ui.winners[0].finalScore} points`
      : 'Game Over';
    const html = generateReport(state.game, endReason, state.ui.turnAnalyses);
    downloadReport(html);
  }, [state.game, state.ui.winners, state.ui.turnAnalyses]);

  const lastMoveRef = useRef<{ board: import('../types/BoardSquare').BoardSquare[][]; rack: import('../types/Tile').Tile[]; playerIndex: number; turnNumber: number } | null>(null);

  const handleAIMove = useCallback(async () => {
    if (isAIThinkingRef.current) return;
    isAIThinkingRef.current = true;

    try {
      const s = stateRef.current;
      const currentPlayer = s.game.players[s.game.currentPlayerIndex];
      if (currentPlayer.type !== 'computer') return;

      const difficulty = currentPlayer.difficulty;
      if (!difficulty) return;

      const isEndgame = s.game.bag.count <= 6 || currentPlayer.rack.length <= 3;
      let effectiveDifficulty = difficulty;
      if (isEndgame && difficulty !== 'beginner') {
        effectiveDifficulty = difficulty === 'expert' ? 'intermediate' : 'beginner';
        debugLogger.log(s.game.turnNumber, currentPlayer.name, 'AI', `Endgame detected — reducing difficulty from ${difficulty} to ${effectiveDifficulty}`);
      }

      debugLogger.log(s.game.turnNumber, currentPlayer.name, 'AI', `Requesting AI move for ${currentPlayer.name} (${effectiveDifficulty})${isEndgame ? ' [ENDGAME]' : ''}`);

      const result = await solverManager.getAIMove(
        s.game.board,
        currentPlayer.rack,
        effectiveDifficulty
      );

      if (!result.found || !result.word || result.score === undefined) {
        const bagCount = s.game.bag.count;
        const rackSize = currentPlayer.rack.length;
        if (bagCount > 0 && rackSize > 0) {
          const exchangeCount = Math.min(rackSize, bagCount, 7);
          const shuffled = [...currentPlayer.rack].sort(() => Math.random() - 0.5);
          const tileIds = shuffled.slice(0, exchangeCount).map(t => t.id);
          debugLogger.log(s.game.turnNumber, currentPlayer.name, 'AI', `AI found no moves — exchanging ${tileIds.length} tiles`);
          dispatch({ type: 'EXCHANGE_TILES', tileIds });
        } else {
          debugLogger.log(s.game.turnNumber, currentPlayer.name, 'AI', `AI found no valid moves at ${effectiveDifficulty} difficulty — passing`);
          dispatch({ type: 'PASS' });
        }
        return;
      }

      debugLogger.log(s.game.turnNumber, currentPlayer.name, 'AI', `AI chose: ${result.word} at (${result.row},${result.col}) ${result.horizontal ? 'H' : 'V'} score=${result.score}`);

      const placements: { tile: import('../types/Tile').Tile; row: number; col: number }[] = [];
      const chars = result.word.split('');
      const rackCopy = [...s.game.players[s.game.currentPlayerIndex].rack];
      for (let i = 0; i < chars.length; i++) {
        const r = result.horizontal ? result.row! : result.row! + i;
        const c = result.horizontal ? result.col! + i : result.col!;
        if (s.game.board[r][c].tile !== null) continue;
        const tileIdx = rackCopy.findIndex(t => t.letter === chars[i]);
        if (tileIdx === -1) {
          debugLogger.log(s.game.turnNumber, currentPlayer.name, 'ERROR', `AI rack missing letter '${chars[i]}' for word '${result.word}'`);
          dispatch({ type: 'PASS' });
          return;
        }
        placements.push({ tile: rackCopy[tileIdx], row: r, col: c });
        rackCopy.splice(tileIdx, 1);
      }

      if (placements.length === 0) {
        dispatch({ type: 'PASS' });
        return;
      }

      const validation = validatePlacement(
        placements.map(p => ({ tile: p.tile, row: p.row, col: p.col })),
        s.game.board
      );

      if (!validation.valid) {
        debugLogger.log(s.game.turnNumber, currentPlayer.name, 'ERROR',
          `AI move '${result.word}' failed placement validation: ${validation.error}`);
        dispatch({ type: 'PASS' });
        return;
      }

      const wordStrings = validation.words!.map(w =>
        w.positions.map(p => {
          const placed = placements.find(t => t.row === p.row && t.col === p.col);
          return placed ? placed.tile.letter : (s.game.board[p.row][p.col].tile?.letter ?? '');
        }).join('')
      );

      const { valid: allWordsValid, invalidWords } = wordValidator.validateWords(wordStrings);
      if (!allWordsValid) {
        debugLogger.log(s.game.turnNumber, currentPlayer.name, 'ERROR',
          `AI move '${result.word}' creates invalid word(s): ${invalidWords.join(', ')}`);
        dispatch({ type: 'PASS' });
        return;
      }

      const isBingo = placements.length === 7;
      const move: Move = {
        tiles: placements.map(p => ({ tile: p.tile, row: p.row, col: p.col })),
        direction: result.horizontal ? 'horizontal' : 'vertical',
        score: result.score,
        wordsFormed: wordStrings,
        isBingo,
        startRow: Math.min(...placements.map(p => p.row)),
        startCol: Math.min(...placements.map(p => p.col)),
        tileCount: placements.length,
      };

      lastMoveRef.current = {
        board: s.game.board.map(row => row.map(sq => ({ ...sq, tile: sq.tile ? { ...sq.tile } : null }))),
        rack: [...s.game.players[s.game.currentPlayerIndex].rack],
        playerIndex: s.game.currentPlayerIndex,
        turnNumber: s.game.turnNumber,
      };

      dispatch({ type: 'COMMIT_MOVE', move });
    } catch (e) {
      const s = stateRef.current;
      const currentPlayer = s.game.players[s.game.currentPlayerIndex];
      const msg = e instanceof Error ? e.message : String(e);
      debugLogger.error(s.game.turnNumber, currentPlayer?.name ?? '?', `AI move error: ${msg}`);
      dispatch({ type: 'SET_ERROR', message: `AI error: ${msg}` });
    } finally {
      isAIThinkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }

    if (state.game.phase !== 'playing') return;

    const currentPlayer = state.game.players[state.game.currentPlayerIndex];
    if (currentPlayer.type === 'computer' && !isAIThinkingRef.current) {
      aiTimerRef.current = setTimeout(() => {
        handleAIMove();
      }, 6000);
    }

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [state.game.currentPlayerIndex, state.game.phase, state.game.players, handleAIMove]);

  useEffect(() => {
    if (state.game.phase === 'playing') {
      const lastMove = state.game.moveHistory[state.game.moveHistory.length - 1];
      if (lastMove && lastMove.action.type === 'play') {
        const turnNum = lastMove.turnNumber;
        const player = state.game.players[lastMove.playerIndex];

        const saved = lastMoveRef.current;
        const boardForAnalysis = saved && saved.turnNumber === turnNum
          ? saved.board
          : state.game.board.map(row =>
              row.map(sq => sq.tile ? { ...sq } : { ...sq, tile: null })
            );
        const rackForAnalysis = saved && saved.turnNumber === turnNum
          ? saved.rack
          : [...player.rack];

        solverManager.analyzeMoves(boardForAnalysis, rackForAnalysis).then(moves => {
          dispatch({ type: 'SET_ANALYSIS', turn: turnNum, moves });
        });
      }
    }
  }, [state.game.moveHistory.length]);

  const value: GameContextValue = {
    state,
    dispatch,
    attemptPlay,
    exchangeTiles,
    pass: passAction,
    forfeit,
    shuffleRack,
    startNewGame,
    loadSavedGame: loadSavedGameAction,
    getSavedGameExists,
    saveCurrentGame,
    saveReport,
    isAIThinking: isAIThinkingRef.current,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

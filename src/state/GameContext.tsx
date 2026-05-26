import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { gameReducer, initialAppState, type AppState, type GameAction, type UIState } from './gameReducer';
import type { GameState, AnalyzedMove } from '../types/GameState';
import type { Player } from '../types/Player';
import type { Move } from '../types/Move';
import { solverManager } from '../solver/SolverManager';
import { saveGame, loadGame, hasSavedGame, deleteSavedGame } from '../utils/persistence';
import { generateReport, downloadReport } from '../utils/reportGenerator';

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

  const getSavedGameExists = useCallback(() => hasSavedGame(), []);

  const saveCurrentGame = useCallback(() => {
    if (state.game.phase === 'playing') saveGame(state.game);
    else deleteSavedGame();
  }, [state.game]);

  useEffect(() => {
    if (state.game.phase === 'playing') saveGame(state.game);
  }, [state.game]);

  const startNewGame = useCallback((players: Player[]) => {
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

  const handleAIMove = useCallback(async () => {
    if (isAIThinkingRef.current) return;
    isAIThinkingRef.current = true;

    try {
      const currentPlayer = state.game.players[state.game.currentPlayerIndex];
      if (currentPlayer.type !== 'computer') return;

      const difficulty = currentPlayer.difficulty;
      if (!difficulty) return;

      const isEndgame = state.game.bag.count <= 6 || currentPlayer.rack.length <= 3;
      let effectiveDifficulty = difficulty;
      if (isEndgame && difficulty !== 'beginner') {
        effectiveDifficulty = difficulty === 'expert' ? 'intermediate' : 'beginner';
      }

      const result = await solverManager.getAIMove(
        state.game.board,
        currentPlayer.rack,
        effectiveDifficulty
      );

      if (!result.found || !result.word || result.score === undefined) {
        dispatch({ type: 'PASS' });
        return;
      }

      const placements: { tile: import('../types/Tile').Tile; row: number; col: number }[] = [];
      const chars = result.word.split('');
      for (let i = 0; i < chars.length; i++) {
        const r = result.horizontal ? result.row! : result.row! + i;
        const c = result.horizontal ? result.col! + i : result.col!;
        if (state.game.board[r][c].tile !== null) continue;
        const rack = state.game.players[state.game.currentPlayerIndex].rack;
        const tileIdx = rack.findIndex(t => t.letter === chars[i]);
        if (tileIdx === -1) {
          dispatch({ type: 'PASS' });
          return;
        }
        placements.push({ tile: rack[tileIdx], row: r, col: c });
      }

      if (placements.length === 0) {
        dispatch({ type: 'PASS' });
        return;
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

      dispatch({ type: 'COMMIT_MOVE', move });
    } finally {
      isAIThinkingRef.current = false;
    }
  }, [state.game]);

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
        const boardCopy = state.game.board.map(row =>
          row.map(sq => sq.tile ? { ...sq } : { ...sq, tile: null })
        );
        solverManager.analyzeMoves(boardCopy, []).then(moves => {
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

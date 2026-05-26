import { useState, useEffect, useRef, useCallback } from 'react';
import type { Tile as TileType } from '../../types/Tile';
import type { Move } from '../../types/Move';
import { useGame } from '../../state/GameContext';
import { BoardGrid, type BoardGridHandle } from '../Board/BoardGrid';
import { AppleIntelligenceBorder } from '../Board/AppleIntelligenceBorder';
import { Rack } from '../Rack/Rack';
import { Scoreboard } from '../Scoreboard/Scoreboard';
import { MoveLog } from '../MoveLog/MoveLog';
import { ExchangePanel } from '../Exchange/ExchangePanel';
import { BingoConfetti } from '../Confetti/BingoConfetti';
import { TileBagView } from '../TileBag/TileBag';
import { debugLogger } from '../../utils/DebugLogger';

export function GameBoard() {
  const { state, dispatch, attemptPlay, exchangeTiles, pass: passTurn, forfeit } = useGame();
  const [showExchange, setShowExchange] = useState(false);
  const [showTileBag, setShowTileBag] = useState(false);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [animateBingo, setAnimateBingo] = useState(false);
  const [bingoScore, setBingoScore] = useState(0);
  const boardGridRef = useRef<BoardGridHandle>(null);

  const currentPlayer = state.game.players[state.game.currentPlayerIndex];
  const isAIThinking = state.game.players[state.game.currentPlayerIndex]?.type === 'computer';
  const prevMoveCount = state.game.moveHistory.length;

  useEffect(() => {
    if (prevMoveCount > 0 && state.ui.showBingoConfetti) {
      setAnimateBingo(true);
      setBingoScore(state.ui.bingoScore);
      const timer = setTimeout(() => setAnimateBingo(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [state.ui.showBingoConfetti, state.ui.bingoScore]);

  const handleCommitMove = useCallback((move: Move) => {
    attemptPlay(move);
  }, [attemptPlay]);

  const handleRecallTiles = useCallback((tiles: { tile: TileType; row: number; col: number }[]) => {
  }, []);

  const handleExchangeConfirm = useCallback((tileIds: string[]) => {
    exchangeTiles(tileIds);
    setShowExchange(false);
  }, [exchangeTiles]);

  const handleRackTileClick = useCallback((tile: TileType) => {
    setSelectedTileId(prev => prev === tile.id ? null : tile.id);
  }, []);

  const handleShuffle = useCallback(() => {
    dispatch({ type: 'SHUFFLE_RACK' });
  }, [dispatch]);

  const handleRackTilePointerDown = useCallback((tile: TileType, e: React.PointerEvent) => {
    boardGridRef.current?.handleRackPointerDown(tile, e);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showExchange || showTileBag) return;

      if (e.key === 'Enter' || e.key === 'Return') {
        e.preventDefault();
        boardGridRef.current?.handlePlay();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        boardGridRef.current?.handleRecall();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (!isAIThinking) handleShuffle();
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        if (!isAIThinking) {
          setShowExchange(true);
          debugLogger.log(state.game.turnNumber, currentPlayer?.name ?? '', 'STATE', 'Opened exchange panel via keyboard shortcut');
        }
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (!isAIThinking) passTurn();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showExchange, showTileBag, isAIThinking, handleShuffle, passTurn, state.game.turnNumber, currentPlayer?.name]);

  if (state.game.phase !== 'playing') return null;

  return (
    <div className="game-board">
      <div className="game-sidebar">
        <Scoreboard
          players={state.game.players}
          currentPlayerIndex={state.game.currentPlayerIndex}
          turnNumber={state.game.turnNumber}
        />
        <MoveLog moveHistory={state.game.moveHistory} players={state.game.players} />
        <div className="sidebar-actions">
          <button className="btn btn-ghost" onClick={() => setShowTileBag(true)}>
            Tile Bag: {state.game.bag.count}
          </button>
        </div>
      </div>

      <div className="game-center">
        {state.ui.errorMessage && (
          <div className="error-banner">{state.ui.errorMessage}</div>
        )}

        <div className="board-container">
          <BoardGrid
            ref={boardGridRef}
            board={state.game.board}
            onCommitMove={handleCommitMove}
            rackTiles={currentPlayer?.rack ?? []}
            onRecallTiles={handleRecallTiles}
            readOnly={isAIThinking}
          />

          {isAIThinking && <AppleIntelligenceBorder />}
        </div>

        {showExchange ? (
          <ExchangePanel
            rack={currentPlayer?.rack ?? []}
            onExchange={handleExchangeConfirm}
            onCancel={() => setShowExchange(false)}
            bagCount={state.game.bag.count}
          />
        ) : (
          <>
            <Rack
              tiles={currentPlayer?.rack ?? []}
              selectedTileId={selectedTileId}
              onTileClick={handleRackTileClick}
              onTilePointerDown={handleRackTilePointerDown}
            />

            <div className="action-buttons">
              <button
                className="btn btn-secondary"
                disabled={state.game.bag.count === 0 || isAIThinking}
                onClick={() => setShowExchange(true)}
              >
                Exchange
              </button>
              <button
                className="btn btn-ghost"
                disabled={isAIThinking}
                onClick={passTurn}
              >
                Pass
              </button>
              <button
                className="btn btn-ghost"
                disabled={isAIThinking}
                onClick={handleShuffle}
              >
                Shuffle
              </button>
              <button
                className="btn btn-danger"
                disabled={isAIThinking}
                onClick={forfeit}
              >
                Forfeit
              </button>
            </div>
          </>
        )}
      </div>

      {showTileBag && (
        <div className="modal-overlay" onClick={() => setShowTileBag(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <TileBagView bag={state.game.bag} />
            <button className="btn btn-secondary" onClick={() => setShowTileBag(false)}>Close</button>
          </div>
        </div>
      )}

      {animateBingo && <BingoConfetti score={bingoScore} onDone={() => setAnimateBingo(false)} />}
    </div>
  );
}

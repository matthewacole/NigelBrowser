import { useState, useEffect, useRef, useCallback } from 'react';
import type { Tile as TileType } from '../../types/Tile';
import type { Move } from '../../types/Move';
import { useGame } from '../../state/GameContext';
import { useResponsive } from '../../hooks/useResponsive';
import { BoardGrid, type BoardGridHandle } from '../Board/BoardGrid';

import { Rack } from '../Rack/Rack';
import { Scoreboard } from '../Scoreboard/Scoreboard';
import { ScoreBar } from '../ScoreBar/ScoreBar';
import { MoveLog } from '../MoveLog/MoveLog';
import { ExchangePanel } from '../Exchange/ExchangePanel';
import { BingoConfetti } from '../Confetti/BingoConfetti';
import { TileBagView } from '../TileBag/TileBag';
import { Settings } from '../Settings/Settings';
import { debugLogger } from '../../utils/DebugLogger';

interface GameBoardProps {
  onSimulatorLaunch?: () => void;
}

export function GameBoard({ onSimulatorLaunch }: GameBoardProps) {
  const { state, dispatch, attemptPlay, exchangeTiles, pass: passTurn, forfeit } = useGame();
  const { isMobile, isTablet } = useResponsive();
  const sidebarWidth = isMobile ? 0 : isTablet ? 220 : 280;
  const boardPadding = isMobile ? 4 : 32;
  const [showExchange, setShowExchange] = useState(false);
  const [showTileBag, setShowTileBag] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [animateBingo, setAnimateBingo] = useState(false);
  const [bingoScore, setBingoScore] = useState(0);
  const [placedTileIds, setPlacedTileIds] = useState<string[]>([]);
  const [aiStaggerMap, setAiStaggerMap] = useState<Map<string, number>>(new Map());
  const boardGridRef = useRef<BoardGridHandle>(null);

  const currentPlayer = state.game.players[state.game.currentPlayerIndex];
  const isAIThinking = state.game.players[state.game.currentPlayerIndex]?.type === 'computer';

  const visibleRack = (currentPlayer?.rack ?? []).filter(t => !placedTileIds.includes(t.id));

  useEffect(() => {
    if (state.ui.showBingoConfetti) {
      setAnimateBingo(true);
      setBingoScore(state.ui.bingoScore);
      const timer = setTimeout(() => setAnimateBingo(false), 4500);
      return () => clearTimeout(timer);
    }
  }, [state.ui.showBingoConfetti, state.ui.bingoScore]);

  // AI staggered tile placement
  useEffect(() => {
    const positions = state.ui.lastPlacedTilePositions;
    if (positions.length > 0) {
      const lastMove = state.game.moveHistory[state.game.moveHistory.length - 1];
      const lastPlayer = lastMove ? state.game.players[lastMove.playerIndex] : null;
      if (lastPlayer?.type === 'computer') {
        const stagger = new Map<string, number>();
        positions.forEach((pos, i) => {
          stagger.set(`${pos.row},${pos.col}`, i * 0.4);
        });
        setAiStaggerMap(stagger);
        const maxDelay = positions.length * 400 + 100;
        const timer = setTimeout(() => setAiStaggerMap(new Map()), maxDelay);
        return () => clearTimeout(timer);
      }
    }
  }, [state.game.moveHistory.length, state.ui.lastPlacedTilePositions, state.game.players]);

  const handleCommitMove = useCallback((move: Move) => {
    attemptPlay(move);
  }, [attemptPlay]);

  const handlePlacedTilesChange = useCallback((ids: string[]) => {
    setPlacedTileIds(ids);
  }, []);

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

  if (state.game.phase !== 'playing') {
    debugLogger.log(state.game.turnNumber, 'SYSTEM', 'STATE', `GameBoard returning null — phase is '${state.game.phase}'`);
    return null;
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="game-board-mobile">
        <ScoreBar
          players={state.game.players}
          currentPlayerIndex={state.game.currentPlayerIndex}
          turnNumber={state.game.turnNumber}
          moveHistory={state.game.moveHistory}
          onSettingsClick={() => setShowSettings(true)}
          bagCount={state.game.bag.count}
        />

        {state.ui.errorMessage && (
          <div className="error-banner">{state.ui.errorMessage}</div>
        )}

        <div className="board-container-mobile">
          <BoardGrid
            ref={boardGridRef}
            board={state.game.board}
            onCommitMove={handleCommitMove}
            rackTiles={visibleRack}
            onRecallTiles={handleRecallTiles}
            onPlacedTilesChange={handlePlacedTilesChange}
            readOnly={isAIThinking}
            aiStaggerMap={aiStaggerMap}
            sidebarWidth={0}
            padding={boardPadding}
          />
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
            {isAIThinking ? (
              <div className="rack rack-thinking">Computer thinking…</div>
            ) : (
              <Rack
                tiles={visibleRack}
                selectedTileId={selectedTileId}
                onTileClick={handleRackTileClick}
                onTilePointerDown={handleRackTilePointerDown}
              />
            )}

            <div className="action-buttons action-buttons-mobile">
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

        {showTileBag && (
          <div className="modal-overlay" onClick={() => setShowTileBag(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <TileBagView bag={state.game.bag} />
              <button className="btn btn-secondary" onClick={() => setShowTileBag(false)}>Close</button>
            </div>
          </div>
        )}

        {showSettings && (
          <Settings onClose={() => setShowSettings(false)} onSimulatorClick={onSimulatorLaunch} />
        )}

        {animateBingo && <BingoConfetti score={bingoScore} onDone={() => setAnimateBingo(false)} />}
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="game-board">
      <div className="game-main">
        <div className="game-sidebar">
          <Scoreboard
            players={state.game.players}
            currentPlayerIndex={state.game.currentPlayerIndex}
            turnNumber={state.game.turnNumber}
          />
          <MoveLog moveHistory={state.game.moveHistory} players={state.game.players} />
          <div className="sidebar-actions">
            <button className="btn btn-ghost sidebar-settings-btn" onClick={() => setShowSettings(true)}>
              ⚙
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
              rackTiles={visibleRack}
              onRecallTiles={handleRecallTiles}
              onPlacedTilesChange={handlePlacedTilesChange}
              readOnly={isAIThinking}
              aiStaggerMap={aiStaggerMap}
              sidebarWidth={sidebarWidth}
              padding={boardPadding}
            />
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
              {isAIThinking ? (
                <div className="rack rack-thinking">Computer thinking…</div>
              ) : (
                <Rack
                  tiles={visibleRack}
                  selectedTileId={selectedTileId}
                  onTileClick={handleRackTileClick}
                  onTilePointerDown={handleRackTilePointerDown}
                />
              )}

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
      </div>

      <div className="game-footer">
        <button onClick={() => setShowTileBag(true)}>
          Tile Bag: {state.game.bag.count}
        </button>
        <span>Turn {state.game.turnNumber}</span>
      </div>

      {showTileBag && (
        <div className="modal-overlay" onClick={() => setShowTileBag(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <TileBagView bag={state.game.bag} />
            <button className="btn btn-secondary" onClick={() => setShowTileBag(false)}>Close</button>
          </div>
        </div>
      )}

      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} onSimulatorClick={onSimulatorLaunch} />
      )}

      {animateBingo && <BingoConfetti score={bingoScore} onDone={() => setAnimateBingo(false)} />}
    </div>
  );
}

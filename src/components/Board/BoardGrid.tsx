import { useRef, useCallback, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { BoardSquare } from '../../types/BoardSquare';
import type { Tile as TileType } from '../../types/Tile';
import type { Move } from '../../types/Move';
import { BOARD_SIZE } from '../../types/Constants';
import { getBoardSquareSize } from '../../styles/board';
import { BoardCell } from './BoardCell';
import { validatePlacement, calculateScore } from '../../engine/GameEngine';
import { wordValidator } from '../../engine/WordValidator';

interface BoardGridProps {
  board: BoardSquare[][];
  onCommitMove: (move: Move) => void;
  rackTiles: TileType[];
  onRecallTiles: (tiles: { tile: TileType; row: number; col: number }[]) => void;
  onPlacedTilesChange?: (placedTileIds: string[]) => void;
  readOnly?: boolean;
  aiStaggerMap?: Map<string, number>;
}

export interface BoardGridHandle {
  handleRackPointerDown: (tile: TileType, e: React.PointerEvent) => void;
  handlePlay: () => void;
  handleRecall: () => void;
  hasPlacedTiles: () => boolean;
}

interface DragState {
  active: boolean;
  tile: TileType | null;
  fromRack: boolean;
  fromRow: number;
  fromCol: number;
  currentRow: number;
  currentCol: number;
  screenX: number;
  screenY: number;
}

const EMPTY_DRAG: DragState = {
  active: false,
  tile: null,
  fromRack: false,
  fromRow: -1,
  fromCol: -1,
  currentRow: -1,
  currentCol: -1,
  screenX: 0,
  screenY: 0,
};

export const BoardGrid = forwardRef<BoardGridHandle, BoardGridProps>(function BoardGrid({
  board, onCommitMove, rackTiles, onRecallTiles, readOnly, onPlacedTilesChange, aiStaggerMap
}, ref) {
  const [drag, setDrag] = useState<DragState>(EMPTY_DRAG);
  const [placedTiles, setPlacedTiles] = useState<Map<string, { tile: TileType; row: number; col: number }>>(new Map());
  const [justPlacedIds, setJustPlacedIds] = useState<Set<string>>(new Set());
  const [dropFlash, setDropFlash] = useState<{ row: number; col: number; success: boolean } | null>(null);
  const [cellSize, setCellSize] = useState(() => getBoardSquareSize(window.innerWidth));
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>(EMPTY_DRAG);
  const placedRef = useRef<Map<string, { tile: TileType; row: number; col: number }>>(new Map());

  useEffect(() => {
    const handleResize = () => {
      setCellSize(getBoardSquareSize(window.innerWidth));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  dragRef.current = drag;
  placedRef.current = placedTiles;

  useEffect(() => {
    onPlacedTilesChange?.(Array.from(placedTiles.values()).map(p => p.tile.id));
  }, [placedTiles, onPlacedTilesChange]);

  const getBoardCell = useCallback((clientX: number, clientY: number): { row: number; col: number } | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
    return { row, col };
  }, [cellSize]);

  const isBoardSquareOccupied = useCallback((row: number, col: number): boolean => {
    if (board[row][col].tile !== null) return true;
    return placedRef.current.has(`${row},${col}`);
  }, [board]);

  const handleRackPointerDown = useCallback((tile: TileType, e: React.PointerEvent) => {
    if (readOnly) return;
    e.preventDefault();
    const cell = getBoardCell(e.clientX, e.clientY);
    const newDrag: DragState = {
      active: true,
      tile,
      fromRack: true,
      fromRow: -1,
      fromCol: -1,
      currentRow: cell?.row ?? -1,
      currentCol: cell?.col ?? -1,
      screenX: e.clientX,
      screenY: e.clientY,
    };
    setDrag(newDrag);
    dragRef.current = newDrag;
  }, [readOnly, getBoardCell]);

  const handleBoardPointerDown = useCallback((row: number, col: number, e: React.PointerEvent) => {
    if (readOnly) return;
    const key = `${row},${col}`;
    const placed = placedRef.current.get(key);
    if (!placed) return;
    e.preventDefault();
    const newDrag: DragState = {
      active: true,
      tile: placed.tile,
      fromRack: false,
      fromRow: row,
      fromCol: col,
      currentRow: row,
      currentCol: col,
      screenX: e.clientX,
      screenY: e.clientY,
    };
    setDrag(newDrag);
    dragRef.current = newDrag;
  }, [readOnly]);

  useEffect(() => {
    if (!drag.active) return;

    const handleMove = (e: PointerEvent) => {
      const cell = getBoardCell(e.clientX, e.clientY);
      setDrag(prev => ({
        ...prev,
        currentRow: cell?.row ?? -1,
        currentCol: cell?.col ?? -1,
        screenX: e.clientX,
        screenY: e.clientY,
      }));
    };

    const handleUp = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d.active || !d.tile) {
        setDrag(EMPTY_DRAG);
        dragRef.current = EMPTY_DRAG;
        return;
      }

      const cell = getBoardCell(e.clientX, e.clientY);

      if (cell && !isBoardSquareOccupied(cell.row, cell.col)) {
        if (d.fromRack) {
          setPlacedTiles(prev => {
            const next = new Map(prev);
            next.set(`${cell.row},${cell.col}`, { tile: d.tile!, row: cell.row, col: cell.col });
            placedRef.current = next;
            return next;
          });
          setJustPlacedIds(prev => new Set(prev).add(d.tile!.id));
          setTimeout(() => {
            setJustPlacedIds(prev => {
              const next = new Set(prev);
              next.delete(d.tile!.id);
              return next;
            });
          }, 400);
        } else {
          setPlacedTiles(prev => {
            const next = new Map(prev);
            next.delete(`${d.fromRow},${d.fromCol}`);
            next.set(`${cell.row},${cell.col}`, { tile: d.tile!, row: cell.row, col: cell.col });
            placedRef.current = next;
            return next;
          });
        }
        setDropFlash({ row: cell.row, col: cell.col, success: true });
        setTimeout(() => setDropFlash(null), 300);
      } else if (!d.fromRack && cell === null) {
        setPlacedTiles(prev => {
          const next = new Map(prev);
          const removed = next.get(`${d.fromRow},${d.fromCol}`);
          if (removed) {
            next.delete(`${d.fromRow},${d.fromCol}`);
            placedRef.current = next;
            onRecallTiles([removed]);
          }
          return next;
        });
        setDropFlash({ row: d.fromRow, col: d.fromCol, success: false });
        setTimeout(() => setDropFlash(null), 300);
      } else if (cell && isBoardSquareOccupied(cell.row, cell.col)) {
        setDropFlash({ row: cell.row, col: cell.col, success: false });
        setTimeout(() => setDropFlash(null), 300);
      }

      setDrag(EMPTY_DRAG);
      dragRef.current = EMPTY_DRAG;
    };

    const handleCancel = () => {
      setDrag(EMPTY_DRAG);
      dragRef.current = EMPTY_DRAG;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
    };
  }, [drag.active, getBoardCell, isBoardSquareOccupied, onRecallTiles]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (readOnly) return;
    const key = `${row},${col}`;
    const placed = placedRef.current.get(key);
    if (placed) {
      setPlacedTiles(prev => {
        const next = new Map(prev);
        next.delete(key);
        placedRef.current = next;
        return next;
      });
      onRecallTiles([placed]);
    }
  }, [readOnly, onRecallTiles]);

  const getPreviewState = useCallback(() => {
    const placed = Array.from(placedRef.current.values());
    if (placed.length === 0) return null;

    const newTiles = placed.map(t => ({ tile: t.tile, row: t.row, col: t.col }));

    const validation = validatePlacement(newTiles, board);

    if (!validation.valid) {
      return { valid: false, error: validation.error ?? null, score: null, words: null };
    }

    const words = validation.words!.map(w => {
      return w.positions.map(p => {
        const placedTile = placedRef.current.get(`${p.row},${p.col}`);
        return placedTile ? placedTile.tile.letter : (board[p.row][p.col].tile?.letter ?? '');
      }).join('');
    });

    const { valid, invalidWords } = wordValidator.validateWords(words);
    if (!valid) {
      return { valid: false, error: `Not in dictionary: ${invalidWords.join(', ')}`, score: null, words: null };
    }

    const { score, isBingo, words: scoredWords } = calculateScore(
      newTiles,
      validation.direction!,
      board
    );

    return { valid: true, error: null, score, isBingo, words: scoredWords };
  }, [board]);

  const preview = getPreviewState();

  const handlePlay = useCallback(() => {
    if (!preview || !preview.valid || preview.score === null) return;
    const tiles = Array.from(placedRef.current.values());
    const validation = validatePlacement(
      tiles.map(t => ({ tile: t.tile, row: t.row, col: t.col })),
      board
    );
    if (!validation.valid || !validation.direction) return;
    const direction = validation.direction;
    const words = preview.words?.map(w => w.word) ?? [];
    const move: Move = {
      tiles: tiles.map(t => ({ tile: t.tile, row: t.row, col: t.col })),
      direction,
      score: preview.score,
      wordsFormed: words,
      isBingo: preview.isBingo ?? false,
      startRow: Math.min(...tiles.map(t => t.row)),
      startCol: Math.min(...tiles.map(t => t.col)),
      tileCount: tiles.length,
    };
    onCommitMove(move);
    setPlacedTiles(new Map());
    placedRef.current = new Map();
  }, [preview, board, onCommitMove]);

  const handleRecall = useCallback(() => {
    const tiles = Array.from(placedRef.current.values());
    onRecallTiles(tiles.map(t => ({ tile: t.tile, row: t.row, col: t.col })));
    setPlacedTiles(new Map());
    placedRef.current = new Map();
  }, [onRecallTiles]);

  useImperativeHandle(ref, () => ({
    handleRackPointerDown,
    handlePlay,
    handleRecall,
    hasPlacedTiles: () => placedRef.current.size > 0,
  }), [handleRackPointerDown, handlePlay, handleRecall]);

  const dragTile = drag.active ? (
    <div
      className="drag-preview tile"
      style={{
        left: drag.screenX - cellSize / 2,
        top: drag.screenY - cellSize / 2,
        width: cellSize,
        height: cellSize,
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 999,
      }}
    >
      <span className="tile-letter">{drag.tile!.letter}</span>
      <span className="tile-score">{drag.tile!.score}</span>
    </div>
  ) : null;

  return (
    <div className="board-grid-wrapper" style={{ position: 'relative' }}>
      <div
        ref={boardRef}
        className="board-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${BOARD_SIZE}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${BOARD_SIZE}, ${cellSize}px)`,
          gap: 0,
          position: 'relative',
        }}
      >
        {board.map((row, ri) =>
          row.map((square, ci) => {
            const placedKey = `${ri},${ci}`;
            const placed = placedTiles.get(placedKey);
            const tile = placed ? placed.tile : square.tile;
            const isJustPlaced = placed && justPlacedIds.has(placed.tile.id);
            const showFlash = dropFlash && dropFlash.row === ri && dropFlash.col === ci;
            const staggerDelay = aiStaggerMap?.get(`${ri},${ci}`);

            return (
              <BoardCell
                key={square.id}
                square={{
                  ...square,
                  tile: placed ? placed.tile : square.tile,
                }}
                cellSize={cellSize}
                tileJustPlaced={isJustPlaced}
                tileStaggerDelay={staggerDelay}
                dropFlash={showFlash}
                isDropTarget={drag.active && drag.currentRow === ri && drag.currentCol === ci}
                dropValid={!isBoardSquareOccupied(ri, ci)}
                onClick={() => handleCellClick(ri, ci)}
                onPointerDown={(e) => handleBoardPointerDown(ri, ci, e)}
              />
            );
          })
        )}
      </div>

      {dragTile}

      {preview && (
        <div className={`preview-bar ${preview.valid ? 'valid' : 'invalid'}`}>
          {preview.valid ? (
            <span>✓ {preview.words?.map(w => `${w.word} (${w.score})`).join(', ')} — {preview.score} pts</span>
          ) : (
            <span>✗ {preview.error}</span>
          )}
        </div>
      )}

      <div className="board-actions">
        <button className="btn btn-primary" disabled={!preview?.valid} onClick={handlePlay}>
          Play
        </button>
        <button className="btn btn-secondary" disabled={placedTiles.size === 0} onClick={handleRecall}>
          Recall
        </button>
      </div>
    </div>
  );
});

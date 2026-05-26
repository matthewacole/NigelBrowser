import { useRef, useCallback, useState } from 'react';
import type { BoardSquare } from '../../types/BoardSquare';
import type { Tile as TileType } from '../../types/Tile';
import type { PlacedTile, MoveDirection, Move } from '../../types/Move';
import { BOARD_SIZE } from '../../types/Constants';
import { boardSquareSize } from '../../styles/board';
import { BoardCell } from './BoardCell';
import { validatePlacement, calculateScore } from '../../engine/GameEngine';
import { wordValidator } from '../../engine/WordValidator';

interface BoardGridProps {
  board: BoardSquare[][];
  onCommitMove: (move: Move) => void;
  rackTiles: TileType[];
  onRecallTiles: (tiles: { tile: TileType; row: number; col: number }[]) => void;
  readOnly?: boolean;
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

export function BoardGrid({ board, onCommitMove, rackTiles, onRecallTiles, readOnly }: BoardGridProps) {
  const [drag, setDrag] = useState<DragState>(EMPTY_DRAG);
  const [placedTiles, setPlacedTiles] = useState<Map<string, { tile: TileType; row: number; col: number }>>(new Map());
  const boardRef = useRef<HTMLDivElement>(null);
  const cellSize = boardSquareSize;

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
    return placedTiles.has(`${row},${col}`);
  }, [board, placedTiles]);

  const handleRackPointerDown = useCallback((tile: TileType, e: React.PointerEvent) => {
    if (readOnly) return;
    e.preventDefault();
    const cell = getBoardCell(e.clientX, e.clientY);
    setDrag({
      active: true,
      tile,
      fromRack: true,
      fromRow: -1,
      fromCol: -1,
      currentRow: cell?.row ?? -1,
      currentCol: cell?.col ?? -1,
      screenX: e.clientX,
      screenY: e.clientY,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [readOnly, getBoardCell]);

  const handleBoardPointerDown = useCallback((row: number, col: number, e: React.PointerEvent) => {
    if (readOnly) return;
    const key = `${row},${col}`;
    const placed = placedTiles.get(key);
    if (!placed) return;
    e.preventDefault();
    setDrag({
      active: true,
      tile: placed.tile,
      fromRack: false,
      fromRow: row,
      fromCol: col,
      currentRow: row,
      currentCol: col,
      screenX: e.clientX,
      screenY: e.clientY,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [readOnly, placedTiles]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.active) return;
    const cell = getBoardCell(e.clientX, e.clientY);
    setDrag(prev => ({
      ...prev,
      currentRow: cell?.row ?? -1,
      currentCol: cell?.col ?? -1,
      screenX: e.clientX,
      screenY: e.clientY,
    }));
  }, [drag.active, getBoardCell]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!drag.active || !drag.tile) {
      setDrag(EMPTY_DRAG);
      return;
    }

    const cell = getBoardCell(e.clientX, e.clientY);

    if (cell && !isBoardSquareOccupied(cell.row, cell.col)) {
      if (drag.fromRack) {
        setPlacedTiles(prev => {
          const next = new Map(prev);
          next.set(`${cell.row},${cell.col}`, { tile: drag.tile!, row: cell.row, col: cell.col });
          return next;
        });
      } else {
        setPlacedTiles(prev => {
          const next = new Map(prev);
          next.delete(`${drag.fromRow},${drag.fromCol}`);
          next.set(`${cell.row},${cell.col}`, { tile: drag.tile!, row: cell.row, col: cell.col });
          return next;
        });
      }
    } else if (!drag.fromRack && cell === null) {
      setPlacedTiles(prev => {
        const next = new Map(prev);
        const removed = next.get(`${drag.fromRow},${drag.fromCol}`);
        if (removed) {
          next.delete(`${drag.fromRow},${drag.fromCol}`);
          onRecallTiles([removed]);
        }
        return next;
      });
    }

    setDrag(EMPTY_DRAG);
  }, [drag, getBoardCell, isBoardSquareOccupied, onRecallTiles]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (readOnly) return;
    const key = `${row},${col}`;
    const placed = placedTiles.get(key);
    if (placed) {
      setPlacedTiles(prev => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      onRecallTiles([placed]);
    }
  }, [readOnly, placedTiles, onRecallTiles]);

  const getPreviewState = useCallback(() => {
    const tiles = Array.from(placedTiles.values());
    if (tiles.length === 0) return null;

    const validation = validatePlacement(
      tiles.map(t => ({ tile: t.tile, row: t.row, col: t.col })),
      board
    );

    if (!validation.valid) {
      return { valid: false, error: validation.error ?? null, score: null, words: null };
    }

    const words = validation.words!.map(w => {
      return w.positions.map(p => board[p.row][p.col].tile?.letter ?? '').join('');
    });

    const { valid, invalidWords } = wordValidator.validateWords(words);
    if (!valid) {
      return { valid: false, error: `Not in dictionary: ${invalidWords.join(', ')}`, score: null, words: null };
    }

    const { score, isBingo, words: scoredWords } = calculateScore(
      tiles.map(t => ({ tile: t.tile, row: t.row, col: t.col })),
      validation.direction!,
      board
    );

    return { valid: true, error: null, score, isBingo, words: scoredWords };
  }, [placedTiles, board]);

  const preview = getPreviewState();

  const handlePlay = useCallback(() => {
    if (!preview || !preview.valid || preview.score === null) return;
    const tiles = Array.from(placedTiles.values());
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
  }, [preview, placedTiles, board, onCommitMove]);

  const handleRecall = useCallback(() => {
    const tiles = Array.from(placedTiles.values());
    onRecallTiles(tiles.map(t => ({ tile: t.tile, row: t.row, col: t.col })));
    setPlacedTiles(new Map());
  }, [placedTiles, onRecallTiles]);

  return (
    <div
      className="board-grid-wrapper"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setDrag(EMPTY_DRAG)}
      style={{ position: 'relative' }}
    >
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
          row.map((square, ci) => (
            <BoardCell
              key={square.id}
              square={{
                ...square,
                tile: placedTiles.has(`${ri},${ci}`) ? placedTiles.get(`${ri},${ci}`)!.tile : square.tile,
              }}
              cellSize={cellSize}
              isDropTarget={drag.active && drag.currentRow === ri && drag.currentCol === ci}
              dropValid={!isBoardSquareOccupied(ri, ci)}
              onClick={() => handleCellClick(ri, ci)}
              onPointerEnter={() => {}}
              onPointerLeave={() => {}}
            />
          ))
        )}
      </div>

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
}

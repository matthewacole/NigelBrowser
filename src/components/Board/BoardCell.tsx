import type { BoardSquare } from '../../types/BoardSquare';
import { bonusDisplayText } from '../../types/Constants';
import { Tile } from '../Tile/Tile';

interface BoardCellProps {
  square: BoardSquare;
  cellSize: number;
  isDropTarget?: boolean;
  dropValid?: boolean;
  onClick?: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

const BONUS_COLORS: Record<string, string> = {
  tripleWord: '#ef4444',
  doubleWord: '#f0ab8d',
  tripleLetter: '#3b82f6',
  doubleLetter: '#7dd3fc',
  center: '#f0ab8d',
  normal: 'transparent',
};

export function BoardCell({
  square,
  cellSize,
  isDropTarget,
  dropValid,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: BoardCellProps) {
  const hasTile = square.tile !== null;
  const bonus = square.bonus;
  const bgColor = hasTile ? 'var(--cell-occupied)' : BONUS_COLORS[bonus] || 'transparent';

  let className = 'board-cell';
  if (isDropTarget) className += dropValid ? ' drop-valid' : ' drop-invalid';
  if (hasTile) className += ' occupied';

  return (
    <div
      className={className}
      style={{
        width: cellSize,
        height: cellSize,
        backgroundColor: bgColor,
        position: 'relative',
      }}
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {!hasTile && bonus !== 'normal' && (
        <span className="bonus-label">{bonusDisplayText(bonus)}</span>
      )}
      {hasTile && square.tile && (
        <Tile
          tile={square.tile}
          size={cellSize - 2}
          style={{ borderRadius: 2, boxShadow: 'none' }}
        />
      )}
    </div>
  );
}

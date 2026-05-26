import type { BoardSquare } from '../../types/BoardSquare';
import { bonusDisplayText } from '../../types/Constants';
import { Tile } from '../Tile/Tile';

interface BoardCellProps {
  square: BoardSquare;
  cellSize: number;
  isDropTarget?: boolean;
  dropValid?: boolean;
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

const BONUS_COLORS: Record<string, string> = {
  tripleWord: 'rgba(255, 59, 48, 0.25)',
  doubleWord: 'rgba(255, 159, 10, 0.2)',
  tripleLetter: 'rgba(74, 158, 255, 0.25)',
  doubleLetter: 'rgba(74, 158, 255, 0.15)',
  center: 'rgba(255, 159, 10, 0.25)',
  normal: 'transparent',
};

const BONUS_TEXT_COLORS: Record<string, string> = {
  tripleWord: '#ff6659',
  doubleWord: '#ffb340',
  tripleLetter: '#6bb3ff',
  doubleLetter: '#8ec4ff',
  center: '#ffb340',
  normal: 'transparent',
};

export function BoardCell({
  square,
  cellSize,
  isDropTarget,
  dropValid,
  onClick,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
}: BoardCellProps) {
  const hasTile = square.tile !== null;
  const bonus = square.bonus;
  const bgColor = hasTile ? 'var(--cell-occupied)' : BONUS_COLORS[bonus] || 'transparent';
  const textColor = BONUS_TEXT_COLORS[bonus] || 'rgba(255,255,255,0.8)';

  let className = 'board-cell';
  if (isDropTarget) className += dropValid ? ' drop-valid' : ' drop-invalid';
  if (hasTile) className += ' occupied';

  const premiumLabel = !hasTile && bonus !== 'normal' && bonusDisplayText(bonus);
  const isPremium = !hasTile && bonus !== 'normal';

  return (
    <div
      className={className}
      style={{
        width: cellSize,
        height: cellSize,
        backgroundColor: bgColor,
        position: 'relative',
        borderRadius: isPremium ? 3 : 0,
      }}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {!hasTile && bonus !== 'normal' && (
        <span
          className="bonus-label"
          style={{
            color: textColor,
            fontSize: 9,
            fontWeight: 800,
            textShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}
        >
          {bonusDisplayText(bonus)}
        </span>
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

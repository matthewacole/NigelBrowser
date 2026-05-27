import type { BoardSquare } from '../../types/BoardSquare';
import { bonusDisplayText } from '../../types/Constants';
import { Tile } from '../Tile/Tile';

interface BoardCellProps {
  square: BoardSquare;
  cellSize: number;
  tileJustPlaced?: boolean;
  tileStaggerDelay?: number;
  dropFlash?: { row: number; col: number; success: boolean } | null;
  isDropTarget?: boolean;
  dropValid?: boolean;
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

const BONUS_COLORS: Record<string, string> = {
  tripleWord: '#FF3B30',
  doubleWord: '#FF9500',
  tripleLetter: '#007AFF',
  doubleLetter: '#59ABE6',
  center: '#FF9500',
  normal: 'transparent',
};

const BONUS_TEXT_COLORS: Record<string, string> = {
  tripleWord: '#fff',
  doubleWord: '#fff',
  tripleLetter: '#fff',
  doubleLetter: '#fff',
  center: '#fff',
  normal: 'transparent',
};

export function BoardCell({
  square,
  cellSize,
  tileJustPlaced,
  tileStaggerDelay,
  dropFlash,
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

  const tileStyle: React.CSSProperties = {};
  if (tileStaggerDelay !== undefined) {
    tileStyle.animationDelay = `${tileStaggerDelay}s`;
  }

  return (
    <div
      className={className}
      style={{
        width: cellSize,
        height: cellSize,
        backgroundColor: bgColor,
        position: 'relative',
        borderRadius: isPremium ? 2 : 0,
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
          justPlaced={tileJustPlaced || tileStaggerDelay !== undefined}
          style={{ borderRadius: 2, boxShadow: 'none', ...tileStyle }}
        />
      )}
      {dropFlash && (
        <div className={`drop-flash ${dropFlash.success ? 'success' : 'error'}`} />
      )}
    </div>
  );
}

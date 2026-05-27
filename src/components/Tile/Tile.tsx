import type { Tile as TileType } from '../../types/Tile';

interface TileProps {
  tile: TileType;
  isSelected?: boolean;
  isDragging?: boolean;
  justPlaced?: boolean;
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  size?: number;
  style?: React.CSSProperties;
}

export function Tile({
  tile,
  isSelected,
  isDragging,
  justPlaced,
  onClick,
  onPointerDown,
  size = 44,
  style,
}: TileProps) {
  const letterSize = Math.max(10, Math.round(size * 0.41));
  const scoreSize = Math.max(6, Math.round(size * 0.205));

  return (
    <div
      className={`tile ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${justPlaced ? 'just-placed' : ''}`}
      style={{
        width: size,
        height: size,
        touchAction: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        ...style,
      }}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      <span className="tile-letter" style={{ fontSize: letterSize }}>{tile.letter}</span>
      <span className="tile-score" style={{ fontSize: scoreSize }}>{tile.score}</span>
    </div>
  );
}

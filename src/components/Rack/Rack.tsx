import type { Tile as TileType } from '../../types/Tile';
import { RACK_SIZE } from '../../types/Constants';
import { Tile } from '../Tile/Tile';

interface RackProps {
  tiles: TileType[];
  selectedTileId: string | null;
  onTileClick: (tile: TileType) => void;
  onTilePointerDown: (tile: TileType, e: React.PointerEvent) => void;
}

export function Rack({ tiles, selectedTileId, onTileClick, onTilePointerDown }: RackProps) {
  const displayTiles = tiles.slice(0, RACK_SIZE);
  const emptySlots = RACK_SIZE - displayTiles.length;

  return (
    <div className="rack">
      <div className="rack-tiles">
        {displayTiles.map(tile => (
          <Tile
            key={tile.id}
            tile={tile}
            isSelected={tile.id === selectedTileId}
            onClick={() => onTileClick(tile)}
            onPointerDown={(e) => onTilePointerDown(tile, e)}
          />
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={`empty-${i}`} className="tile empty" style={{ width: 44, height: 44 }} />
        ))}
      </div>
    </div>
  );
}

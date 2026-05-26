import { useState } from 'react';
import type { Tile as TileType } from '../../types/Tile';
import { Tile } from '../Tile/Tile';

interface ExchangePanelProps {
  rack: TileType[];
  onExchange: (tileIds: string[]) => void;
  onCancel: () => void;
  bagCount: number;
}

export function ExchangePanel({ rack, onExchange, onCancel, bagCount }: ExchangePanelProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleTile = (tile: TileType) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(tile.id)) next.delete(tile.id);
      else next.add(tile.id);
      return next;
    });
  };

  const canExchange = selected.size > 0 && selected.size <= bagCount;

  return (
    <div className="exchange-panel">
      <h3>Select tiles to exchange:</h3>
      <div className="exchange-tiles">
        {rack.map(tile => (
          <Tile
            key={tile.id}
            tile={tile}
            isSelected={selected.has(tile.id)}
            onClick={() => toggleTile(tile)}
          />
        ))}
      </div>
      <div className="exchange-actions">
        <button
          className="btn btn-primary"
          disabled={!canExchange}
          onClick={() => onExchange(Array.from(selected))}
        >
          Confirm Exchange
        </button>
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

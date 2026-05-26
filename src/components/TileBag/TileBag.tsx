import { TileBag as TileBagClass } from '../../engine/TileBag';

interface TileBagProps {
  bag: TileBagClass;
}

export function TileBagView({ bag }: TileBagProps) {
  const counts = new Map<string, number>();
  for (const tile of bag.tiles) {
    counts.set(tile.letter, (counts.get(tile.letter) ?? 0) + 1);
  }
  const sorted = Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="tilebag-view">
      <h3>Tile Bag ({bag.count} remaining)</h3>
      <div className="tilebag-grid">
        {sorted.map(([letter, count]) => (
          <div key={letter} className="tilebag-count">
            <span className="tilebag-letter">{letter}</span>
            <span className="tilebag-num">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

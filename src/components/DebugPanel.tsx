import { useState, useMemo } from 'react';
import { debugLogger, type DebugCategory } from '../utils/DebugLogger';

const ALL_CATEGORIES: DebugCategory[] = [
  'AI', 'ERROR', 'COMMIT', 'DRAW', 'EXCHANGE', 'PASS',
  'FORFEIT', 'BINGO', 'STATE', 'PLAY', 'VALIDATE',
  'PLACE', 'REMOVE', 'RECALL', 'DRAG', 'REPORT',
];

interface DebugPanelProps {
  onClose: () => void;
}

export function DebugPanel({ onClose }: DebugPanelProps) {
  const [filter, setFilter] = useState<DebugCategory | 'ALL'>('ALL');
  const entries = useMemo(() => debugLogger.getEntriesWithStored(), []);

  const filtered = filter === 'ALL'
    ? entries
    : entries.filter(e => e.category === filter);

  const handleDownload = () => {
    const json = debugLogger.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nigel-debug-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    debugLogger.clear();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal debug-panel" onClick={e => e.stopPropagation()} style={{ width: '90vw', maxWidth: 800, maxHeight: '80vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Debug Logs</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-secondary" onClick={handleDownload}>Download</button>
            <button className="btn btn-sm btn-danger" onClick={handleClear}>Clear</button>
            <button className="btn btn-sm btn-ghost" onClick={onClose}>Close</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
          <button
            className={`btn btn-sm ${filter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter('ALL')}
          >
            All ({entries.length})
          </button>
          {ALL_CATEGORIES.map(cat => {
            const count = entries.filter(e => e.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                className={`btn btn-sm ${filter === cat ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(cat)}
                style={{ fontSize: 11 }}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        <div style={{
          overflowY: 'auto',
          maxHeight: 'calc(80vh - 140px)',
          fontFamily: 'monospace',
          fontSize: 11,
          lineHeight: 1.6,
        }}>
          {filtered.length === 0 && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No log entries</p>
          )}
          {filtered.slice(-200).reverse().map((entry, i) => (
            <div key={i} style={{
              padding: '4px 8px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
            }}>
              <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', minWidth: 60 }}>
                {entry.timestamp.slice(11, 19)}
              </span>
              <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', minWidth: 30 }}>
                T{entry.turnNumber}
              </span>
              <span style={{
                color: entry.category === 'ERROR' ? 'var(--accent-red)' : 'var(--accent-purple)',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                minWidth: 70,
              }}>
                {entry.category}
              </span>
              <span style={{ color: 'var(--text-primary)', wordBreak: 'break-word', flex: 1 }}>
                {entry.playerName}: {entry.message}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

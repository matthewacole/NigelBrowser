import { useState, useRef, useEffect } from 'react';
import type { Player } from '../../types/Player';
import type { RecordedMove, GameState } from '../../types/GameState';
import type { TileBag } from '../../engine/TileBag';
import { difficultyDisplayName } from '../../types/Player';

interface ScoreBarProps {
  players: Player[];
  currentPlayerIndex: number;
  turnNumber: number;
  moveHistory: RecordedMove[];
  bag: TileBag;
}

function AnimatedScore({ score }: { score: number }) {
  const [display, setDisplay] = useState(score);
  const prevRef = useRef(score);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = prevRef.current;
    const diff = score - start;
    if (diff === 0) { setDisplay(score); return; }
    const duration = score >= 15 ? 1500 : 750;
    const delay = 100;
    const startTime = performance.now();
    function animate(now: number) {
      const elapsed = now - startTime - delay;
      if (elapsed <= 0) { setDisplay(start); frameRef.current = requestAnimationFrame(animate); return; }
      const p = Math.min(elapsed / duration, 1);
      setDisplay(Math.round(start + diff * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frameRef.current = requestAnimationFrame(animate);
      else { setDisplay(score); prevRef.current = score; }
    }
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [score]);

  return <>{display}</>;
}

export function ScoreBar({ players, currentPlayerIndex, turnNumber, moveHistory, bag }: ScoreBarProps) {
  const [showMoveLog, setShowMoveLog] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMoveLog) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMoveLog(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMoveLog]);

  return (
    <div className="score-bar" onClick={() => setShowMoveLog(!showMoveLog)}>
      <div className="score-bar-players">
        {players.map((player, idx) => (
          <div
            key={player.id}
            className={`score-bar-player ${idx === currentPlayerIndex ? 'active' : ''}`}
          >
            <span className="score-bar-name">
              {player.name}
              {player.type === 'computer' && player.difficulty && (
                <span className="score-bar-difficulty"> ({difficultyDisplayName(player.difficulty)})</span>
              )}
            </span>
            <span className="score-bar-value">
              <AnimatedScore score={player.score} />
            </span>
          </div>
        ))}
      </div>
      {showMoveLog && (
        <div className="score-bar-dropdown" ref={dropdownRef}>
          <div className="score-bar-dropdown-header">Move Log</div>
          {moveHistory.length === 0 ? (
            <div className="score-bar-dropdown-empty">No moves yet</div>
          ) : (
            <div className="score-bar-dropdown-list">
              {[...moveHistory].reverse().map((record, i) => {
                const player = players[record.playerIndex];
                const pName = player?.name ?? '?';
                let label = '';
                let text = '';
                let cls = '';
                if (record.action.type === 'play') {
                  label = 'PLAY'; text = `${record.action.word} +${record.scoreGained}`; cls = 'play';
                } else if (record.action.type === 'exchange') {
                  label = 'EXCH'; text = `${record.action.tileCount} tiles`; cls = 'exchange';
                } else {
                  label = 'PASS'; cls = 'pass';
                }
                const isNewest = i === 0;
                return (
                  <div key={i} className={`score-bar-move-row ${cls} ${isNewest ? 'new-entry' : ''}`}>
                    <span className="score-bar-move-player">{pName}</span>
                    <span className={`score-bar-move-badge ${cls}`}>{label}</span>
                    {text && <span className="score-bar-move-text">{text}</span>}
                  </div>
                );
              })}
            </div>
          )}
          <div className="score-bar-dropdown-header" style={{marginTop:8}}>Tile Bag ({bag.count} remaining)</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:2,padding:'6px 10px 10px',justifyContent:'center'}}>
            {Array.from(
              bag.tiles.reduce((m, t) => m.set(t.letter, (m.get(t.letter) ?? 0) + 1), new Map<string, number>())
            ).sort(([a], [b]) => a.localeCompare(b)).map(([letter, count]) => (
              <div key={letter} style={{display:'flex',alignItems:'center',gap:2,background:'var(--tile-bg)',borderRadius:3,padding:'2px 5px',fontSize:11,fontWeight:600}}>
                <span>{letter}</span>
                <span style={{fontWeight:400,fontSize:9,opacity:0.7}}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

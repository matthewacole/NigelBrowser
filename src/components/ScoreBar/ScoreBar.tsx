import { useState, useRef, useEffect } from 'react';
import type { Player } from '../../types/Player';
import type { RecordedMove, GameState } from '../../types/GameState';
import { difficultyDisplayName } from '../../types/Player';

interface ScoreBarProps {
  players: Player[];
  currentPlayerIndex: number;
  turnNumber: number;
  moveHistory: RecordedMove[];
  onSettingsClick: () => void;
  bagCount: number;
}

function WaveLoader() {
  return (
    <div className="wave-loader">
      <span /><span /><span /><span /><span />
    </div>
  );
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

function ComputerScore({ isThinking, score }: { isThinking: boolean; score: number }) {
  const [phase, setPhase] = useState<'score' | 'entering' | 'overlay' | 'exiting'>('score');

  useEffect(() => {
    if (isThinking && (phase === 'score' || phase === 'exiting')) {
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase('entering')));
    } else if (!isThinking && (phase === 'overlay' || phase === 'entering')) {
      setPhase('exiting');
      const timer = setTimeout(() => setPhase('score'), 500);
      return () => clearTimeout(timer);
    }
  }, [isThinking]);

  useEffect(() => {
    if (phase === 'entering') {
      const timer = setTimeout(() => setPhase('overlay'), 500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  return (
    <div className="computer-score" data-phase={phase}>
      <div className="cs-content"><AnimatedScore score={score} /></div>
      <div className="cs-overlay"><WaveLoader /></div>
    </div>
  );
}

export function ScoreBar({ players, currentPlayerIndex, turnNumber, moveHistory, onSettingsClick, bagCount }: ScoreBarProps) {
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
              {player.type === 'computer' ? (
                <ComputerScore isThinking={idx === currentPlayerIndex} score={player.score} />
              ) : (
                <AnimatedScore score={player.score} />
              )}
            </span>
          </div>
        ))}
      </div>
      <div className="score-bar-divider" />
      <span className="score-bar-turn">Turn {turnNumber}</span>
      <button
        className="score-bar-settings"
        onClick={(e) => { e.stopPropagation(); onSettingsClick(); }}
        aria-label="Settings"
      >
        ⚙️
      </button>

      {showMoveLog && (
        <div className="score-bar-dropdown" ref={dropdownRef}>
          <div className="score-bar-dropdown-header">Move Log</div>
          <div className="score-bar-dropdown-body">
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
                  return (
                    <div key={i} className={`score-bar-move-row ${cls}`}>
                      <span className="score-bar-move-player">{pName}</span>
                      <span className={`score-bar-move-badge ${cls}`}>{label}</span>
                      {text && <span className="score-bar-move-text">{text}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="score-bar-dropdown-tilebag">
            Tile Bag: {bagCount} remaining
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import type { Player } from '../../types/Player';
import { difficultyDisplayName } from '../../types/Player';

interface ScoreboardProps {
  players: Player[];
  currentPlayerIndex: number;
  turnNumber: number;
}

function AnimatedScore({ score, duration }: { score: number; duration: number }) {
  const [display, setDisplay] = useState(score);
  const prevScoreRef = useRef(score);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = prevScoreRef.current;
    const diff = score - start;
    if (diff === 0) {
      setDisplay(score);
      return;
    }
    const startTime = performance.now();
    const delay = 100;

    function animate(now: number) {
      const elapsed = now - startTime - delay;
      if (elapsed <= 0) {
        setDisplay(start);
        frameRef.current = requestAnimationFrame(animate);
        return;
      }
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplay(score);
        prevScoreRef.current = score;
      }
    }

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [score, duration]);

  return <>{display}</>;
}

export function Scoreboard({ players, currentPlayerIndex, turnNumber }: ScoreboardProps) {
  return (
    <div className="scoreboard">
      <div className="turn-number">Turn {turnNumber}</div>
      {players.map((player, idx) => {
        const countUpDuration = player.score >= 15 ? 1500 : 750;
        return (
          <div
            key={player.id}
            className={`player-score ${idx === currentPlayerIndex ? 'active' : ''} ${player.type === 'computer' && idx === currentPlayerIndex ? 'score-ai-border' : ''}`}
          >
            <div className="player-info">
              <span className="player-name">
                {player.name}
                {player.type === 'computer' && player.difficulty && (
                  <span className="difficulty-badge">({difficultyDisplayName(player.difficulty)})</span>
                )}
              </span>
              <span className="player-score-value">
                <AnimatedScore score={player.score} duration={countUpDuration} />
              </span>
            </div>
            <div className="player-rack-preview">
              {player.type === 'human' && idx === currentPlayerIndex
                ? player.rack.map(t => (
                    <span key={t.id} className="rack-letter">{t.letter}</span>
                  ))
                : player.rack.map((_, i) => (
                    <span key={i} className="rack-letter rack-letter-hidden">·</span>
                  ))
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

import type { Player } from '../../types/Player';
import { difficultyDisplayName } from '../../types/Player';

interface ScoreboardProps {
  players: Player[];
  currentPlayerIndex: number;
  turnNumber: number;
}

export function Scoreboard({ players, currentPlayerIndex, turnNumber }: ScoreboardProps) {
  return (
    <div className="scoreboard">
      <div className="turn-number">Turn {turnNumber}</div>
      {players.map((player, idx) => (
        <div
          key={player.id}
          className={`player-score ${idx === currentPlayerIndex ? 'active' : ''}`}
        >
          <div className="player-info">
            <span className="player-name">
              {player.name}
              {player.type === 'computer' && player.difficulty && (
                <span className="difficulty-badge">({difficultyDisplayName(player.difficulty)})</span>
              )}
            </span>
            <span className="player-score-value">{player.score}</span>
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
      ))}
    </div>
  );
}

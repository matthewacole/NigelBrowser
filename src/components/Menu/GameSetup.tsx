import { useState } from 'react';
import type { Player, Difficulty, PlayerType } from '../../types/Player';
import { createPlayer, difficultyDisplayName, difficultyAiName } from '../../types/Player';
import { MAX_PLAYERS } from '../../types/Constants';

interface GameSetupProps {
  onStart: (players: Player[]) => void;
  onCancel: () => void;
}

const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'expert'];

export function GameSetup({ onStart, onCancel }: GameSetupProps) {
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState<string[]>(['You', difficultyAiName('expert')]);
  const [playerTypes, setPlayerTypes] = useState<PlayerType[]>(['human', 'computer']);
  const [difficulties, setDifficulties] = useState<(Difficulty | null)[]>([null, 'expert']);

  const updatePlayer = (idx: number, field: 'name' | 'type' | 'difficulty', value: string) => {
    if (field === 'name') {
      setPlayerNames(prev => {
        const next = [...prev];
        next[idx] = value;
        return next;
      });
    } else if (field === 'type') {
      setPlayerTypes(prev => {
        const next = [...prev];
        next[idx] = value as PlayerType;
        return next;
      });
      setDifficulties(prev => {
        const next = [...prev];
        if (value === 'human') next[idx] = null;
        else if (next[idx] === null) next[idx] = 'intermediate';
        return next;
      });
    } else if (field === 'difficulty') {
      setDifficulties(prev => {
        const next = [...prev];
        next[idx] = value as Difficulty;
        return next;
      });
    }
  };

  const handleStart = () => {
    const players: Player[] = [];
    for (let i = 0; i < playerCount; i++) {
      players.push(createPlayer(
        playerNames[i] || `Player ${i + 1}`,
        playerTypes[i] || 'human',
        difficulties[i] ?? undefined
      ));
    }
    onStart(players);
  };

  return (
    <div className="modal-overlay">
      <div className="modal game-setup">
        <h2>New Game</h2>

        <div className="form-group">
          <label>Number of Players</label>
          <div className="player-count-selector">
            {[2, 3, 4].map(n => (
              <button
                key={n}
                className={`btn ${n === playerCount ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setPlayerCount(n);
                  const addCount = n - playerNames.length;
                  if (addCount > 0) {
                    for (let i = 0; i < addCount; i++) {
                      const idx = playerNames.length + i;
                      setPlayerNames(prev => [...prev, difficultyAiName('intermediate')]);
                      setPlayerTypes(prev => [...prev, 'computer']);
                      setDifficulties(prev => [...prev, 'intermediate']);
                    }
                  }
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {Array.from({ length: playerCount }).map((_, idx) => (
          <div key={idx} className="player-config">
            <input
              type="text"
              value={playerNames[idx] || ''}
              onChange={e => updatePlayer(idx, 'name', e.target.value)}
              placeholder={`Player ${idx + 1}`}
              className="input"
            />
            <select
              value={playerTypes[idx] || 'human'}
              onChange={e => updatePlayer(idx, 'type', e.target.value)}
              className="select"
            >
              <option value="human">Human</option>
              <option value="computer">AI</option>
            </select>
            {playerTypes[idx] === 'computer' && (
              <select
                value={difficulties[idx] || 'intermediate'}
                onChange={e => updatePlayer(idx, 'difficulty', e.target.value)}
                className="select"
              >
                {DIFFICULTIES.map(d => (
                  <option key={d} value={d}>{difficultyDisplayName(d)}</option>
                ))}
              </select>
            )}
          </div>
        ))}

        <div className="setup-actions">
          <button className="btn btn-primary" onClick={handleStart}>
            Start Game
          </button>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

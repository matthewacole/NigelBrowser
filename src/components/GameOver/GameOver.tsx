import type { Player } from '../../types/Player';
import { useGame } from '../../state/GameContext';

interface GameOverProps {
  winners: { player: Player; finalScore: number }[];
  onNewGame: () => void;
  onMainMenu: () => void;
}

export function GameOver({ winners, onNewGame, onMainMenu }: GameOverProps) {
  const { saveReport } = useGame();

  return (
    <div className="modal-overlay">
      <div className="modal game-over">
        <h2>Game Over</h2>

        <div className="podium">
          {winners.map((w, idx) => (
            <div key={w.player.id} className={`podium-entry ${idx === 0 ? 'winner' : ''}`}>
              <span className="podium-rank">
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
              </span>
              <span className="podium-name">{w.player.name}</span>
              <span className="podium-score">{w.finalScore} pts</span>
            </div>
          ))}
        </div>

        <div className="final-scores">
          <h3>Final Scores</h3>
          <table>
            <thead>
              <tr><th>Player</th><th>Score</th></tr>
            </thead>
            <tbody>
              {winners.map(w => (
                <tr key={w.player.id}>
                  <td>{w.player.name}</td>
                  <td>{w.finalScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="gameover-actions">
          <button className="btn btn-primary" onClick={onNewGame}>Play Again</button>
          <button className="btn btn-secondary" onClick={saveReport}>Save Report</button>
          <button className="btn btn-secondary" onClick={onMainMenu}>Main Menu</button>
        </div>
      </div>
    </div>
  );
}

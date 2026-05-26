import type { RecordedMove, GameState } from '../../types/GameState';

interface MoveLogProps {
  moveHistory: RecordedMove[];
  players: GameState['players'];
}

export function MoveLog({ moveHistory, players }: MoveLogProps) {
  if (moveHistory.length === 0) {
    return (
      <div className="move-log">
        <h3>Move Log</h3>
        <p className="empty-log">No moves yet</p>
      </div>
    );
  }

  return (
    <div className="move-log">
      <h3>Move Log</h3>
      <div className="move-list">
        {[...moveHistory].reverse().map((record, idx) => {
          const player = players[record.playerIndex];
          const pName = player?.name ?? '?';
          let actionLabel = '';
          let actionText = '';
          let actionClass = '';

          if (record.action.type === 'play') {
            actionLabel = 'PLAY';
            actionText = `${record.action.word} +${record.scoreGained}`;
            actionClass = 'play';
          } else if (record.action.type === 'exchange') {
            actionLabel = 'EXCH';
            actionText = `${record.action.tileCount} tiles`;
            actionClass = 'exchange';
          } else {
            actionLabel = 'PASS';
            actionText = '';
            actionClass = 'pass';
          }

          return (
            <div key={idx} className={`move-row ${actionClass}`}>
              <span className="move-player">{pName}</span>
              <span className={`move-badge ${actionClass}`}>{actionLabel}</span>
              {actionText && <span className="move-text">{actionText}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

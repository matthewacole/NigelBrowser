import type { GameState, AnalyzedMove } from '../types/GameState';
import type { BoardSquare } from '../types/BoardSquare';

export function generateReport(
  gameState: GameState,
  endReason: string,
  turnAnalyses: Record<number, AnalyzedMove[]>
): string {
  let html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Nigel Game Report</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; background: #1a1a2e; color: #e0e0e0; padding: 20px; max-width: 800px; margin: auto; }
  h1 { color: #e2b714; text-align: center; }
  h2 { color: #7c3aed; border-bottom: 1px solid #333; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #333; }
  th { color: #e2b714; }
  .board { font-family: monospace; line-height: 1.4; background: #16213e; padding: 12px; border-radius: 8px; }
  .bingo { color: #e2b714; font-weight: bold; }
  .expert { color: #ef4444; }
  .intermediate { color: #7c3aed; }
  .beginner { color: #22c55e; }
</style></head><body>
<h1>Nigel Game Report</h1>
<p><strong>Result:</strong> ${escapeHtml(endReason)}</p>
<p><strong>Players:</strong> ${gameState.players.map(p => `${escapeHtml(p.name)} (${p.type})`).join(', ')}</p>
<h2>Final Scores</h2><table><tr><th>Player</th><th>Score</th></tr>`;

  const results = gameState.players.map(p => {
    let score = p.score;
    const finisher = gameState.players.find(x => x.rack.length === 0);
    if (finisher && p.id === finisher.id) {
      score += gameState.players.filter(x => x.id !== p.id).reduce((s, x) => s + x.rack.reduce((a, t) => a + t.score, 0), 0);
    } else {
      score -= p.rack.reduce((a, t) => a + t.score, 0);
    }
    return { name: p.name, score };
  });

  for (const r of results) {
    html += `<tr><td>${escapeHtml(r.name)}</td><td>${r.score}</td></tr>`;
  }
  html += '</table>';

  html += '<h2>Move Log</h2><table><tr><th>#</th><th>Player</th><th>Action</th><th>Score</th></tr>';
  for (const move of gameState.moveHistory) {
    const player = gameState.players[move.playerIndex]?.name ?? '?';
    let action = '';
    if (move.action.type === 'play') action = `${escapeHtml(move.action.word)}`;
    else if (move.action.type === 'exchange') action = `Exchanged ${move.action.tileCount} tiles`;
    else action = 'Passed';
    html += `<tr><td>${move.turnNumber}</td><td>${escapeHtml(player)}</td><td>${action}</td><td>${move.scoreGained}</td></tr>`;
  }
  html += '</table>';

  if (Object.keys(turnAnalyses).length > 0) {
    html += '<h2>Turn Analysis</h2><table><tr><th>Turn</th><th>Played</th><th>Score</th><th>Best</th><th>Best Score</th><th>Rank</th></tr>';
    for (const [turnStr, moves] of Object.entries(turnAnalyses)) {
      const turn = parseInt(turnStr);
      const record = gameState.moveHistory.find(m => m.turnNumber === turn);
      if (!record || record.action.type !== 'play') continue;
      const playerScore = record.scoreGained;
      const bestScore = moves.length > 0 ? moves[moves.length - 1].score : 0;
      const rank = bestScore > 0
        ? (moves.findIndex(m => m.score >= playerScore) + 1)
        : moves.length;
      const bestWord = moves.length > 0 ? moves[moves.length - 1].word : '-';
      html += `<tr><td>${turn}</td><td>${escapeHtml(record.action.word)}</td>
        <td>${playerScore}</td><td>${escapeHtml(bestWord)}</td><td>${bestScore}</td><td>#${rank}/${moves.length}</td></tr>`;
    }
    html += '</table>';
  }

  html += '<h2>Final Board</h2><div class="board"><pre>';
  for (let y = 0; y < 15; y++) {
    for (let x = 0; x < 15; x++) {
      const tile = gameState.board[y][x].tile;
      html += tile ? tile.letter : '.';
    }
    html += '\n';
  }
  html += '</pre></div></body></html>';

  return html;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function downloadReport(html: string): void {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nigel-report-${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

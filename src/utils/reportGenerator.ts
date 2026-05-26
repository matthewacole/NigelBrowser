import type { GameState, AnalyzedMove, RecordedMove } from '../types/GameState';
import type { Player } from '../types/Player';
import type { BoardSquare } from '../types/BoardSquare';
import { debugLogger } from './DebugLogger';

const PREMIUM = {
  DL: '#59ABE6',
  TL: '#007AFF',
  DW: '#FF9500',
  TW: '#FF3B30',
};

const DIFFICULTY_MAP: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  expert: 'Expert',
};

export function generateReport(
  gameState: GameState,
  endReason: string,
  turnAnalyses: Record<number, AnalyzedMove[]>,
): string {
  const players = gameState.players;
  const scores = computeFinalScores(gameState);
  const winner = scores.reduce((a, b) => a.score > b.score ? a : b, scores[0]);
  const isMultiplayer = players.filter(p => p.type === 'human').length > 1;
  const turnCount = gameState.moveHistory.length;

  let html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nigel Game Report</title>
<style>
  *,*:before,*:after{box-sizing:border-box}
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',sans-serif;background:#F2F2F7;color:#1D1D1F;-webkit-font-smoothing:antialiased}
  .container{max-width:960px;margin:0 auto;padding:40px 24px}
  h1{font-size:32px;font-weight:800;letter-spacing:-0.02em;margin:0 0 6px;background:linear-gradient(135deg,#875EF7,#FF2D55);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
  h2{font-size:18px;font-weight:700;margin:0 0 16px;color:#1D1D1F}
  .subtitle{font-size:14px;color:#86868B;margin:0 0 32px}
  .card{background:rgba(255,255,255,0.72);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-radius:20px;border:1px solid rgba(255,255,255,0.3);padding:24px;margin-bottom:24px;box-shadow:0 2px 12px rgba(0,0,0,0.04)}
  .card-header{font-size:14px;font-weight:600;color:#86868B;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:16px}
  .winner-badge{display:inline-block;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:700;background:linear-gradient(135deg,#875EF7,#FF2D55);color:#FFF;margin-top:12px}
  .stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:16px}
  .stat{text-align:center}
  .stat-value{font-size:28px;font-weight:800;color:#1D1D1F}
  .stat-label{font-size:11px;font-weight:600;color:#86868B;text-transform:uppercase;letter-spacing:0.03em;margin-top:4px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{font-size:11px;font-weight:700;color:#86868B;text-transform:uppercase;letter-spacing:0.03em;padding:10px 12px;text-align:left;border-bottom:1px solid rgba(209,209,214,0.3)}
  td{padding:10px 12px;border-bottom:1px solid rgba(209,209,214,0.15);vertical-align:middle}
  tr:last-child td{border-bottom:none}
  .bingo{background:linear-gradient(135deg,#FF2D55,#FF9500);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-weight:700}
  .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:12px;font-size:13px;font-weight:600;border:none;cursor:pointer;background:#1D1D1F;color:#FFF;text-decoration:none;transition:opacity 0.15s}
  .btn:hover{opacity:0.85}
  .board-grid{display:grid;grid-template-columns:repeat(15,28px);gap:2px;justify-content:center;margin:16px 0}
  .bc{width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border-radius:4px;position:relative}
  .bc-empty{background:rgba(209,209,214,0.15);color:#86868B}
  .bc-dl{background:rgba(89,171,230,0.15);color:#59ABE6}
  .bc-tl{background:rgba(0,122,255,0.15);color:#007AFF}
  .bc-dw{background:rgba(255,149,0,0.15);color:#FF9500}
  .bc-tw{background:rgba(255,59,48,0.15);color:#FF3B30}
  .bc-tile{background:#F5F5F7;color:#1D1D1F;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
  .bc-center{background:rgba(135,94,247,0.15);color:#875EF7}
  .premium-marker{position:absolute;bottom:1px;right:2px;font-size:7px;font-weight:800;opacity:0.6;line-height:1}
  @media(max-width:600px){
    .board-grid{grid-template-columns:repeat(15,20px);gap:1px}
    .bc{width:20px;height:20px;font-size:9px}
    .premium-marker{font-size:5px}
  }
</style></head><body>
<div class="container">
  <h1>Nigel</h1>
  <p class="subtitle">Game Report &mdash; ${turnCount} turn${turnCount !== 1 ? 's' : ''} &middot; ${new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}</p>`;

  html += renderScoreboard(players, scores, winner);
  html += renderGameInfo(gameState, endReason, isMultiplayer, turnCount);
  html += renderPlayerCards(players, gameState);
  html += renderMoveLog(gameState, turnAnalyses, players);
  html += renderBoard(gameState.board);
  html += renderTurnAnalysisTable(gameState, turnAnalyses);
  html += debugLogger.generateHTML();

  html += `</div></body></html>`;
  return html;
}

function computeFinalScores(gameState: GameState): { name: string; score: number; id: string; originalScore: number }[] {
  return gameState.players.map(p => {
    let score = p.score;
    const finisher = gameState.players.find(x => x.rack.length === 0);
    if (finisher && p.id === finisher.id) {
      score += gameState.players.filter(x => x.id !== p.id).reduce((s, x) => s + x.rack.reduce((a, t) => a + t.score, 0), 0);
    } else if (finisher) {
      score -= p.rack.reduce((a, t) => a + t.score, 0);
    }
    return { name: p.name, score, id: p.id, originalScore: p.score };
  });
}

function renderScoreboard(
  players: Player[],
  scores: { name: string; score: number; id: string; originalScore: number }[],
  winner: { name: string; score: number },
): string {
  let html = `<div class="card"><div class="card-header">Final Scores</div>
  <div style="display:grid;grid-template-columns:repeat(${Math.min(players.length, 4)},1fr);gap:16px;margin-bottom:20px">`;

  for (const s of scores) {
    const isWinner = s.name === winner.name;
    html += `<div class="stat">
      <div class="stat-value" style="${isWinner ? 'background:linear-gradient(135deg,#875EF7,#FF2D55);-webkit-background-clip:text;-webkit-text-fill-color:transparent' : ''}">${s.score}</div>
      <div class="stat-label">${escapeHtml(s.name)}${isWinner ? ' ★' : ''}</div>
    </div>`;
  }

  html += `</div>
  <div style="display:flex;align-items:center;gap:8px">
    <div class="winner-badge">${escapeHtml(winner.name)} wins</div>
    <span style="font-size:13px;color:#86868B">with ${winner.score} points</span>
  </div></div>`;

  return html;
}

function renderGameInfo(gameState: GameState, endReason: string, isMultiplayer: boolean, turnCount: number): string {
  const playerTypes = gameState.players.map(p => p.type === 'computer'
    ? `${escapeHtml(p.name)} (${DIFFICULTY_MAP[p.difficulty ?? 'intermediate']})`
    : `${escapeHtml(p.name)} (Human)`,
  ).join(' vs ');

  return `<div class="card"><div class="card-header">Game Info</div>
  <table>
    <tr><td style="font-weight:600;width:140px">Players</td><td>${playerTypes}</td></tr>
    <tr><td style="font-weight:600">Result</td><td>${escapeHtml(endReason)}</td></tr>
    <tr><td style="font-weight:600">Turns</td><td>${turnCount}</td></tr>
    <tr><td style="font-weight:600">Final Bag Count</td><td>${gameState.bag.count} tiles</td></tr>
    <tr><td style="font-weight:600">Game Mode</td><td>${isMultiplayer ? 'Multiplayer' : 'vs Computer'}</td></tr>
  </table></div>`;
}

function renderPlayerCards(players: Player[], gameState: GameState): string {
  let html = '';
  for (const p of players) {
    const pMoves = gameState.moveHistory.filter(m => m.playerIndex === players.indexOf(p));
    const playMoves = pMoves.filter(m => m.action.type === 'play');
    const bingos = pMoves.filter(m => m.action.type === 'play' && (m.action as RecordedMove['action'] & { type: 'play' }).word.includes('BINGO'));
    const totalScore = p.score;
    const totalTiles = playMoves.reduce((s, m) => s + (m.action as RecordedMove['action'] & { type: 'play' }).word.split(', ').reduce((a, w) => a + w.replace(/[^A-Z]/g, '').length, 0), 0);

    html += `<div class="card"><div class="card-header">${escapeHtml(p.name)} — ${totalScore} pts</div>
    <div class="stat-grid">
      <div class="stat"><div class="stat-value">${playMoves.length}</div><div class="stat-label">Plays</div></div>
      <div class="stat"><div class="stat-value">${bingos.length}</div><div class="stat-label">Bingos</div></div>
      <div class="stat"><div class="stat-value">${totalTiles}</div><div class="stat-label">Tiles Placed</div></div>
      <div class="stat"><div class="stat-value">${p.rack.length}</div><div class="stat-label">Tiles Left</div></div>
    </div>`;
    if (p.rack.length > 0) {
      html += `<div style="margin-top:12px;display:flex;gap:4px;flex-wrap:wrap">${p.rack.map(t => `<span style="padding:2px 8px;font-size:13px;font-weight:700;background:#F5F5F7;border-radius:6px">${t.letter}<span style="font-weight:400;font-size:10px;color:#86868B;margin-left:2px">${t.score}</span></span>`).join('')}</div>`;
    }
    html += `</div>`;
  }
  return html;
}

function renderMoveLog(
  gameState: GameState,
  turnAnalyses: Record<number, AnalyzedMove[]>,
  players: Player[],
): string {
  let html = `<div class="card"><div class="card-header">Move History</div><div style="overflow-x:auto"><table>
    <thead><tr><th>#</th><th>Turn</th><th>Player</th><th>Action</th><th>Score</th><th>Analysis</th></tr></thead><tbody>`;

  for (let i = 0; i < gameState.moveHistory.length; i++) {
    const move = gameState.moveHistory[i];
    const player = players[move.playerIndex];
    const isBingo = move.action.type === 'play' && (move.action as RecordedMove['action'] & { type: 'play' }).word.includes('BINGO');

    let action = '';
    if (move.action.type === 'play') {
      const word = (move.action as RecordedMove['action'] & { type: 'play' }).word;
      const displayWord = word.replace('!', '').trim();
      action = isBingo ? `<span class="bingo">${escapeHtml(displayWord)} ✦</span>` : escapeHtml(displayWord);
    } else if (move.action.type === 'exchange') {
      action = `Exchanged ${(move.action as RecordedMove['action'] & { type: 'exchange' }).tileCount} tile(s)`;
    } else {
      action = 'Passed';
    }

    let analysis = '';
    if (move.action.type === 'play') {
      const analyses = turnAnalyses[move.turnNumber];
      if (analyses && analyses.length > 0) {
        const bestScore = analyses[analyses.length - 1].score;
        const rank = bestScore > 0
          ? (analyses.findIndex(a => a.score >= move.scoreGained) + 1)
          : analyses.length;
        const pct = bestScore > 0 ? Math.round((move.scoreGained / bestScore) * 100) : 0;
        analysis = `#${rank}/${analyses.length} (${pct}% of best)`;
      }
    }

    const rowStyle = isBingo ? 'background:rgba(255,45,85,0.04)' : '';
    html += `<tr style="${rowStyle}">
      <td style="font-weight:600;color:#86868B">${i + 1}</td>
      <td>${move.turnNumber}</td>
      <td style="font-weight:600">${escapeHtml(player?.name ?? '?')}</td>
      <td>${action}</td>
      <td style="font-weight:700">${move.scoreGained > 0 ? `+${move.scoreGained}` : '—'}</td>
      <td style="font-size:12px;color:#86868B">${analysis}</td>
    </tr>`;
  }

  html += `</tbody></table></div></div>`;
  return html;
}

function renderBoard(board: BoardSquare[][]): string {
  let html = `<div class="card"><div class="card-header">Final Board</div><div class="board-grid">`;

  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const sq = board[r][c];
      let cls = 'bc ';
      let content = '';

      if (sq.tile) {
        cls += 'bc-tile';
        content = sq.tile.letter;
      } else if (sq.bonus === 'center') {
        cls += 'bc-center';
        content = '★';
      } else if (sq.bonus === 'doubleLetter') {
        cls += 'bc-dl';
        content = 'DL';
      } else if (sq.bonus === 'tripleLetter') {
        cls += 'bc-tl';
        content = 'TL';
      } else if (sq.bonus === 'doubleWord') {
        cls += 'bc-dw';
        content = 'DW';
      } else if (sq.bonus === 'tripleWord') {
        cls += 'bc-tw';
        content = 'TW';
      } else {
        cls += 'bc-empty';
      }

      html += `<div class="${cls}">${content}</div>`;
    }
  }

  html += `</div></div>`;
  return html;
}

function renderTurnAnalysisTable(
  gameState: GameState,
  turnAnalyses: Record<number, AnalyzedMove[]>,
): string {
  const turnKeys = Object.keys(turnAnalyses).map(Number).filter(t => {
    const record = gameState.moveHistory.find(m => m.turnNumber === t);
    return record && record.action.type === 'play';
  });

  if (turnKeys.length === 0) return '';

  let html = `<div class="card"><div class="card-header">Turn Analysis (${turnKeys.length} turns analyzed)</div><div style="overflow-x:auto"><table>
    <thead><tr><th>Turn</th><th>Word Played</th><th>Score</th><th>Best Word</th><th>Best Score</th><th>Rank</th></tr></thead><tbody>`;

  for (const turn of turnKeys.sort((a, b) => a - b)) {
    const record = gameState.moveHistory.find(m => m.turnNumber === turn);
    if (!record || record.action.type !== 'play') continue;

    const moves = turnAnalyses[turn];
    const playerScore = record.scoreGained;
    const bestScore = moves.length > 0 ? moves[moves.length - 1].score : 0;
    const rank = bestScore > 0
      ? (moves.findIndex(m => m.score >= playerScore) + 1)
      : moves.length;
    const bestWord = moves.length > 0 ? moves[moves.length - 1].word : '-';
    const pct = bestScore > 0 ? Math.round((playerScore / bestScore) * 100) : 0;

    const isOptimal = playerScore >= bestScore;
    html += `<tr>
      <td>${turn}</td>
      <td>${escapeHtml(record.action.word)}</td>
      <td style="font-weight:700">${playerScore}</td>
      <td>${escapeHtml(bestWord)}</td>
      <td style="font-weight:700">${bestScore}</td>
      <td>${isOptimal ? '✦' : `#${rank}/${moves.length} (${pct}%)`}</td>
    </tr>`;
  }

  html += `</tbody></table></div></div>`;
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

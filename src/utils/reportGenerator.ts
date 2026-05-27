import type { GameState, AnalyzedMove, RecordedMove } from '../types/GameState';
import type { Player } from '../types/Player';
import type { BoardSquare } from '../types/BoardSquare';
import { debugLogger } from './DebugLogger';

const DIFFICULTY_MAP: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  expert: 'Expert',
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function bonusLabel(bonus: string): string {
  switch (bonus) {
    case 'tripleWord': return 'TW';
    case 'doubleWord': return 'DW';
    case 'tripleLetter': return 'TL';
    case 'doubleLetter': return 'DL';
    case 'center': return '★';
    default: return '';
  }
}

function bonusClass(bonus: string): string {
  switch (bonus) {
    case 'tripleWord': return 'tw';
    case 'doubleWord': return 'dw';
    case 'tripleLetter': return 'tl';
    case 'doubleLetter': return 'dl';
    case 'center': return 'star';
    default: return 'normal';
  }
}

interface SnapshotCell {
  bonus: string;
  letter?: string;
  score?: number;
}

function buildSnapshots(boardSnapshots: BoardSquare[][][]): SnapshotCell[][][] {
  const snapshots: SnapshotCell[][][] = [];

  // Initial bare board (from the first snapshot or create one)
  if (boardSnapshots.length > 0) {
    const initial = boardSnapshots[0].map(row =>
      row.map(sq => ({ bonus: sq.bonus }))
    );
    snapshots.push(initial);
  }

  // Each snapshot after a move
  for (const snapshot of boardSnapshots) {
    const grid: SnapshotCell[][] = snapshot.map(row =>
      row.map(sq => {
        const cell: SnapshotCell = { bonus: sq.bonus };
        if (sq.tile) {
          cell.letter = sq.tile.letter;
          cell.score = sq.tile.score;
        }
        return cell;
      })
    );
    snapshots.push(grid);
  }

  return snapshots;
}

interface TurnEntry {
  action: string;
  word: string;
  player: string;
  score: number;
  turn: number;
  isHuman: boolean;
}

function buildTurns(moveHistory: RecordedMove[], players: Player[]): TurnEntry[] {
  return moveHistory.map(move => {
    const player = players[move.playerIndex];
    const isHuman = player?.type === 'human';
    const turn = move.turnNumber;
    let action: string;
    let word: string;
    let score: number;

    if (move.action.type === 'play') {
      action = 'play';
      word = move.action.word.replace('!', '').trim();
      score = move.scoreGained;
    } else if (move.action.type === 'exchange') {
      action = 'exchange';
      word = `${move.action.tileCount} tiles`;
      score = 0;
    } else {
      action = 'pass';
      word = '';
      score = 0;
    }

    return { action, word, player: player?.name ?? '?', score, turn, isHuman };
  });
}

interface AnalysisEntry {
  word: string;
  score: number;
  rank: number;
  totalMoves: number;
  bestScore: number;
  bestWord: string;
  effectiveness: number;
}

function buildAnalysis(
  turnAnalyses: Record<number, AnalyzedMove[]>,
  moveHistory: RecordedMove[],
  players: Player[],
): Record<string, AnalysisEntry[]> {
  const result: Record<string, AnalysisEntry[]> = {};

  for (const turnStr of Object.keys(turnAnalyses)) {
    const turnNum = Number(turnStr);
    const analyses = turnAnalyses[turnNum];
    if (!analyses || analyses.length === 0) continue;

    const record = moveHistory.find(m => m.turnNumber === turnNum);
    if (!record || record.action.type !== 'play') continue;

    const playerScore = record.scoreGained;
    const bestScore = analyses[analyses.length - 1].score;
    const bestWord = analyses[analyses.length - 1].word;
    const rank = bestScore > 0
      ? (analyses.findIndex(a => a.score >= playerScore) + 1)
      : analyses.length;
    const effectiveness = bestScore > 0 ? Math.round((playerScore / bestScore) * 100) : 0;

    const word = record.action.word.replace('!', '').trim();

    result[String(turnNum)] = [
      {
        word,
        score: playerScore,
        rank,
        totalMoves: analyses.length,
        bestScore,
        bestWord,
        effectiveness,
      },
      ...analyses.slice(-Math.min(5, analyses.length)).filter(a => a.word !== bestWord).map(a => ({
        word: a.word,
        score: a.score,
        rank: 0,
        totalMoves: 0,
        bestScore: 0,
        bestWord: '',
        effectiveness: 0,
      })),
    ];
  }

  return result;
}

interface LogEntry {
  timestamp: string;
  turn: number;
  player: string;
  category: string;
  message: string;
  [key: string]: unknown;
}

function buildLog(): { nigel_version: string; log_entries: LogEntry[] } {
  const entries = debugLogger.getEntries();
  return {
    nigel_version: '1.0',
    log_entries: entries.map(e => {
      const entry: LogEntry = {
        timestamp: e.timestamp,
        turn: e.turnNumber,
        player: e.playerName,
        category: e.category,
        message: e.message,
      };
      if (e.data) {
        for (const [k, v] of Object.entries(e.data)) {
          if (!(k in entry)) {
            entry[k] = v;
          }
        }
      }
      return entry;
    }),
  };
}

function computeStats(gameState: GameState, turns: TurnEntry[]) {
  const plays = turns.filter(t => t.action === 'play');
  const exchanges = turns.filter(t => t.action === 'exchange');
  const passes = turns.filter(t => t.action === 'pass');
  const totalPoints = gameState.players.reduce((s, p) => s + p.score, 0);
  const bingos = turns.filter(t => t.action === 'play' && t.word.length >= 7);
  const bestPlay = plays.length > 0
    ? plays.reduce((a, b) => a.score >= b.score ? a : b)
    : null;

  // Highest word by unique words played
  const allWords = plays.flatMap(t => t.word.split(', '));
  const highestWord = allWords.reduce((a, b) => a.length >= b.length ? a : b, '');

  return { turnCount: turns.length, playCount: plays.length, exchangeCount: exchanges.length, passCount: passes.length, totalPoints, bingoCount: bingos.length, bestPlay, highestWord };
}

function computeFinalScores(gameState: GameState): { name: string; score: number; id: string; originalScore: number; type: string; difficulty?: string; rack: { letter: string; score: number }[] }[] {
  return gameState.players.map(p => {
    let score = p.score;
    const finisher = gameState.players.find(x => x.rack.length === 0);
    if (finisher && p.id === finisher.id) {
      score += gameState.players.filter(x => x.id !== p.id).reduce((s, x) => s + x.rack.reduce((a, t) => a + t.score, 0), 0);
    } else if (finisher) {
      score -= p.rack.reduce((a, t) => a + t.score, 0);
    }
    return {
      name: p.name,
      score,
      id: p.id,
      originalScore: p.score,
      type: p.type,
      difficulty: p.difficulty ?? undefined,
      rack: p.rack.map(t => ({ letter: t.letter, score: t.score })),
    };
  }).sort((a, b) => b.score - a.score);
}

export function generateReport(
  gameState: GameState,
  endReason: string,
  turnAnalyses: Record<number, AnalyzedMove[]>,
): string {
  const players = gameState.players;
  const scores = computeFinalScores(gameState);
  const winner = scores[0];
  const turnCount = gameState.moveHistory.length;
  const isMultiplayer = players.filter(p => p.type === 'human').length > 1;
  const snapshots = buildSnapshots(gameState.boardSnapshots);
  const turns = buildTurns(gameState.moveHistory, players);
  const analysis = buildAnalysis(turnAnalyses, gameState.moveHistory, players);
  const logData = buildLog();
  const stats = computeStats(gameState, turns);

  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const medals = ['🥇', '🥈', '🥉', '4️⃣'];

  const cssVars = `
:root{--board-bg:#F5F5F7;--square-bg:#E8E8ED;--square-border:#D1D1D6;--tile-bg:#FFFFF7;--tile-text:#26262B;--tile-shadow:rgba(0,0,0,0.12);--tw:#D94747;--dw:#E68C8C;--tl:#59ABE6;--dl:#B3D4F2;--star:#875EF7;--text-primary:#1D1D1F;--text-muted:#86868B;--card-bg:rgba(255,255,255,0.72);--card-border:rgba(255,255,255,0.3);}
.dark{--board-bg:#1C1C1F;--square-bg:#2E2E33;--square-border:#4D4D52;--tile-bg:#38383D;--tile-text:#F2F2F7;--tile-shadow:rgba(0,0,0,0.35);--tw:#A63838;--dw:#8C4D4D;--tl:#4080B3;--dl:#598099;--star:#A685FF;--text-primary:#F5F5F7;--text-muted:#8E8E93;--card-bg:rgba(28,28,31,0.85);--card-border:rgba(255,255,255,0.08);}
body{background:var(--board-bg);color:var(--text-primary);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;}
.glass-card{background:var(--card-bg);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid var(--card-border);border-radius:20px;padding:20px;box-shadow:0 4px 24px rgba(0,0,0,0.06);margin-bottom:16px;}
.gradient-text{background:linear-gradient(135deg,#875EF7,#FF2D55);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.two-col{display:grid;grid-template-columns:360px 1fr;gap:20px;align-items:start;}
@media(max-width:768px){.two-col{grid-template-columns:1fr!important;}}
.turn-log-container{max-height:70vh;overflow-y:auto;}
.turn-row{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;cursor:pointer;transition:background 0.15s;font-size:13px;}
.turn-row:hover{background:rgba(135,94,247,0.08);}
.turn-row.active{background:rgba(135,94,247,0.15);border-left:3px solid #875EF7;padding-left:5px;}
.turn-bar{width:3px;height:28px;border-radius:2px;flex-shrink:0;}
.turn-num{width:28px;font-weight:700;color:var(--text-muted);font-size:11px;flex-shrink:0;}
.turn-player{width:100px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0;}
.turn-action span{padding:1px 5px;border-radius:3px;font-size:10px;font-weight:700;}
.turn-word{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.turn-score{font-weight:700;font-size:13px;min-width:32px;text-align:right;}
.board-container{display:grid;grid-template-columns:repeat(15,1fr);gap:1.5px;background:var(--square-border);padding:1.5px;border-radius:6px;max-width:620px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.08);}
.board-cell{aspect-ratio:1;position:relative;display:flex;align-items:center;justify-content:center;font-size:clamp(6px,1.2vw,11px);font-weight:800;color:rgba(255,255,255,0.9);}
.board-cell[data-bonus=normal]{background:var(--square-bg);color:var(--text-muted);}
.board-cell[data-bonus=tw]{background:var(--tw);}
.board-cell[data-bonus=dw]{background:var(--dw);}
.board-cell[data-bonus=tl]{background:var(--tl);}
.board-cell[data-bonus=dl]{background:var(--dl);color:var(--text-primary);}
.board-cell[data-bonus=star]{background:var(--star);}
.tile-piece{position:absolute;inset:1px;display:flex;align-items:center;justify-content:center;border-radius:4px;background:var(--tile-bg);color:var(--tile-text);box-shadow:0 1px 3px var(--tile-shadow);z-index:2;}
.tile-letter{font-size:clamp(10px,2.2vw,20px);font-weight:700;}
.tile-score{position:absolute;bottom:1px;right:2px;font-size:clamp(5px,0.9vw,8px);font-weight:600;opacity:0.7;}
.board-legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;}
.legend-item{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted);}
.legend-swatch{width:12px;height:12px;border-radius:2px;}
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;}
.stat-card{background:var(--board-bg);border-radius:8px;padding:10px;text-align:center;}
.stat-num{font-size:20px;font-weight:800;}
.stat-word{font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.stat-label{font-size:10px;color:var(--text-muted);margin-top:2px;}
.reveal{opacity:0;transform:translateY(16px);transition:opacity 0.5s,transform 0.5s;}
.reveal.visible{opacity:1;transform:translateY(0);}
.nav-btn{padding:6px 14px;border-radius:8px;border:1px solid var(--card-border);background:var(--card-bg);color:var(--text-primary);font-size:12px;font-weight:600;cursor:pointer;}
.nav-btn:hover{background:rgba(135,94,247,0.1);}
#analysisSection{display:none;}
.analysis-rank{font-size:14px;font-weight:700;margin-bottom:8px;}
.analysis-bar{height:6px;background:var(--square-bg);border-radius:3px;margin-bottom:8px;overflow:hidden;}
.analysis-bar-fill{height:100%;border-radius:3px;transition:width 0.5s;}
.analysis-details{font-size:13px;line-height:1.6;}
.analysis-play,.analysis-best,.analysis-second{padding:2px 0;}
`;

  const playerCards = scores.map((s, i) => {
    const typeLabel = s.type === 'computer'
      ? `${DIFFICULTY_MAP[s.difficulty ?? 'intermediate'] ?? s.difficulty}`
      : 'Human';
    return `
    <div class="glass-card" style="text-align:center">
      <div style="font-size:32px;margin-bottom:4px">${medals[i] ?? ''}</div>
      <div style="font-weight:700;font-size:16px">${escapeHtml(s.name)}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${typeLabel}</div>
      <div class="gradient-text" style="font-size:36px;font-weight:800">${s.score}</div>
      ${s.rack.length > 0 ? `<div style="display:flex;gap:2px;justify-content:center;margin-top:8px">${s.rack.map(t => `<span style="padding:1px 5px;font-size:11px;font-weight:700;background:var(--tile-bg);border-radius:3px;color:var(--tile-text)">${t.letter}<span style="font-weight:400;font-size:8px;opacity:0.7;margin-left:1px">${t.score}</span></span>`).join('')}</div>` : ''}
    </div>`;
  }).join('');

  const navHtml = `
<nav style="display:flex;align-items:center;justify-content:space-between;padding:12px 24px;background:var(--card-bg);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--card-border);position:sticky;top:0;z-index:50">
  <span style="font-weight:800;font-size:18px;background:linear-gradient(135deg,#875EF7,#FF2D55);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">Game Report</span>
  <span style="font-size:13px;color:var(--text-muted)">${now}</span>
</nav>`;

  const heroHtml = `
<section id="hero" style="padding:40px 24px 20px;text-align:center">
  <h1 style="font-size:42px;font-weight:800;margin:0 0 8px;letter-spacing:-0.03em">Game Report</h1>
  <p style="font-size:16px;color:var(--text-muted);margin:0">${turnCount} turn${turnCount !== 1 ? 's' : ''} · ${players.length} player${players.length !== 1 ? 's' : ''} · ${escapeHtml(winner.name)} wins with ${winner.score} points</p>
</section>`;

  const scoresHtml = `
<section style="padding:0 24px 20px">
  <div style="display:grid;grid-template-columns:repeat(${Math.min(players.length, 4)},1fr);gap:12px;max-width:800px;margin:0 auto">
    ${playerCards}
  </div>
</section>`;

  // Turn log rows
  const turnRows = turns.map((t, i) => {
    const barColor = t.action === 'play' ? '#34C759' : t.action === 'exchange' ? '#59ABE6' : '#8E8E93';
    const badgeColor = barColor;
    const wordDisplay = t.action === 'play' ? escapeHtml(t.word) : t.action === 'exchange' ? `Exchanged ${t.word}` : 'Passed';
    return `<div class="turn-row" data-idx="${i}" onclick="selectTurn(${i})">
      <div class="turn-bar" style="background:${barColor}"></div>
      <div class="turn-num">T${t.turn}</div>
      <div class="turn-player">${escapeHtml(t.player)}</div>
      <div class="turn-action"><span style="background:${badgeColor}20;color:${badgeColor}">${t.action.toUpperCase()}</span></div>
      <div class="turn-word">${wordDisplay}</div>
      <div class="turn-score${t.action === 'play' ? ' gradient-text' : ''}" style="${t.action !== 'play' ? 'color:var(--text-muted)' : ''}">${t.score > 0 ? '+' + t.score : '—'}</div>
    </div>`;
  }).join('');

  const turnLogHtml = `
<div class="glass-card turn-log-container">
  <h2 style="font-size:14px;font-weight:700;margin:0 0 12px;color:var(--text-primary)">Turn Log</h2>
  <div style="display:flex;gap:6px;margin-bottom:12px">
    <button class="nav-btn" onclick="jumpToStart()">⏮ Start</button>
    <button class="nav-btn" onclick="jumpToEnd()">⏭ End</button>
  </div>
  <div>${turnRows}</div>
</div>`;

  // stat cards
  const statCards = `
<div class="stat-card"><div class="stat-num gradient-text">${stats.turnCount}</div><div class="stat-label">Turns</div></div>
<div class="stat-card"><div class="stat-num gradient-text">${stats.playCount}</div><div class="stat-label">Plays</div></div>
<div class="stat-card"><div class="stat-num gradient-text">${stats.exchangeCount}</div><div class="stat-label">Exchanges</div></div>
<div class="stat-card"><div class="stat-num gradient-text">${stats.passCount}</div><div class="stat-label">Passes</div></div>
<div class="stat-card"><div class="stat-num gradient-text">${stats.totalPoints}</div><div class="stat-label">Points</div></div>
<div class="stat-card"><div class="stat-num gradient-text">${stats.bingoCount}</div><div class="stat-label">Bingos</div></div>
<div class="stat-card"><div class="stat-num gradient-text">${stats.bestPlay ? stats.bestPlay.score : '-'}</div><div class="stat-label">Best Play</div></div>
<div class="stat-card"><div class="stat-word gradient-text">${stats.highestWord || '-'}</div><div class="stat-label">Highest Word</div></div>`;

  const statsHtml = `
<h2 class="reveal" style="font-size:16px;font-weight:700;margin:24px 0 12px">Statistics</h2>
<div class="reveal"><div class="stat-grid">${statCards}</div></div>`;

  const analysisHtml = `
<div id="analysisSection">
  <h2 style="font-size:16px;font-weight:700;margin:24px 0 12px">Play Analysis</h2>
  <div class="glass-card" id="analysisContent"></div>
</div>`;

  const boardHtml = `
<nav style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
  <span id="turnLabel" style="font-size:13px;font-weight:600;color:var(--text-muted)">Select a turn</span>
  <div style="display:flex;gap:6px">
    <button class="nav-btn" onclick="prevTurn()">← Prev</button>
    <button class="nav-btn" onclick="nextTurn()">Next →</button>
  </div>
</nav>
<div class="board-container" id="boardContainer"></div>
<div class="board-legend">
  <div class="legend-item"><div class="legend-swatch" style="background:var(--tw)"></div>TW</div>
  <div class="legend-item"><div class="legend-swatch" style="background:var(--dw)"></div>DW</div>
  <div class="legend-item"><div class="legend-swatch" style="background:var(--tl)"></div>TL</div>
  <div class="legend-item"><div class="legend-swatch" style="background:var(--dl)"></div>DL</div>
  <div class="legend-item"><div class="legend-swatch" style="background:var(--star)"></div>★</div>
</div>`;

  // Program log
  const logEntries = logData.log_entries;
  const logTableRows = logEntries.map(e => {
    const colorMap: Record<string, string> = {
      AI: '#875EF7', VALIDATE: '#59ABE6', PLAY: '#34C759', COMMIT: '#34C759',
      DRAW: '#875EF7', EXCHANGE: '#59ABE6', PASS: '#8E8E93', FORFEIT: '#FF3B30',
      PLACE: '#59ABE6', REMOVE: '#FF9500', RECALL: '#FF9500', BINGO: '#FF2D55',
      ERROR: '#FF3B30', STATE: '#FF9500', DRAG: '#59ABE6', REPORT: '#875EF7',
      ANALYSIS: '#86868B',
    };
    const color = colorMap[e.category] || '#86868B';
    const ts = e.timestamp.replace('T', ' ').slice(0, 19);
    return `<tr style="border-bottom:1px solid var(--card-border)">
      <td style="padding:4px 8px;font-size:11px;font-family:monospace;color:var(--text-muted);white-space:nowrap">${ts}</td>
      <td style="padding:4px 8px;font-size:11px;font-weight:700;color:var(--text-primary);white-space:nowrap">T${e.turn}</td>
      <td style="padding:4px 8px;font-size:11px;color:var(--text-primary);white-space:nowrap">${escapeHtml(String(e.player))}</td>
      <td style="padding:4px 8px;font-size:11px"><span style="padding:1px 5px;border-radius:3px;font-weight:700;background:${color}20;color:${color}">${e.category}</span></td>
      <td style="padding:4px 8px;font-size:11px;font-family:monospace;color:var(--text-primary);word-break:break-all">${escapeHtml(e.message)}</td>
    </tr>`;
  }).join('');

  const logHtml = logEntries.length > 0 ? `
<section style="padding:0 24px 24px">
  <details class="reveal" style="cursor:pointer">
    <summary style="display:flex;align-items:center;justify-content:space-between;list-style:none;padding:12px 0">
      <h2 style="font-size:16px;font-weight:700;margin:0;color:var(--text-primary)">Program Log (${logEntries.length} entries)</h2>
      <span style="font-size:11px;font-weight:600;color:#875EF7;background:rgba(135,94,247,0.1);padding:3px 8px;border-radius:12px">Click to expand</span>
    </summary>
    <div class="glass-card" style="padding:0;overflow:hidden">
      <div style="overflow-x:auto;max-height:400px;overflow-y:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead style="position:sticky;top:0;background:var(--card-bg);z-index:10">
            <tr style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);border-bottom:1px solid var(--card-border)">
              <th style="padding:6px 8px;text-align:left">Time</th>
              <th style="padding:6px 8px;text-align:left">Turn</th>
              <th style="padding:6px 8px;text-align:left">Player</th>
              <th style="padding:6px 8px;text-align:left">Category</th>
              <th style="padding:6px 8px;text-align:left">Details</th>
            </tr>
          </thead>
          <tbody>${logTableRows}</tbody>
        </table>
      </div>
    </div>
    <details style="margin-top:12px;cursor:pointer">
      <summary style="list-style:none;font-size:11px;font-weight:600;color:var(--text-muted);padding:4px 0">Show Raw JSON (for debugging)</summary>
      <pre style="margin-top:8px;padding:12px;background:#1C1C1F;color:#F5F5F7;font-size:11px;font-family:monospace;border-radius:12px;overflow-x:auto;max-height:300px;overflow-y:auto;white-space:pre-wrap"><code>${escapeHtml(JSON.stringify(logData, null, 2))}</code></pre>
    </details>
  </details>
</section>` : '';

  const script = `
var SNAPSHOTS = ${JSON.stringify(snapshots)};
var TURNS = ${JSON.stringify(turns)};
var ANALYSIS = ${JSON.stringify(analysis)};
var LOG = ${JSON.stringify(logData)};
var currentIdx = SNAPSHOTS.length - 1;

var bonusLabels = {"tripleWord":"TW","doubleWord":"DW","tripleLetter":"TL","doubleLetter":"DL","center":"★","normal":""};
var bonusClasses = {"tripleWord":"tw","doubleWord":"dw","tripleLetter":"tl","doubleLetter":"dl","center":"star","normal":"normal"};

function buildBoard(idx) {
  var grid = SNAPSHOTS[idx] || SNAPSHOTS[SNAPSHOTS.length - 1];
  if (!grid) return '';
  var html = '';
  for (var r = 0; r < 15; r++) {
    for (var c = 0; c < 15; c++) {
      var sq = grid[r][c];
      var cls = bonusClasses[sq.bonus] || 'normal';
      html += '<div class="board-cell" data-bonus="' + cls + '">';
      if (sq.bonus !== 'normal' && sq.bonus !== 'center') {
        html += bonusLabels[sq.bonus] || '';
      } else if (sq.bonus === 'center' && !sq.letter) {
        html += '★';
      }
      if (sq.letter) {
        html += '<div class="tile-piece"><span class="tile-letter">' + sq.letter + '</span><span class="tile-score">' + sq.score + '</span></div>';
      }
      html += '</div>';
    }
  }
  return html;
}

function selectTurn(idx) {
  if (idx < 0 || idx >= SNAPSHOTS.length) return;
  currentIdx = idx;
  document.getElementById('boardContainer').innerHTML = buildBoard(idx);
  document.getElementById('turnLabel').textContent = 'Turn ' + (idx + 1) + ' of ' + SNAPSHOTS.length;
  document.querySelectorAll('.turn-row').forEach(function(el, i) {
    el.classList.toggle('active', i === idx);
  });
  renderAnalysis(idx);
  document.getElementById('hero').scrollIntoView({behavior:'smooth'});
}

function renderAnalysis(idx) {
  var turnData = TURNS[idx];
  var turnNum = turnData && turnData.turn;
  var analyses = turnNum ? ANALYSIS[String(turnNum)] : null;
  var section = document.getElementById('analysisSection');
  var content = document.getElementById('analysisContent');
  if (!analyses || analyses.length === 0 || !analyses[0]) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';
  var a = analyses[0];
  var html = '<div class="analysis-rank">#' + a.rank + ' of ' + a.totalMoves + '</div>';
  var pct = a.effectiveness || 0;
  var barColor = pct >= 90 ? '#34C759' : pct >= 70 ? '#FF9500' : '#FF3B30';
  html += '<div class="analysis-bar"><div class="analysis-bar-fill" style="width:' + pct + '%;background:' + barColor + '"></div></div>';
  html += '<div class="analysis-details">';
  html += '<div class="analysis-play">Your play: <strong>' + escapeHtml(a.word) + '</strong> <span class="gradient-text">+' + a.score + '</span></div>';
  html += '<div class="analysis-best">Best: <strong>' + escapeHtml(a.bestWord) + '</strong> <span class="gradient-text">+' + a.bestScore + '</span></div>';
  if (analyses.length >= 3) {
    var second = analyses[1];
    if (second && second.word !== a.bestWord) {
      html += '<div class="analysis-second">2nd: <strong>' + escapeHtml(second.word) + '</strong> <span class="gradient-text">+' + second.score + '</span></div>';
    }
  }
  html += '</div>';
  content.innerHTML = html;
}

function prevTurn() { selectTurn(currentIdx - 1); }
function nextTurn() { selectTurn(currentIdx + 1); }
function jumpToStart() { selectTurn(0); }
function jumpToEnd() { selectTurn(SNAPSHOTS.length - 1); }

function escapeHtml(s) {
  if (typeof s !== 'string') return String(s);
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

(function() {
  var lastIdx = SNAPSHOTS.length - 1;
  selectTurn(lastIdx);
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, {threshold:0.1});
  document.querySelectorAll('.reveal').forEach(function(el) { observer.observe(el); });
})();
`;

  return `<!DOCTYPE html>
<html class="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nigel Game Report</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>${cssVars}</style>
</head>
<body>
${navHtml}
${heroHtml}
${scoresHtml}
<section style="padding:0 24px 24px">
<div class="two-col">
  <div>${turnLogHtml}</div>
  <div>
    <div class="glass-card">${boardHtml}</div>
    ${analysisHtml}
    ${statsHtml}
  </div>
</div>
</section>
${logHtml}
<footer style="text-align:center;padding:24px;font-size:12px;color:var(--text-muted)">Nigel Game Report &copy; ${new Date().getFullYear()}</footer>
<script>${script}</script>
</body>
</html>`;
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

export type DebugCategory =
  | 'AI' | 'VALIDATE' | 'PLAY' | 'COMMIT' | 'DRAW'
  | 'EXCHANGE' | 'PASS' | 'FORFEIT' | 'PLACE' | 'REMOVE'
  | 'RECALL' | 'BINGO' | 'ERROR' | 'STATE' | 'DRAG' | 'REPORT';

export interface DebugEntry {
  timestamp: string;
  turnNumber: number;
  playerName: string;
  category: DebugCategory;
  message: string;
  data?: Record<string, unknown>;
}

const CATEGORY_COLORS: Record<DebugCategory, string> = {
  AI: '#875EF7',
  VALIDATE: '#59ABE6',
  PLAY: '#34C759',
  COMMIT: '#34C759',
  DRAW: '#875EF7',
  EXCHANGE: '#59ABE6',
  PASS: '#8E8E93',
  FORFEIT: '#FF3B30',
  PLACE: '#59ABE6',
  REMOVE: '#FF9500',
  RECALL: '#FF9500',
  BINGO: '#FF2D55',
  ERROR: '#FF3B30',
  STATE: '#FF9500',
  DRAG: '#59ABE6',
  REPORT: '#875EF7',
};

class DebugLogger {
  private entries: DebugEntry[] = [];

  log(turnNumber: number, playerName: string, category: DebugCategory, message: string, data?: Record<string, unknown>): void {
    const entry: DebugEntry = {
      timestamp: new Date().toISOString(),
      turnNumber,
      playerName,
      category,
      message,
      data,
    };
    this.entries.push(entry);
  }

  clear(): void {
    this.entries = [];
  }

  getEntries(): DebugEntry[] {
    return [...this.entries];
  }

  exportJSON(): string {
    return JSON.stringify({
      nigel_version: '1.0',
      log_entries: this.entries,
    }, null, 2);
  }

  generateHTML(): string {
    const logs = this.entries;
    if (logs.length === 0) return '';

    let rows = '';
    for (const log of logs) {
      const color = CATEGORY_COLORS[log.category] || '#86868B';
      const escaped = log.message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      const ts = log.timestamp.replace('T', ' ').slice(0, 19);
      rows += `<tr style="border-bottom:1px solid rgba(209,209,214,0.2)">
        <td style="padding:6px 10px;font-size:11px;font-family:monospace;color:#86868B;white-space:nowrap">${ts}</td>
        <td style="padding:6px 10px;font-size:11px;font-weight:700;color:#1D1D1F;white-space:nowrap">T${log.turnNumber}</td>
        <td style="padding:6px 10px;font-size:11px;font-weight:600;white-space:nowrap">${log.playerName}</td>
        <td style="padding:6px 10px;font-size:11px;white-space:nowrap"><span style="padding:1px 5px;border-radius:3px;font-weight:700;background:${color}15;color:${color}">${log.category}</span></td>
        <td style="padding:6px 10px;font-size:11px;font-family:monospace;color:#1D1D1F;word-break:break-all">${escaped}</td>
      </tr>`;
    }

    return `<section style="padding:24px 20px;background:rgba(245,245,247,0.5)">
      <div style="max-width:1200px;margin:0 auto;padding:0 20px">
        <details>
          <summary style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;list-style:none;padding:12px 0">
            <h2 style="font-size:16px;font-weight:700;color:#1D1D1F;margin:0">Program Log (${logs.length} entries)</h2>
            <span style="font-size:11px;font-weight:600;color:#875EF7;background:rgba(135,94,247,0.1);padding:3px 8px;border-radius:12px">Click to expand</span>
          </summary>
          <div style="margin-top:12px;border-radius:16px;overflow:hidden;background:rgba(255,255,255,0.7);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.3)">
            <div style="overflow-x:auto;max-height:400px;overflow-y:auto">
              <table style="width:100%;text-align:left;border-collapse:collapse">
                <thead style="position:sticky;top:0;background:#F5F5F7;z-index:10">
                  <tr style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#86868B;border-bottom:1px solid rgba(209,209,214,0.3)">
                    <th style="padding:6px 10px">Time</th>
                    <th style="padding:6px 10px">Turn</th>
                    <th style="padding:6px 10px">Player</th>
                    <th style="padding:6px 10px">Category</th>
                    <th style="padding:6px 10px">Details</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
          <details style="margin-top:12px">
            <summary style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;list-style:none">
              <span style="font-size:11px;font-weight:600;color:#86868B">Show Raw JSON (for debugging)</span>
              <span style="font-size:11px;color:#86868B">+</span>
            </summary>
            <pre style="margin-top:8px;padding:12px;background:#1C1C1F;color:#F5F5F7;font-size:11px;font-family:monospace;border-radius:12px;overflow-x:auto;max-height:300px;overflow-y:auto;white-space:pre-wrap"><code>${this.exportJSON().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
          </details>
        </details>
      </div>
    </section>`;
  }
}

export const debugLogger = new DebugLogger();

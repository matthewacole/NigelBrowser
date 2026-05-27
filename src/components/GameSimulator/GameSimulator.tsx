import { useState, useRef, useCallback, useEffect } from 'react';
import { BoardGrid } from '../Board/BoardGrid';
import { GameSimulationRunner, SPEED_MS, type Speed } from '../../ai/GameSimulationRunner';
import type { GameReport, BatchResult, TurnRecord } from '../../ai/GameReporter';
import type { Player } from '../../types/Player';
import { createPlayer } from '../../types/Player';

interface GameSimulatorProps {
  onBack: () => void;
}

type SimPhase = 'config' | 'running' | 'paused' | 'complete' | 'batch';

export function GameSimulator({ onBack }: GameSimulatorProps) {
  const [phase, setPhase] = useState<SimPhase>('config');
  const [speed, setSpeed] = useState<Speed>('normal');
  const [playerConfigs, setPlayerConfigs] = useState<{ name: string; difficulty: string }[]>([
    { name: 'AI Alice', difficulty: 'expert' },
    { name: 'AI Bob', difficulty: 'expert' },
  ]);
  const [batchCount, setBatchCount] = useState(10);
  const [report, setReport] = useState<GameReport | null>(null);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [turnRecords, setTurnRecords] = useState<TurnRecord[]>([]);
  const [progress, setProgress] = useState(0);
  const [batchProgress, setBatchProgress] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const runnerRef = useRef<GameSimulationRunner | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    return () => {
      runnerRef.current?.abort();
    };
  }, []);

  const buildPlayers = useCallback((): Player[] => {
    return playerConfigs.map((cfg, i) =>
      createPlayer(cfg.name, 'computer', cfg.difficulty as any)
    );
  }, [playerConfigs]);

  const handleStart = useCallback(async () => {
    const players = buildPlayers();
    const runner = new GameSimulationRunner({
      onStateChange: () => {
        forceRender(n => n + 1);
        if (runner.currentState.game.phase === 'playing') {
          setTurnRecords([...runner.currentTurnRecords]);
        }
      },
      onTurn: (turn) => {
        setTurnRecords(prev => [...prev, turn]);
      },
      onComplete: (r) => {
        setReport(r);
        setShowReport(true);
        setPhase('complete');
      },
    });
    runnerRef.current = runner;

    setPhase('running');
    setTurnRecords([]);
    setReport(null);
    setProgress(0);

    setTimeout(() => {
      runner.runGame(players, speed);
    }, 50);
  }, [buildPlayers, speed]);

  const handleBatchStart = useCallback(async () => {
    const players = buildPlayers();
    const runner = new GameSimulationRunner({
      onStateChange: () => {
        forceRender(n => n + 1);
      },
    });
    runnerRef.current = runner;

    setPhase('batch');
    setBatchResult(null);
    setBatchProgress(0);

    setTimeout(async () => {
      const result = await runner.runBatch(players, batchCount, speed);
      setBatchResult(result);
      setPhase('complete');
    }, 50);
  }, [buildPlayers, batchCount, speed]);

  const handlePause = useCallback(() => {
    runnerRef.current?.pause();
    setPhase('paused');
  }, []);

  const handleResume = useCallback(() => {
    runnerRef.current?.resume();
    setPhase('running');
  }, []);

  const handleAbort = useCallback(() => {
    runnerRef.current?.abort();
    setPhase('config');
    setTurnRecords([]);
  }, []);

  const handleStep = useCallback(async () => {
    const runner = runnerRef.current;
    if (!runner) return;
    runner.pause();
    setPhase('paused');
    await runner.runSingleTurn();
    setTurnRecords([...runner.currentTurnRecords]);
    forceRender(n => n + 1);
  }, []);

  const toggleDifficulty = useCallback((index: number) => {
    setPlayerConfigs(prev => prev.map((p, i) => {
      if (i !== index) return p;
      const cycle: Record<string, string> = { beginner: 'intermediate', intermediate: 'expert', expert: 'beginner' };
      return { ...p, difficulty: cycle[p.difficulty] ?? 'expert' };
    }));
  }, []);

  const addPlayer = useCallback(() => {
    setPlayerConfigs(prev => [...prev, { name: `AI ${String.fromCharCode(65 + prev.length)}`, difficulty: 'expert' }]);
  }, []);

  const removePlayer = useCallback((index: number) => {
    setPlayerConfigs(prev => prev.filter((_, i) => i !== index));
  }, []);

  const currentState = runnerRef.current?.currentState;
  const game = currentState?.game;
  const isRunning = phase === 'running' || phase === 'paused';

  if (phase === 'config') {
    return (
      <div className="simulator">
        <div className="sim-header">
          <button className="btn btn-ghost" onClick={onBack}>← Back</button>
          <h2>AI vs AI Simulator</h2>
        </div>

        <div className="sim-config">
          <div className="sim-config-section">
            <h3>Players</h3>
            {playerConfigs.map((p, i) => (
              <div key={i} className="sim-player-row">
                <input
                  className="input"
                  value={p.name}
                  onChange={e => setPlayerConfigs(prev => prev.map((pc, j) => j === i ? { ...pc, name: e.target.value } : pc))}
                  placeholder={`Player ${i + 1}`}
                />
                <button className="btn btn-secondary sim-diff-btn" onClick={() => toggleDifficulty(i)}>
                  {p.difficulty}
                </button>
                {playerConfigs.length > 2 && (
                  <button className="btn btn-danger sim-remove-btn" onClick={() => removePlayer(i)}>✕</button>
                )}
              </div>
            ))}
            {playerConfigs.length < 4 && (
              <button className="btn btn-ghost" onClick={addPlayer}>+ Add Player</button>
            )}
          </div>

          <div className="sim-config-section">
            <h3>Speed</h3>
            <div className="sim-speed-options">
              {(['instant', 'fast', 'normal', 'slow'] as Speed[]).map(s => (
                <button
                  key={s}
                  className={`btn ${speed === s ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSpeed(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="sim-config-section">
            <h3>Batch Size</h3>
            <div className="sim-batch-row">
              <input
                className="input"
                type="number"
                min={1}
                max={1000}
                value={batchCount}
                onChange={e => setBatchCount(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <span className="sim-batch-label">games</span>
            </div>
          </div>

          <div className="sim-config-actions">
            <button className="btn btn-primary" onClick={handleStart}>Run Single Game</button>
            <button className="btn btn-secondary" onClick={handleBatchStart}>
              Run {batchCount} Games
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="simulator">
      <div className="sim-header">
        <button className="btn btn-ghost" onClick={handleAbort}>← Back</button>
        <h2>AI vs AI Simulator</h2>
        <span className="sim-turn-counter">Turn {turnRecords.length}</span>
      </div>

      {game && (
        <div className="sim-body">
          <div className="sim-board-area">
            <BoardGrid
              board={game.board}
              onCommitMove={() => {}}
              rackTiles={[]}
              onRecallTiles={() => {}}
              readOnly
            />
          </div>

          <div className="sim-sidebar">
            <div className="sim-scores">
              <h3>Scores</h3>
              {game.players.map((p, i) => (
                <div key={i} className={`sim-score-row ${i === game.currentPlayerIndex ? 'active' : ''}`}>
                  <span className="sim-player-name">{p.name}</span>
                  <span className="sim-diff-badge">{p.difficulty}</span>
                  <span className="sim-score-value">{p.score}</span>
                </div>
              ))}
            </div>

            <div className="sim-movelog">
              <h3>Move Log</h3>
              <div className="sim-movelog-list">
                {turnRecords.length === 0 && <p className="sim-movelog-empty">Waiting for moves...</p>}
                {turnRecords.map((t, i) => (
                  <div key={i} className={`sim-move-row ${t.action}`}>
                    <span className="sim-move-turn">#{t.turnNumber}</span>
                    <span className="sim-move-player">{game.players[t.playerIndex]?.name}</span>
                    {t.action === 'play' && (
                      <>
                        <span className="sim-move-badge play">{t.word}</span>
                        <span className="sim-move-score">+{t.score}</span>
                        {t.isBingo && <span className="sim-move-bingo">BINGO!</span>}
                      </>
                    )}
                    {t.action === 'pass' && <span className="sim-move-badge pass">Pass</span>}
                    {t.action === 'exchange' && <span className="sim-move-badge exchange">Exchange</span>}
                  </div>
                ))}
              </div>
            </div>

            {report && showReport && phase === 'complete' && (
              <div className="sim-report">
                <h3>Game Over</h3>
                {report.players.sort((a, b) => b.score - a.score).map((p, i) => (
                  <div key={i} className={`sim-report-row ${i === 0 ? 'winner' : ''}`}>
                    <span className="sim-report-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                    <span className="sim-report-name">{p.name}</span>
                    <span className="sim-report-score">{p.score}</span>
                  </div>
                ))}
                <div className="sim-report-stats">
                  <p>Total Turns: {report.totalTurns}</p>
                  <p>Total Bingos: {report.totalBingos}</p>
                  <p>Best Word: {report.highestScoringWord.word} ({report.highestScoringWord.score}pts)</p>
                  <p>Longest Word: {report.longestWord}</p>
                </div>
                <button className="btn btn-secondary" onClick={() => setShowReport(false)}>Close</button>
              </div>
            )}

            {batchResult && phase === 'complete' && (
              <div className="sim-report">
                <h3>Batch Results ({batchResult.totalGames} games)</h3>
                <div className="sim-report-stats">
                  <p>Avg Turns: {batchResult.avgTurnsPerGame}</p>
                  <p>Avg Bingos/Game: {batchResult.avgBingosPerGame}</p>
                  <p>Avg Score/Game: {batchResult.avgScorePerGame}</p>
                  <h4>Win Counts</h4>
                  {Object.entries(batchResult.winCounts).sort((a, b) => b[1] - a[1]).map(([name, wins]) => (
                    <p key={name}>{name}: {wins} wins ({Math.round(wins / batchResult.totalGames * 100)}%)</p>
                  ))}
                  <h4>Avg Scores</h4>
                  {Object.entries(batchResult.avgScores).sort((a, b) => b[1] - a[1]).map(([name, avg]) => (
                    <p key={name}>{name}: {avg} avg</p>
                  ))}
                </div>
                <button className="btn btn-secondary" onClick={() => { setPhase('config'); setBatchResult(null); }}>Back</button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="sim-controls">
        <div className="sim-controls-left">
          <button className="btn btn-secondary" onClick={handleStep} disabled={phase !== 'running' && phase !== 'paused'}>
            ⏭ Step
          </button>
          {phase === 'running' ? (
            <button className="btn btn-secondary" onClick={handlePause}>⏸ Pause</button>
          ) : phase === 'paused' ? (
            <button className="btn btn-primary" onClick={handleResume}>▶ Resume</button>
          ) : null}
        </div>

        <div className="sim-controls-right">
          <span className="sim-speed-label">Speed:</span>
          {(['instant', 'fast', 'normal', 'slow'] as Speed[]).map(s => (
            <button
              key={s}
              className={`btn btn-sm ${speed === s ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => { setSpeed(s); runnerRef.current?.setSpeed(s); }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

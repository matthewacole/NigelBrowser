import { useEffect, useState } from 'react';
import { GameProvider, useGame } from './state/GameContext';
import { SettingsProvider } from './state/SettingsContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MainMenu } from './components/Menu/MainMenu';
import { GameBoard } from './components/GameBoard/GameBoard';
import { GameOver } from './components/GameOver/GameOver';
import { GameSimulator } from './components/GameSimulator/GameSimulator';
import { solverManager } from './solver/SolverManager';
import { wordValidator } from './engine/WordValidator';
import './styles/theme.css';
import './styles/board.css';
import './styles/tiles.css';
import './styles/animations.css';

function AppContent() {
  const { state, dispatch, startNewGame } = useGame();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [wordsResp] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}twl06.txt`),
          solverManager.load(),
        ]);
        const text = await wordsResp.text();
        const words = text.split(/\r?\n/).map(w => w.trim().toUpperCase()).filter(w => w.length > 0);
        wordValidator.loadWords(words);
        setLoading(false);
      } catch (e) {
        setLoadError(String(e));
        setLoading(false);
      }
    }
    init();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading game engine...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="loading-screen error">
        <p>Failed to load: {loadError}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const phase = state.game.phase;

  if (showSimulator) {
    return (
      <div className="app">
        <GameSimulator onBack={() => setShowSimulator(false)} />
      </div>
    );
  }

  return (
    <div className="app">
      {phase === 'setup' && <MainMenu onSimulatorLaunch={() => setShowSimulator(true)} />}
      {phase === 'playing' && <GameBoard onSimulatorLaunch={() => setShowSimulator(true)} />}
      {phase === 'gameOver' && (
        <GameOver
          winners={state.ui.winners}
          onNewGame={() => dispatch({ type: 'CLEAR_GAME' })}
          onMainMenu={() => dispatch({ type: 'CLEAR_GAME' })}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <GameProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </GameProvider>
    </SettingsProvider>
  );
}

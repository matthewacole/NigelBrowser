import { useState, useEffect } from 'react';
import { useGame } from '../../state/GameContext';
import { GameSetup } from './GameSetup';
import { wordValidator } from '../../engine/WordValidator';
import { FallingTiles } from './FallingTiles';
import type { Player } from '../../types/Player';

const TAGLINES = [
  "It's not about the words you know, it's about the ones you can fake",
  "Where Q is a queen and nobody talks about U",
  "Seven tiles, infinite possibilities",
  "Bingo! (That means 50 extra points, not a game of chance)",
  "Your rack is full of vowels again, isn't it",
  "Triple word score: where dreams go to die",
  "Building words, crushing dreams",
  "The dictionary is law. We wrote it down.",
  "Not all who wander are lost, but you might want to check your rack",
  "Blank tiles? We don't need no stinking blank tiles.",
];

export function MainMenu() {
  const { startNewGame, getSavedGameExists, loadSavedGame } = useGame();
  const [showSetup, setShowSetup] = useState(false);
  const [showDict, setShowDict] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tagline, setTagline] = useState('');
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    setTagline(TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);
    setHasSave(getSavedGameExists());
  }, [getSavedGameExists]);

  const handleNewGame = (players: Player[]) => {
    startNewGame(players);
    setShowSetup(false);
  };

  return (
    <div className="main-menu">
      <FallingTiles />

      <div className="menu-content">
        <div className="menu-logo">
          <h1>Nigel</h1>
          <p className="tagline">{tagline}</p>
        </div>

        <div className="menu-cards">
          {hasSave && (
            <button className="menu-card" onClick={() => loadSavedGame()}>
              <span className="menu-icon">▶</span>
              <div>
                <span className="menu-card-title">Resume Game</span>
                <span className="menu-card-subtitle">Continue your last game</span>
              </div>
            </button>
          )}

          <button className="menu-card" onClick={() => setShowSetup(true)}>
            <span className="menu-icon">+</span>
            <div>
              <span className="menu-card-title">New Game</span>
              <span className="menu-card-subtitle">Start a fresh game</span>
            </div>
          </button>

          <button className="menu-card" onClick={() => setShowDict(true)}>
            <span className="menu-icon">📖</span>
            <div>
              <span className="menu-card-title">Dictionary</span>
              <span className="menu-card-subtitle">Look up valid words</span>
            </div>
          </button>

          <button className="menu-card" onClick={() => setShowTutorial(true)}>
            <span className="menu-icon">💡</span>
            <div>
              <span className="menu-card-title">Tutorial</span>
              <span className="menu-card-subtitle">Learn how to play</span>
            </div>
          </button>
        </div>
      </div>

      {showSetup && (
        <GameSetup onStart={handleNewGame} onCancel={() => setShowSetup(false)} />
      )}

      {showDict && (
        <div className="modal-overlay" onClick={() => setShowDict(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Dictionary</h2>
            <DictionaryContent onClose={() => setShowDict(false)} />
          </div>
        </div>
      )}

      {showTutorial && (
        <div className="modal-overlay" onClick={() => setShowTutorial(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>How to Play</h2>
            <TutorialContent onClose={() => setShowTutorial(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function DictionaryContent({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const checkWord = () => {
    if (!query.trim()) return;
    const valid = wordValidator.isValidWord(query.trim());
    setResult(valid ? `${query.toUpperCase()} is valid` : `${query.toUpperCase()} is not valid`);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && checkWord()}
          placeholder="Enter a word..."
          className="input"
          autoFocus
        />
        <button className="btn btn-primary" onClick={checkWord}>Look Up</button>
      </div>
      {result && <p>{result}</p>}
      <button className="btn btn-secondary" onClick={onClose}>Close</button>
    </div>
  );
}

function TutorialContent({ onClose }: { onClose: () => void }) {
  return (
    <div className="tutorial-content">
      <h3>Objective</h3>
      <p>Score the most points by forming words on the 15×15 board.</p>
      <h3>How to Play</h3>
      <ul>
        <li>Drag tiles from your rack onto the board</li>
        <li>Words must read left-to-right or top-to-bottom</li>
        <li>Each new word must connect to existing tiles</li>
        <li>Press <strong>Play</strong> to submit your move</li>
      </ul>
      <h3>Scoring</h3>
      <ul>
        <li>Each tile has a point value (A=1, Q=10, etc.)</li>
        <li>Double/Triple Letter squares multiply that tile's value</li>
        <li>Double/Triple Word squares multiply the whole word</li>
        <li>Using all 7 tiles = Bingo! +50 bonus points</li>
      </ul>
      <h3>AI Opponents</h3>
      <ul>
        <li><strong>Beginner</strong> — Picks the worst valid move</li>
        <li><strong>Intermediate</strong> — Picks a middle-ranked move</li>
        <li><strong>Expert Nigel</strong> — Picks the best possible move</li>
      </ul>
      <button className="btn btn-secondary" onClick={onClose}>Close</button>
    </div>
  );
}

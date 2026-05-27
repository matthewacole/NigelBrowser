import { useState } from 'react';
import { useSettings } from '../../state/SettingsContext';
import { DebugPanel } from '../DebugPanel';

const APP_VERSION = 'Nigel Browser v0.9.0-beta';

interface SettingsProps {
  onClose: () => void;
  onSimulatorClick?: () => void;
}

export function Settings({ onClose, onSimulatorClick }: SettingsProps) {
  const { settings, updateSettings } = useSettings();
  const [showDebug, setShowDebug] = useState(false);

  if (showDebug) {
    return <DebugPanel onClose={() => setShowDebug(false)} />;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={e => e.stopPropagation()}>
        <h2>Settings</h2>

        <div className="settings-group">
          <label className="setting-row">
            <span>Dark Mode</span>
            <input
              type="checkbox"
              checked={settings.darkMode}
              onChange={e => updateSettings({ darkMode: e.target.checked })}
            />
          </label>

          <label className="setting-row">
            <span>Show Board Coordinates</span>
            <input
              type="checkbox"
              checked={settings.showBoardCoordinates}
              onChange={e => updateSettings({ showBoardCoordinates: e.target.checked })}
            />
          </label>

          <label className="setting-row">
            <span>Highlight Valid Words</span>
            <input
              type="checkbox"
              checked={settings.highlightValidWords}
              onChange={e => updateSettings({ highlightValidWords: e.target.checked })}
            />
          </label>

          <label className="setting-row">
            <span>Auto-Recall on Invalid</span>
            <input
              type="checkbox"
              checked={settings.autoRecallOnInvalid}
              onChange={e => updateSettings({ autoRecallOnInvalid: e.target.checked })}
            />
          </label>

          <label className="setting-row">
            <span>Sound Effects</span>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={e => updateSettings({ soundEnabled: e.target.checked })}
            />
          </label>
        </div>

        <div className="settings-version">{APP_VERSION}</div>

        {onSimulatorClick && (
          <>
            <hr className="settings-divider" />
            <button
              className="btn btn-primary settings-simulator-btn"
              onClick={() => { onClose(); onSimulatorClick(); }}
            >
              AI vs AI Simulator
            </button>
          </>
        )}

        <hr className="settings-divider" />
        <button
          className="btn btn-ghost"
          onClick={() => setShowDebug(true)}
          style={{ fontSize: 12, color: 'var(--text-muted)' }}
        >
          View Debug Logs
        </button>

        <button className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

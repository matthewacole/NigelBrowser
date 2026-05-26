import { useSettings } from '../../state/SettingsContext';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const { settings, updateSettings } = useSettings();

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
        </div>

        <button className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

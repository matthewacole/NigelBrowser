import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface Settings {
  animationSpeed: number;
  showBoardCoordinates: boolean;
  highlightValidWords: boolean;
  darkMode: boolean;
  autoRecallOnInvalid: boolean;
  soundEnabled: boolean;
}

const defaultSettings: Settings = {
  animationSpeed: 1.0,
  showBoardCoordinates: true,
  highlightValidWords: true,
  darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
  autoRecallOnInvalid: false,
  soundEnabled: true,
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('nigel_settings');
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {}
  return defaultSettings;
}

function saveSettings(s: Settings): void {
  localStorage.setItem('nigel_settings', JSON.stringify(s));
}

interface SettingsContextValue {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
    document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light');
  }, [settings]);

  const updateSettings = (partial: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

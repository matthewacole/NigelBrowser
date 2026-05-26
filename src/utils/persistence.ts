import type { GameState } from '../types/GameState';
import { TileBag } from '../engine/TileBag';

const SAVE_KEY = 'nigel_saved_game';

export function saveGame(state: GameState): void {
  try {
    const serializable = {
      ...state,
      bag: { _tiles: state.bag.tiles },
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(serializable));
  } catch (e) {
    console.error('Failed to save game:', e);
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    parsed.bag = TileBag.fromJSON(parsed.bag._tiles || []);
    return parsed as GameState;
  } catch (e) {
    console.error('Failed to load game:', e);
    return null;
  }
}

export function hasSavedGame(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function deleteSavedGame(): void {
  localStorage.removeItem(SAVE_KEY);
}

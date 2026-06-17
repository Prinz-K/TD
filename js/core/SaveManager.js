import { SAVE_KEY } from '../constants.js';

// Handles persistence of MetaProgression to localStorage.
export default class SaveManager {
  static load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.warn('SaveManager: failed to load save', err);
      return null;
    }
  }

  static save(data) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn('SaveManager: failed to save', err);
    }
  }

  static reset() {
    localStorage.removeItem(SAVE_KEY);
  }
}

// Shared constants and tiny utilities.

export const CANVAS_W = 1080;
export const CANVAS_H = 720;

// Width of the bloon track in pixels (visual and for placement blocking).
export const PATH_WIDTH = 44;

// Radius used for tower footprint / overlap checks.
export const TOWER_RADIUS = 22;

// Characters are drawn larger than the bloons they fight (BTD-style).
export const CHAR_SCALE = 1.35;

export const SAVE_KEY = 'brainrot_td_meta_v1';
export const RUN_SAVE_KEY = 'brainrot_td_run_v1';

export const STARTING_CASH = 650;
export const CAMPAIGN_ROUNDS = 40;
export const SELL_RATIO = 0.7;

// BTD-style difficulties: lives, price scaling, meta-point scaling.
export const DIFFICULTIES = {
  easy: { id: 'easy', name: 'Easy', lives: 200, priceMult: 0.85, pointsMult: 0.8 },
  medium: { id: 'medium', name: 'Medium', lives: 150, priceMult: 1.0, pointsMult: 1.0 },
  hard: { id: 'hard', name: 'Hard', lives: 100, priceMult: 1.1, pointsMult: 1.35 },
};
export const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];

export const TARGETING_MODES = ['First', 'Last', 'Strong', 'Close'];

let idCounter = 1;
export function uid(prefix = 'id') {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export function fmt(n) {
  return Math.floor(n).toLocaleString('en-US');
}

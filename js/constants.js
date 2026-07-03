// Shared constants and tiny utilities.

export const CANVAS_W = 1080;
export const CANVAS_H = 720;

// Width of the bloon track in pixels (visual and for placement blocking).
export const PATH_WIDTH = 44;

// Radius used for tower footprint / overlap checks.
export const TOWER_RADIUS = 19;

export const SAVE_KEY = 'brainrot_td_meta_v1';

export const STARTING_CASH = 650;
export const STARTING_LIVES = 150;
export const CAMPAIGN_ROUNDS = 40;
export const SELL_RATIO = 0.7;

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

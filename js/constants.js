// Global constants and small utilities shared across the game.

export const TILE_SIZE = 48;
export const GRID_COLS = 28;
export const GRID_ROWS = 18;
export const CANVAS_WIDTH = TILE_SIZE * GRID_COLS; // 1344
export const CANVAS_HEIGHT = TILE_SIZE * GRID_ROWS; // 864

export const TILE_BUILDABLE = 0;
export const TILE_PATH = 1;
export const TILE_NOBUILD = 2;

export const SAVE_KEY = 'circuit_surge_save';

export const CORE_START_HP = 20;
export const START_CPU = 200;

export const TARGETING_MODES = ['First', 'Last', 'Strongest', 'Closest'];

let idCounter = 1;
export function generateId(prefix = 'id') {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

export function tileCenter(gridX, gridY) {
  return {
    x: gridX * TILE_SIZE + TILE_SIZE / 2,
    y: gridY * TILE_SIZE + TILE_SIZE / 2,
  };
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function distance(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export function formatNumber(n) {
  return Math.floor(n).toLocaleString('en-US');
}

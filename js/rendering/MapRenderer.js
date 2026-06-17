import { TILE_SIZE, GRID_COLS, GRID_ROWS, TILE_PATH, TILE_NOBUILD } from '../constants.js';

// Draws the static map layer: grid lines, path lane, build tiles, hover glow.
export default class MapRenderer {
  constructor(ctx, grid) {
    this.ctx = ctx;
    this.grid = grid;
    this.hoverTile = null; // {x, y}
  }

  setHover(gridX, gridY) {
    this.hoverTile = { x: gridX, y: gridY };
  }

  clearHover() {
    this.hoverTile = null;
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, GRID_COLS * TILE_SIZE, GRID_ROWS * TILE_SIZE);

    // Background cyber grid
    ctx.fillStyle = '#050a14';
    ctx.fillRect(0, 0, GRID_COLS * TILE_SIZE, GRID_ROWS * TILE_SIZE);

    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const tile = this.grid.getTile(x, y);
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (tile === TILE_PATH) {
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.save();
          ctx.shadowColor = '#00ffff';
          ctx.shadowBlur = 8;
          ctx.strokeStyle = 'rgba(0,255,255,0.5)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          ctx.restore();
        } else if (tile === TILE_NOBUILD) {
          ctx.fillStyle = '#0a0a14';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = 'rgba(255,0,102,0.25)';
          ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        } else {
          ctx.fillStyle = '#0d1117';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = 'rgba(0,51,51,0.4)';
          ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        }
      }
    }

    // Hover glow on buildable tile
    if (this.hoverTile && this.grid.isBuildable(this.hoverTile.x, this.hoverTile.y)) {
      const px = this.hoverTile.x * TILE_SIZE;
      const py = this.hoverTile.y * TILE_SIZE;
      ctx.save();
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 16;
      ctx.fillStyle = 'rgba(0,255,255,0.15)';
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      ctx.restore();
    }
  }
}

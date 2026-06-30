import { TILE_SIZE, GRID_COLS, GRID_ROWS, TILE_PATH, TILE_NOBUILD } from '../constants.js';

// Draws the static map layer in a soft, bright "toon" style (Bloons-like):
// a grassy field with a checkerboard, a warm sandy path lane, and a soft
// hover highlight on buildable tiles.
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
    const W = GRID_COLS * TILE_SIZE;
    const H = GRID_ROWS * TILE_SIZE;
    ctx.clearRect(0, 0, W, H);

    // Grassy base
    ctx.fillStyle = '#8fd06a';
    ctx.fillRect(0, 0, W, H);

    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const tile = this.grid.getTile(x, y);
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (tile === TILE_PATH) {
          // Warm sandy lane with a soft rounded look.
          ctx.fillStyle = '#e9c987';
          this._roundRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2, 10);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          this._roundRect(px + 4, py + 4, TILE_SIZE - 8, (TILE_SIZE - 8) * 0.45, 8);
          ctx.fill();
        } else if (tile === TILE_NOBUILD) {
          // "Base" / decorative zone — soft blue plaza.
          ctx.fillStyle = '#bfe0f0';
          this._roundRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4, 8);
          ctx.fill();
        } else {
          // Buildable grass: gentle checkerboard for depth.
          ctx.fillStyle = (x + y) % 2 === 0 ? '#8fd06a' : '#84c861';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          // tiny grass tuft
          ctx.fillStyle = 'rgba(60,140,60,0.22)';
          ctx.beginPath();
          ctx.arc(px + TILE_SIZE * 0.7, py + TILE_SIZE * 0.72, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Hover highlight on buildable tile
    if (this.hoverTile && this.grid.isBuildable(this.hoverTile.x, this.hoverTile.y)) {
      const px = this.hoverTile.x * TILE_SIZE;
      const py = this.hoverTile.y * TILE_SIZE;
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.30)';
      this._roundRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4, 10);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      this._roundRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4, 10);
      ctx.stroke();
      ctx.restore();
    }
  }

  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
}

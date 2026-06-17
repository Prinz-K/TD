import { GRID_COLS, GRID_ROWS, TILE_BUILDABLE } from '../constants.js';

// Wraps the tile array and tracks tower occupancy per tile.
export default class Grid {
  constructor(mapData) {
    this.tiles = mapData.tiles;
    this.occupancy = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      this.occupancy.push(new Array(GRID_COLS).fill(null));
    }
  }

  inBounds(x, y) {
    return x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS;
  }

  getTile(x, y) {
    if (!this.inBounds(x, y)) return null;
    return this.tiles[y][x];
  }

  isBuildable(x, y) {
    if (!this.inBounds(x, y)) return false;
    return this.tiles[y][x] === TILE_BUILDABLE && !this.occupancy[y][x];
  }

  occupy(x, y, towerId) {
    if (this.inBounds(x, y)) this.occupancy[y][x] = towerId;
  }

  vacate(x, y) {
    if (this.inBounds(x, y)) this.occupancy[y][x] = null;
  }

  getOccupant(x, y) {
    if (!this.inBounds(x, y)) return null;
    return this.occupancy[y][x];
  }

  worldToGrid(px, py) {
    return { x: Math.floor(px / 48), y: Math.floor(py / 48) };
  }
}

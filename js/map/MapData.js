import { GRID_COLS, GRID_ROWS, TILE_BUILDABLE, TILE_PATH, TILE_NOBUILD } from '../constants.js';

// "Mainframe Delta" — a 28x18 map with a winding path (5 turns).
// The path is authored as an ordered list of grid waypoints; the tile grid
// is then derived from it so PathManager and Grid stay in sync.

function buildPathWaypoints() {
  // Winding path: enters left-middle, snakes through several turns, ends at
  // a "core" area on the right side.
  return [
    { x: 0, y: 2 },
    { x: 4, y: 2 },
    { x: 4, y: 8 },
    { x: 9, y: 8 },
    { x: 9, y: 3 },
    { x: 14, y: 3 },
    { x: 14, y: 13 },
    { x: 19, y: 13 },
    { x: 19, y: 6 },
    { x: 23, y: 6 },
    { x: 23, y: 15 },
    { x: 27, y: 15 },
  ];
}

function rasterizeWaypoints(waypoints) {
  const tiles = new Set();
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    if (a.x === b.x) {
      const [y0, y1] = a.y < b.y ? [a.y, b.y] : [b.y, a.y];
      for (let y = y0; y <= y1; y++) tiles.add(`${a.x},${y}`);
    } else {
      const [x0, x1] = a.x < b.x ? [a.x, b.x] : [b.x, a.x];
      for (let x = x0; x <= x1; x++) tiles.add(`${x},${a.y}`);
    }
  }
  return tiles;
}

export function createMainframeDelta() {
  const waypoints = buildPathWaypoints();
  const pathTiles = rasterizeWaypoints(waypoints);

  const tiles = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    const row = [];
    for (let x = 0; x < GRID_COLS; x++) {
      row.push(pathTiles.has(`${x},${y}`) ? TILE_PATH : TILE_BUILDABLE);
    }
    tiles.push(row);
  }

  // Mark a decorative "core" no-build zone around the path end.
  const end = waypoints[waypoints.length - 1];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = end.x + dx;
      const y = end.y + dy;
      if (x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS) {
        if (tiles[y][x] !== TILE_PATH) tiles[y][x] = TILE_NOBUILD;
      }
    }
  }

  return {
    name: 'Mainframe Delta',
    tiles,
    waypoints,
  };
}

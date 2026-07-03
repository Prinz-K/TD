import { dist } from '../constants.js';

// Smooth curved track, Bloons-style. Waypoints are run through Catmull-Rom
// interpolation and sampled into a dense polyline with cumulative distances,
// so bloons can be positioned by "distance traveled" and placement code can
// measure distance-to-track.
export default class GamePath {
  constructor(waypoints) {
    this.waypoints = waypoints;
    this.pts = [];       // [{x, y}]
    this.cum = [];       // cumulative distance at each pt
    this._sample();
    this.total = this.cum[this.cum.length - 1];
  }

  _sample() {
    const wp = this.waypoints;
    const P = (i) => wp[Math.max(0, Math.min(wp.length - 1, i))];
    for (let i = 0; i < wp.length - 1; i++) {
      const p0 = P(i - 1); const p1 = P(i); const p2 = P(i + 1); const p3 = P(i + 2);
      const segLen = dist(p1.x, p1.y, p2.x, p2.y);
      const steps = Math.max(4, Math.ceil(segLen / 5));
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        this.pts.push(this._catmull(p0, p1, p2, p3, t));
      }
    }
    this.pts.push({ ...wp[wp.length - 1] });

    let d = 0;
    this.cum.push(0);
    for (let i = 1; i < this.pts.length; i++) {
      d += dist(this.pts[i - 1].x, this.pts[i - 1].y, this.pts[i].x, this.pts[i].y);
      this.cum.push(d);
    }
  }

  _catmull(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return {
      x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    };
  }

  // Position at a given distance along the track. reachedEnd when past it.
  getPos(d) {
    if (d <= 0) return { ...this.pts[0], reachedEnd: false };
    if (d >= this.total) return { ...this.pts[this.pts.length - 1], reachedEnd: true };
    // binary search over cum
    let lo = 0;
    let hi = this.cum.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (this.cum[mid] <= d) lo = mid; else hi = mid;
    }
    const segLen = this.cum[hi] - this.cum[lo] || 1;
    const t = (d - this.cum[lo]) / segLen;
    const a = this.pts[lo];
    const b = this.pts[hi];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, reachedEnd: false };
  }

  // Minimum distance from a point to the track centerline (for placement).
  distTo(x, y) {
    let best = Infinity;
    for (let i = 0; i < this.pts.length; i += 2) {
      const d = dist(x, y, this.pts[i].x, this.pts[i].y);
      if (d < best) best = d;
    }
    return best;
  }
}

// The default map: "Meadow Meander" — a winding S-curve track through a
// bright meadow, entering top-left and exiting bottom-right.
export function createMeadowMeander() {
  return new GamePath([
    { x: -40, y: 120 },
    { x: 140, y: 115 },
    { x: 255, y: 175 },
    { x: 285, y: 320 },
    { x: 205, y: 430 },
    { x: 180, y: 555 },
    { x: 300, y: 640 },
    { x: 460, y: 615 },
    { x: 550, y: 495 },
    { x: 515, y: 360 },
    { x: 590, y: 240 },
    { x: 750, y: 205 },
    { x: 865, y: 295 },
    { x: 850, y: 450 },
    { x: 745, y: 545 },
    { x: 770, y: 655 },
    { x: 920, y: 680 },
    { x: 1120, y: 660 },
  ]);
}

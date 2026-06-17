import { tileCenter } from '../constants.js';

// Converts the map's grid waypoints into a list of world-pixel points and
// provides helpers to walk along the path by distance.
export default class PathManager {
  constructor(mapData) {
    this.points = mapData.waypoints.map((wp) => tileCenter(wp.x, wp.y));
    this.segmentLengths = [];
    this.totalLength = 0;
    for (let i = 0; i < this.points.length - 1; i++) {
      const a = this.points[i];
      const b = this.points[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      this.segmentLengths.push(len);
      this.totalLength += len;
    }
  }

  getStartPoint() {
    return { ...this.points[0] };
  }

  getEndPoint() {
    return { ...this.points[this.points.length - 1] };
  }

  // Returns {x, y, reachedEnd} for a given distance traveled along the path.
  getPositionAtDistance(dist) {
    if (dist <= 0) return { ...this.points[0], reachedEnd: false };
    let remaining = dist;
    for (let i = 0; i < this.segmentLengths.length; i++) {
      const segLen = this.segmentLengths[i];
      if (remaining <= segLen) {
        const a = this.points[i];
        const b = this.points[i + 1];
        const t = segLen === 0 ? 0 : remaining / segLen;
        return {
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          reachedEnd: false,
        };
      }
      remaining -= segLen;
    }
    const end = this.points[this.points.length - 1];
    return { x: end.x, y: end.y, reachedEnd: true };
  }
}

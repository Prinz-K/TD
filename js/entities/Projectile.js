import { generateId } from '../constants.js';

// A simple traveling projectile fired by single-target towers (CompilerCannon).
// PulseEmitter's chain lightning is drawn directly as arcs (EffectsSystem),
// not via this class, since chains resolve instantly.
export default class Projectile {
  constructor(x, y, target, damage, color, options = {}) {
    this.id = generateId('proj');
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.color = color;
    this.speed = options.speed || 600;
    this.armorPierce = options.armorPierce || 0;
    this.fullArmorIgnore = !!options.fullArmorIgnore;
    this.onHit = options.onHit || null; // callback(enemy)
    this.alive = true;
    this.radius = options.radius || 4;
  }

  update(dt) {
    if (!this.target || !this.target.alive) {
      this.alive = false;
      return;
    }
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * dt;
    if (dist <= step || dist === 0) {
      this.x = this.target.x;
      this.y = this.target.y;
      this._hit();
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
  }

  _hit() {
    this.alive = false;
    if (this.onHit) this.onHit(this.target);
  }
}

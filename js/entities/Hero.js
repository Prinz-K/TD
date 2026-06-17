import { clamp, distance, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

// Player-controlled hero. WASD movement, auto-attack nearest visible enemy,
// EMP Burst (E) and Purge (Q) abilities with cooldowns.
export default class Hero {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 180;
    this.hp = 100;
    this.maxHp = 100;
    this.radius = 14;

    this.attackRange = 120;
    this.attackDamage = 30;
    this.attackRate = 1.5; // per second
    this.attackCooldown = 0;

    this.empRadius = 150;
    this.empDuration = 2.5;
    this.empCooldownMax = 8;
    this.empCooldown = 0;

    this.purgeRadius = 200;
    this.purgeCooldownMax = 12;
    this.purgeCooldown = 0;

    this.passiveScan = false; // meta upgrade: auto-detect camo within 100px
    this.passiveScanRadius = 100;

    this.trail = []; // fading movement trail: [{x,y,life}]
    this.maxTrail = 18;
  }

  applyMetaModifiers(meta) {
    if (meta.passiveScan) this.passiveScan = true;
    if (meta.heroAbilityCdLevel) {
      const reduction = 1 - meta.heroAbilityCdLevel * 0.10;
      this.empCooldownMax = 8 * reduction;
      this.purgeCooldownMax = 12 * reduction;
    }
  }

  canDetect(enemy) {
    if (this.passiveScan && distance(this.x, this.y, enemy.x, enemy.y) <= this.passiveScanRadius) {
      return true;
    }
    return false;
  }

  move(dx, dy, dt) {
    if (dx === 0 && dy === 0) return;
    const len = Math.hypot(dx, dy);
    const nx = dx / len;
    const ny = dy / len;
    this.x = clamp(this.x + nx * this.speed * dt, this.radius, CANVAS_WIDTH - this.radius);
    this.y = clamp(this.y + ny * this.speed * dt, this.radius, CANVAS_HEIGHT - this.radius);
  }

  updateTrail() {
    this.trail.unshift({ x: this.x, y: this.y, life: 1 });
    if (this.trail.length > this.maxTrail) this.trail.pop();
    for (const t of this.trail) t.life -= 1 / this.maxTrail;
  }

  updateCooldowns(dt) {
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.empCooldown > 0) this.empCooldown -= dt;
    if (this.purgeCooldown > 0) this.purgeCooldown -= dt;
  }

  canUseEmp() {
    return this.empCooldown <= 0;
  }

  canUsePurge() {
    return this.purgeCooldown <= 0;
  }

  useEmp() {
    if (!this.canUseEmp()) return false;
    this.empCooldown = this.empCooldownMax;
    return true;
  }

  usePurge() {
    if (!this.canUsePurge()) return false;
    this.purgeCooldown = this.purgeCooldownMax;
    return true;
  }
}

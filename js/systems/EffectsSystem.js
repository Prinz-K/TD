// Manages transient visual particles, chain-lightning arcs, and AoE flashes.
// EffectsRenderer reads these arrays each frame; this system only updates
// lifetimes/positions and listens to combat events to spawn new effects.
export default class EffectsSystem {
  constructor(eventBus) {
    this.bus = eventBus;
    this.particles = []; // {x,y,vx,vy,life,maxLife,color,radius}
    this.arcs = []; // {x1,y1,x2,y2,life,maxLife,color}
    this.flashes = []; // {x,y,radius,life,maxLife,color}

    this.bus.on('enemyHit', ({ enemy, amount }) => this.spawnHitParticles(enemy.x, enemy.y, '#ffffff'));
    this.bus.on('chainLightning', ({ arcs, color }) => this.spawnArcs(arcs, color));
    this.bus.on('aoeBurst', ({ x, y, radius, color }) => this.spawnFlash(x, y, radius, color));
    this.bus.on('shockwave', ({ x, y, radius, color }) => this.spawnFlash(x, y, radius, color));
    this.bus.on('shockwaveKill', ({ x, y, radius }) => this.spawnFlash(x, y, radius, '#ff6600'));
    this.bus.on('empBurst', ({ x, y, radius }) => this.spawnFlash(x, y, radius, '#b07fd0'));
    this.bus.on('purge', ({ x, y, radius }) => this.spawnFlash(x, y, radius, '#5aa9e0'));
    this.bus.on('heroAttack', ({ x, y, tx, ty }) => this.spawnArcs([{ x1: x, y1: y, x2: tx, y2: ty }], '#ff7fb0', 0.1));
    this.bus.on('enemyDeath', ({ x, y, color }) => this.spawnDeathParticles(x, y, color));
  }

  spawnHitParticles(x, y, color) {
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 60;
      this.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 0.3, maxLife: 0.3, color, radius: 2 + Math.random() * 2,
      });
    }
  }

  spawnDeathParticles(x, y, color) {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 100;
      this.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 0.6, maxLife: 0.6, color, radius: 2 + Math.random() * 3,
      });
    }
  }

  spawnArcs(arcs, color, life = 0.18) {
    for (const a of arcs) {
      this.arcs.push({ ...a, life, maxLife: life, color });
    }
  }

  spawnFlash(x, y, radius, color) {
    this.flashes.push({ x, y, radius, life: 0.35, maxLife: 0.35, color });
  }

  update(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    for (const a of this.arcs) a.life -= dt;
    this.arcs = this.arcs.filter((a) => a.life > 0);

    for (const f of this.flashes) f.life -= dt;
    this.flashes = this.flashes.filter((f) => f.life > 0);
  }
}

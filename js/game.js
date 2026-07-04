import {
  CANVAS_W, CANVAS_H, PATH_WIDTH, TOWER_RADIUS, STARTING_CASH, STARTING_LIVES,
  CAMPAIGN_ROUNDS, SELL_RATIO, dist, clamp,
} from './constants.js';
import { rbe } from './data/bloons.js';
import { getRound, roundEndCash } from './data/rounds.js';
import { getTowerDef } from './data/towers.js';
import { createMeadowMeander } from './engine/path.js';
import { Bloon, Tower, Projectile } from './engine/entities.js';
import {
  renderMapToCanvas, drawBloon, drawTower, drawProjectile, drawEffect, drawGhost, drawClouds,
} from './render.js';
import Meta from './meta.js';
import UI from './ui.js';

export default class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.path = createMeadowMeander();
    this.mapCanvas = renderMapToCanvas(this.path);
    this.meta = new Meta();
    // slow drifting clouds over the meadow
    this.clouds = [
      { y: 90, scale: 1.1, speed: 9, off: 100 },
      { y: 260, scale: 0.8, speed: 13, off: 620 },
      { y: 470, scale: 1.3, speed: 7, off: 340 },
      { y: 620, scale: 0.9, speed: 11, off: 900 },
    ];

    this.state = 'menu'; // menu | playing | victory | defeat
    this._resetRun();
    this.ui = new UI(this);

    this._bindInput();
    this.ui.showMenu();

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this._loop(t));
  }

  _resetRun() {
    this.cash = STARTING_CASH + this.meta.getStartCashBonus();
    this.lives = STARTING_LIVES + this.meta.getStartLivesBonus();
    this.round = 0; // completed rounds; next is round+1
    this.roundActive = false;
    this.bloons = [];
    this.towers = [];
    this.projectiles = [];
    this.effects = [];
    this.spawnQueue = [];
    this.roundTime = 0;
    this.speedMult = 1;
    this.placingType = null;
    this.selectedTower = null;
    this.mouse = { x: -100, y: -100 };
    this.xpEarned = 0;
    this.pointsBanked = false;
    this.time = 0; // animation clock
  }

  // ------------------------------------------------------------ flow ----

  startRun() {
    this._resetRun();
    this.state = 'playing';
    this.ui.hideOverlays();
    this.ui.refreshShop();
    this.ui.refresh();
    this.ui.showTowerInfo(null);
  }

  startRound() {
    if (this.roundActive || this.state !== 'playing') return;
    const groups = getRound(this.round + 1);
    this.spawnQueue = [];
    for (const grp of groups) {
      for (let i = 0; i < grp.n; i++) {
        this.spawnQueue.push({
          at: grp.delay + i * grp.sp,
          t: grp.t,
          camo: !!grp.camo,
          regrow: !!grp.regrow,
          hpMult: grp.hpMult || 1,
        });
      }
    }
    this.spawnQueue.sort((a, b) => a.at - b.at);
    this.roundTime = 0;
    this.roundActive = true;
    this.ui.refresh();
  }

  _endRound() {
    this.roundActive = false;
    this.round += 1;
    this.cash += roundEndCash(this.round) + this.meta.getRoundCashBonus();

    // Banana farms produce; banks add interest.
    for (const t of this.towers) {
      if (t.stats.income > 0) {
        this.cash += t.stats.income;
        this.effects.push({ type: 'cash', x: t.x, y: t.y - 22, text: `+$${t.stats.income}`, life: 1.2, maxLife: 1.2 });
      }
      if (t.stats.interest) {
        const gain = Math.min(Math.floor(this.cash * 0.05), t.stats.interestCap);
        this.cash += gain;
      }
    }

    if (this.round === CAMPAIGN_ROUNDS) {
      this._finishRun('victory');
    }
    this.ui.refresh();
  }

  _finishRun(result) {
    this.state = result;
    this._bankPoints(result === 'victory' ? 150 : 0);
    if (result === 'victory') this.ui.showVictory();
    else this.ui.showDefeat();
  }

  continueFreeplay() {
    this.state = 'playing';
    this.ui.hideOverlays();
  }

  _bankPoints(bonus = 0) {
    if (this.pointsBanked) return;
    this.pointsBanked = true;
    this.earnedPoints = Math.floor(this.xpEarned / 10) + bonus;
    this.meta.addPoints(this.earnedPoints);
  }

  toggleSpeed() {
    this.speedMult = this.speedMult === 1 ? 3 : 1;
    this.ui.refresh();
  }

  // ----------------------------------------------------------- input ----

  _bindInput() {
    this.canvas.addEventListener('mousemove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (CANVAS_W / r.width);
      this.mouse.y = (e.clientY - r.top) * (CANVAS_H / r.height);
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.x = -100;
      this.mouse.y = -100;
    });
    this.canvas.addEventListener('click', () => this._onClick());
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.cancelPlacing();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.cancelPlacing();
      if (e.key === ' ' && this.state === 'playing') {
        e.preventDefault();
        if (!this.roundActive) this.startRound();
        else this.toggleSpeed();
      }
    });
  }

  _onClick() {
    if (this.state !== 'playing') return;
    const { x, y } = this.mouse;

    if (this.placingType) {
      if (this.canPlaceAt(x, y) && this.cash >= getTowerDef(this.placingType).cost) {
        const def = getTowerDef(this.placingType);
        this.cash -= def.cost;
        const tower = new Tower(this.placingType, x, y);
        this.towers.push(tower);
        // dust puff timed to the landing of the drop-in animation
        this.effects.push({ type: 'dust', x, y: y + 16, delay: 0.3, life: 0.45, maxLife: 0.45 });
        this._recomputeAuras();
        this.selectTower(tower);
        this.placingType = null;
        this.ui.refresh();
      }
      return;
    }

    // select tower under cursor
    let hit = null;
    for (const t of this.towers) {
      if (dist(x, y, t.x, t.y) <= TOWER_RADIUS + 4) hit = t;
    }
    this.selectTower(hit);
  }

  beginPlacing(typeId) {
    if (this.state !== 'playing') return;
    this.placingType = typeId;
    this.selectTower(null);
  }

  cancelPlacing() {
    this.placingType = null;
    this.ui.refresh();
  }

  canPlaceAt(x, y) {
    if (x < TOWER_RADIUS || y < TOWER_RADIUS || x > CANVAS_W - TOWER_RADIUS || y > CANVAS_H - TOWER_RADIUS) return false;
    if (this.path.distTo(x, y) < PATH_WIDTH / 2 + TOWER_RADIUS - 4) return false;
    for (const t of this.towers) {
      if (dist(x, y, t.x, t.y) < TOWER_RADIUS * 2 - 2) return false;
    }
    return true;
  }

  selectTower(tower) {
    this.selectedTower = tower;
    this.ui.showTowerInfo(tower);
  }

  // -------------------------------------------------- tower actions ----

  upgradeTower(tower, pathIdx) {
    const tier = tower.nextTier(pathIdx);
    if (!tier || !tower.canBuyTier(pathIdx) || this.cash < tier.cost) return;
    this.cash -= tier.cost;
    tower.buyTier(pathIdx);
    this.effects.push({ type: 'sparkle', x: tower.x, y: tower.y, life: 0.9, maxLife: 0.9 });
    this._recomputeAuras();
    this.ui.refresh();
    this.ui.showTowerInfo(tower);
  }

  sellTower(tower) {
    this.cash += tower.sellValue(SELL_RATIO);
    this.towers = this.towers.filter((t) => t.id !== tower.id);
    this._recomputeAuras();
    this.selectTower(null);
    this.ui.refresh();
  }

  _recomputeAuras() {
    for (const t of this.towers) {
      t.buffs = { rangeMult: 0, rateMult: 0, damageAdd: 0, camo: false };
    }
    for (const p of this.towers) {
      if (p.typeId !== 'patapim') continue;
      p.recompute();
      for (const t of this.towers) {
        if (t.id === p.id || t.def.attack === 'none') continue;
        if (dist(p.x, p.y, t.x, t.y) > p.stats.range) continue;
        t.buffs.rangeMult = Math.max(t.buffs.rangeMult, p.stats.allyRangeMult);
        t.buffs.rateMult = Math.max(t.buffs.rateMult, p.stats.allyRateMult);
        t.buffs.damageAdd = Math.max(t.buffs.damageAdd, p.stats.allyDamageAdd);
        t.buffs.camo = t.buffs.camo || p.stats.allyCamo;
      }
    }
    for (const t of this.towers) t.recompute();
  }

  // ------------------------------------------------------------ loop ----

  _loop(now) {
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    dt = Math.min(dt, 0.05);
    if (this.state === 'playing' || this.state === 'victory' || this.state === 'defeat') {
      const steps = this.speedMult;
      for (let i = 0; i < steps; i++) {
        if (this.state === 'playing') this._update(dt);
      }
    }
    this._render();
    requestAnimationFrame((t) => this._loop(t));
  }

  _update(dt) {
    this.time += dt;

    // spawn
    if (this.roundActive) {
      this.roundTime += dt;
      while (this.spawnQueue.length && this.spawnQueue[0].at <= this.roundTime) {
        const s = this.spawnQueue.shift();
        this.bloons.push(new Bloon(s.t, { camo: s.camo, regrow: s.regrow, hpMult: s.hpMult }));
      }
    }

    // bloons
    for (const b of this.bloons) {
      b.update(dt, this.path);
      if (b.escaped) {
        this.lives -= rbe(b.typeId);
        if (this.lives <= 0) {
          this.lives = 0;
          this._finishRun('defeat');
          return;
        }
      }
    }
    this.bloons = this.bloons.filter((b) => b.alive && !b.escaped);

    // Patapim aura slow
    for (const p of this.towers) {
      if (p.typeId === 'patapim' && p.stats.auraSlow > 0) {
        for (const b of this.bloons) {
          if (dist(p.x, p.y, b.x, b.y) <= p.stats.range) b.applySlow(p.stats.auraSlow, 0.2);
        }
      }
    }

    // towers attack + animation timers
    for (const t of this.towers) {
      if (t.spawnT > 0) t.spawnT -= dt;
      if (t.recoilT > 0) t.recoilT -= dt;
      if (t.celebrateT > 0) t.celebrateT -= dt;
      this._updateTower(t, dt);
    }

    // projectiles
    for (const p of this.projectiles) {
      p.update(dt);
      if (p.alive) this._collideProjectile(p);
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);

    // effects (delay counts down before life starts draining)
    for (const fx of this.effects) {
      if (fx.delay > 0) fx.delay -= dt;
      else fx.life -= dt;
    }
    this.effects = this.effects.filter((fx) => fx.life > 0);

    // round completion
    if (this.roundActive && this.spawnQueue.length === 0 && this.bloons.length === 0) {
      this._endRound();
    }

    this.ui.refreshStats();
  }

  _updateTower(t, dt) {
    if (t.def.attack === 'none') return;
    t.cooldown -= dt;
    if (t.cooldown > 0) return;

    if (t.def.attack === 'pulse') {
      const inRange = this.bloons.filter((b) => b.visibleTo(t.stats.camoDetect)
        && dist(t.x, t.y, b.x, b.y) <= t.stats.range);
      if (inRange.length === 0) return;
      t.cooldown = 1 / t.stats.rate;
      t.recoilT = 0.15;
      this.effects.push({ type: 'pulse', x: t.x, y: t.y, radius: t.stats.range, color: '#bfe3ff', life: 0.4, maxLife: 0.4 });
      for (const b of inRange) {
        this._damageBloon(b, t.stats.damage, t.def.damageType, t.stats.moabBonus);
        if (!b.def.immune.includes('cold')) {
          b.applySlow(Math.min(0.85, t.stats.slowPct), t.stats.slowDur);
          if (t.stats.stun > 0) b.applyStun(t.stats.stun);
        }
      }
      return;
    }

    if (t.def.attack === 'radial') {
      const any = this.bloons.some((b) => b.visibleTo(t.stats.camoDetect)
        && dist(t.x, t.y, b.x, b.y) <= t.stats.range + 20);
      if (!any) return;
      t.cooldown = 1 / t.stats.rate;
      t.recoilT = 0.15;
      const n = t.stats.radialCount;
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + Math.random() * 0.15;
        const proj = new Projectile(t.x, t.y, angle, t);
        proj.maxTravel = t.stats.range;
        this.projectiles.push(proj);
      }
      return;
    }

    // projectile attack
    const target = this._pickTarget(t);
    if (!target) return;
    t.cooldown = 1 / t.stats.rate;

    // lead the target: estimate travel time and aim at its future position
    const d = dist(t.x, t.y, target.x, target.y);
    const eta = d / t.stats.projSpeed;
    const futureDist = target.distance + (70 * target.def.speed * (1 - target.slowPct)) * eta;
    const future = this.path.getPos(futureDist);
    const angle = Math.atan2(future.y - t.y, future.x - t.x);
    t.aimAngle = angle;
    t.recoilT = 0.15;

    const shots = 1 + (t.stats.multishot || 0);
    for (let i = 0; i < shots; i++) {
      const spread = shots > 1 ? (i - (shots - 1) / 2) * 0.18 : 0;
      this.projectiles.push(new Projectile(t.x, t.y, angle + spread, t));
    }
  }

  _pickTarget(t) {
    let best = null;
    let bestVal = null;
    for (const b of this.bloons) {
      if (!b.visibleTo(t.stats.camoDetect)) continue;
      const d = dist(t.x, t.y, b.x, b.y);
      if (d > t.stats.range) continue;
      let val;
      switch (t.targeting) {
        case 'Last': val = -b.distance; break;
        case 'Strong': val = b.isMoab ? 1e6 + b.hp : rbe(b.typeId); break;
        case 'Close': val = -d; break;
        case 'First': default: val = b.distance;
      }
      if (best === null || val > bestVal) { best = b; bestVal = val; }
    }
    return best;
  }

  _collideProjectile(p) {
    for (const b of this.bloons) {
      if (!b.alive || p.hitIds.has(b.id)) continue;
      if (!b.visibleTo(p.camoDetect)) continue;
      const hitR = b.def.radius + 5;
      if (dist(p.x, p.y, b.x, b.y) > hitR) continue;

      p.hitIds.add(b.id);

      if (p.aoeRadius > 0) {
        // explosion: damage everything in radius, projectile dies
        this.effects.push({ type: 'boom', x: b.x, y: b.y, radius: p.aoeRadius, life: 0.3, maxLife: 0.3 });
        for (const e of this.bloons) {
          if (!e.alive) continue;
          if (dist(b.x, b.y, e.x, e.y) <= p.aoeRadius) {
            this._damageBloon(e, p.damage, p.damageType, p.moabBonus);
            if (p.stun > 0 && e.alive) e.applyStun(p.stun);
          }
        }
        p.alive = false;
        return;
      }

      this._damageBloon(b, p.damage, p.damageType, p.moabBonus);
      p.pierce -= 1;
      if (p.pierce <= 0) { p.alive = false; return; }
    }
  }

  // Apply damage; on pop spawn children (inheriting camo/regrow/lineage).
  _damageBloon(b, amount, damageType, moabBonus) {
    if (!b.alive) return;
    const dealt = b.takeDamage(amount, damageType, moabBonus);
    if (dealt > 0) {
      this.cash += dealt;
      this.xpEarned += dealt;
    }
    if (!b.alive) {
      this._spawnDeathFx(b);
      const children = b.def.children;
      children.forEach((childType, i) => {
        this.bloons.push(new Bloon(childType, {
          camo: b.camo,
          regrow: b.regrow,
          hpMult: b.hpMult,
          distance: Math.max(0, b.distance - i * 16),
          lineage: b.regrow ? [...b.lineage, b.typeId] : [],
        }));
      });
    }
  }

  // Pop / destruction animations. Regular bloons burst into rubber shards;
  // MOAB-class goes down in a chain of staggered explosions.
  _spawnDeathFx(b) {
    const r = b.def.radius;
    this.effects.push({ type: 'pop', x: b.x, y: b.y, radius: r, color: b.def.color, life: 0.28, maxLife: 0.28 });

    const nShards = b.isMoab ? 16 : 7;
    const parts = [];
    for (let i = 0; i < nShards; i++) {
      parts.push({
        a: (i / nShards) * Math.PI * 2 + Math.random() * 0.6,
        sp: 90 + Math.random() * 140 + (b.isMoab ? 80 : 0),
        r: 2.5 + Math.random() * 3 + (b.isMoab ? 2 : 0),
        rot: Math.random() * Math.PI * 2,
      });
    }
    this.effects.push({ type: 'shards', x: b.x, y: b.y, color: b.def.color, parts, life: 0.6, maxLife: 0.6 });

    if (b.isMoab) {
      for (let i = 0; i < 3; i++) {
        this.effects.push({
          type: 'boom',
          x: b.x + (Math.random() - 0.5) * r * 1.6,
          y: b.y + (Math.random() - 0.5) * r,
          radius: r * (1.1 + i * 0.35),
          delay: i * 0.12,
          life: 0.35,
          maxLife: 0.35,
        });
      }
    }
  }

  // ---------------------------------------------------------- render ----

  _render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.drawImage(this.mapCanvas, 0, 0);
    drawClouds(ctx, this.clouds, this.time);

    // bloons sorted so the furthest along draws on top
    const sorted = [...this.bloons].sort((a, b) => a.distance - b.distance);
    for (const b of sorted) drawBloon(ctx, b, this.time);

    for (const t of this.towers) drawTower(ctx, t, this.selectedTower && t.id === this.selectedTower.id, this.time);
    for (const p of this.projectiles) drawProjectile(ctx, p);
    for (const fx of this.effects) drawEffect(ctx, fx);

    if (this.placingType && this.state === 'playing') {
      const def = getTowerDef(this.placingType);
      drawGhost(ctx, this.placingType, this.mouse.x, this.mouse.y, def.range, this.canPlaceAt(this.mouse.x, this.mouse.y));
    }
  }
}

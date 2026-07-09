import {
  CANVAS_W, CANVAS_H, PATH_WIDTH, TOWER_RADIUS, STARTING_CASH,
  CAMPAIGN_ROUNDS, SELL_RATIO, DIFFICULTIES, RUN_SAVE_KEY, dist, clamp,
} from './constants.js';
import { rbe } from './data/bloons.js';
import { getRound, roundEndCash } from './data/rounds.js';
import { getTowerDef, TOWER_ORDER } from './data/towers.js';
import { createMap } from './engine/path.js';
import { Bloon, Tower, Projectile } from './engine/entities.js';
import {
  renderMapToCanvas, drawBloon, drawTower, drawProjectile, drawEffect, drawGhost, drawClouds, drawBossBar,
} from './render.js';
import Meta from './meta.js';
import Sfx from './audio.js';
import Music from './music.js';
import UI from './ui.js';
import MenuUI from './screens.js';

export default class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.selectedMapId = 'meadow';
    this.difficulty = 'medium';
    const map = createMap(this.selectedMapId);
    this.path = map.path;
    this.mapCanvas = renderMapToCanvas(this.path, map.theme);
    this.meta = new Meta();
    this.sfx = new Sfx();
    this.music = new Music(this.sfx);
    // music may only start after a user gesture (autoplay policy)
    const startMusic = () => {
      this.music.start(this._desiredTrack());
      document.removeEventListener('pointerdown', startMusic);
    };
    document.addEventListener('pointerdown', startMusic);
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
    this.menu = new MenuUI(this);

    this._bindInput();
    this.menu.show('title');

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this._loop(t));
  }

  _resetRun() {
    this.cash = STARTING_CASH + this.meta.getStartCashBonus();
    this.lives = DIFFICULTIES[this.difficulty].lives + this.meta.getStartLivesBonus();
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
    this.popsRecorded = 0;
    this.time = 0; // animation clock
    this.abilityCds = {};   // typeId -> remaining cooldown seconds
    this.rateBuffs = [];    // [{typeId|null, mult, t}] from abilities
    this.bossRoundActive = false;
  }

  // Pick the music track matching the current game situation.
  _desiredTrack() {
    if (this.state !== 'playing') return 'menu';
    if (this.roundActive && this.bossRoundActive) return 'boss';
    if (this.selectedMapId === 'dunes') return 'dunes';
    return this.round % 2 === 0 ? 'meadow1' : 'meadow2';
  }

  refreshMusic() {
    this.music.setTrack(this._desiredTrack());
  }

  // ------------------------------------------------------------ flow ----

  // Only callable from the menu (no towers placed yet).
  setMap(id) {
    if (this.state === 'playing') return;
    this.selectedMapId = id;
    const map = createMap(id);
    this.path = map.path;
    this.mapCanvas = renderMapToCanvas(this.path, map.theme);
  }

  setDifficulty(id) {
    if (this.state === 'playing' || !DIFFICULTIES[id]) return;
    this.difficulty = id;
  }

  // Difficulty-scaled price for any base cost (towers, upgrades, sells).
  price(base) {
    return Math.round(base * DIFFICULTIES[this.difficulty].priceMult);
  }

  startRun() {
    this.clearRun();
    this._resetRun();
    this.meta.recordGameStart();
    this.state = 'playing';
    this.ui.hideOverlays();
    this.ui.refreshShop();
    this.ui.refresh();
    this.ui.showTowerInfo(null);
    this.refreshMusic();
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
    this.bossRoundActive = groups.some((grp) => grp.t === 'moab' || grp.t === 'bfb' || grp.t.startsWith('boss_'));
    this.sfx.play('roundStart');
    if (this.bossRoundActive) this.sfx.play('moab');
    this.refreshMusic();
    this.ui.refresh();
  }

  _endRound() {
    this.roundActive = false;
    this.bossRoundActive = false;
    this.round += 1;
    this.cash += roundEndCash(this.round) + this.meta.getRoundCashBonus();
    this.sfx.play('cash');
    this.refreshMusic();

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

    this.saveRun();

    if (this.round === CAMPAIGN_ROUNDS) {
      this._finishRun('victory');
    }
    this.ui.refresh();
  }

  _finishRun(result) {
    this.state = result;
    this.sfx.play(result === 'victory' ? 'victory' : 'defeat');
    this.refreshMusic();
    this._bankPoints(result === 'victory' ? 150 : 0);
    // only record pops not already counted (victory -> freeplay defeat)
    const newPops = this.xpEarned - (this.popsRecorded || 0);
    this.popsRecorded = this.xpEarned;
    this.meta.recordRun({
      round: result === 'defeat' ? this.round + 1 : this.round,
      pops: Math.max(0, newPops),
      victory: result === 'victory',
    });
    if (result === 'victory') {
      this.saveRun(); // freeplay can continue later; records pointsBanked
      this.ui.showVictory();
    } else {
      this.clearRun(); // the run is over
      this.ui.showDefeat();
    }
  }

  continueFreeplay() {
    this.state = 'playing';
    this.ui.hideOverlays();
    this.refreshMusic();
  }

  _bankPoints(bonus = 0) {
    if (this.pointsBanked) return;
    this.pointsBanked = true;
    const mult = DIFFICULTIES[this.difficulty].pointsMult;
    this.earnedPoints = Math.floor((this.xpEarned / 10) * mult) + bonus;
    this.meta.addPoints(this.earnedPoints);
  }

  // ---------------------------------------------------- run persistence ----

  // Snapshot the run between rounds so closing the app doesn't lose it.
  saveRun() {
    try {
      localStorage.setItem(RUN_SAVE_KEY, JSON.stringify({
        mapId: this.selectedMapId,
        difficulty: this.difficulty,
        round: this.round,
        cash: this.cash,
        lives: this.lives,
        xpEarned: this.xpEarned,
        pointsBanked: this.pointsBanked,
        towers: this.towers.map((t) => ({
          typeId: t.typeId, x: t.x, y: t.y, tiers: t.tiers, targeting: t.targeting,
        })),
      }));
    } catch (e) { /* storage unavailable */ }
  }

  _maybeSaveRun() {
    if (this.state === 'playing' && !this.roundActive) this.saveRun();
  }

  clearRun() {
    try { localStorage.removeItem(RUN_SAVE_KEY); } catch (e) { /* ignore */ }
  }

  loadRunData() {
    try {
      const raw = localStorage.getItem(RUN_SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  resumeRun() {
    const data = this.loadRunData();
    if (!data) return false;
    this.state = 'menu'; // allow setMap/setDifficulty
    this.setDifficulty(data.difficulty);
    this.setMap(data.mapId);
    this._resetRun();
    this.round = data.round;
    this.cash = data.cash;
    this.lives = data.lives;
    this.xpEarned = data.xpEarned || 0;
    this.pointsBanked = !!data.pointsBanked;
    // post-victory resumes: those pops were already recorded in the stats
    this.popsRecorded = this.pointsBanked ? this.xpEarned : 0;
    for (const td of data.towers || []) {
      const tower = new Tower(td.typeId, td.x, td.y);
      tower.tiers = [...td.tiers];
      tower.targeting = td.targeting || 'First';
      // rebuild base-cost accounting for correct sell values
      tower.totalSpent = tower.def.cost;
      for (let p = 0; p < 3; p++) {
        for (let i = 0; i < tower.tiers[p]; i++) tower.totalSpent += tower.def.paths[p].tiers[i].cost;
      }
      tower.spawnT = 0;
      tower.recompute();
      this.towers.push(tower);
    }
    this._recomputeAuras();
    this.state = 'playing';
    this.ui.hideOverlays();
    this.ui.refreshShop();
    this.ui.refresh();
    this.ui.showTowerInfo(null);
    this.refreshMusic();
    return true;
  }

  toggleSpeed() {
    this.speedMult = this.speedMult === 1 ? 3 : 1;
    this.ui.refresh();
  }

  // ----------------------------------------------------------- input ----

  _bindInput() {
    // pointer events cover mouse and touch (finger drag updates the ghost)
    const trackPointer = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (CANVAS_W / r.width);
      this.mouse.y = (e.clientY - r.top) * (CANVAS_H / r.height);
    };
    this.canvas.addEventListener('pointermove', trackPointer);
    // a direct tap fires pointerdown+click without a prior move — update
    // the position first so the click lands where the finger did
    this.canvas.addEventListener('pointerdown', trackPointer);
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
      // ability hotkeys 1-8 (TOWER_ORDER)
      const digit = parseInt(e.key, 10);
      if (digit >= 1 && digit <= TOWER_ORDER.length) {
        this.activateAbility(TOWER_ORDER[digit - 1]);
      }
    });
  }

  _onClick() {
    if (this.state !== 'playing') return;
    const { x, y } = this.mouse;

    if (this.placingType) {
      if (this.canPlaceAt(x, y) && this.cash >= this.price(getTowerDef(this.placingType).cost)) {
        const def = getTowerDef(this.placingType);
        this.cash -= this.price(def.cost);
        const tower = new Tower(this.placingType, x, y);
        this.towers.push(tower);
        // dust puff timed to the landing of the drop-in animation
        this.effects.push({ type: 'dust', x, y: y + 16, delay: 0.3, life: 0.45, maxLife: 0.45 });
        this.sfx.play('place');
        this._recomputeAuras();
        this._maybeSaveRun();
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
    if (!tier || !tower.canBuyTier(pathIdx) || this.cash < this.price(tier.cost)) return;
    this.cash -= this.price(tier.cost);
    tower.buyTier(pathIdx);
    this.effects.push({ type: 'sparkle', x: tower.x, y: tower.y, life: 0.9, maxLife: 0.9 });
    this.sfx.play('upgrade');
    this._recomputeAuras();
    this._maybeSaveRun();
    this.ui.refresh();
    this.ui.showTowerInfo(tower);
  }

  sellTower(tower) {
    this.cash += this.price(tower.sellValue(SELL_RATIO));
    this.towers = this.towers.filter((t) => t.id !== tower.id);
    this._recomputeAuras();
    this._maybeSaveRun();
    this.selectTower(null);
    this.ui.refresh();
  }

  // -------------------------------------------------------- abilities ----

  canUseAbility(typeId) {
    const def = getTowerDef(typeId);
    if (!def || !def.ability) return false;
    if (this.state !== 'playing') return false;
    if ((this.abilityCds[typeId] || 0) > 0) return false;
    return this.towers.some((t) => t.typeId === typeId);
  }

  activateAbility(typeId) {
    if (!this.canUseAbility(typeId)) return false;
    const def = getTowerDef(typeId);
    this.abilityCds[typeId] = def.ability.cd;
    this.sfx.play('ability');

    switch (typeId) {
      case 'sahur': // all Sahurs attack 3x faster for 6s
        this.rateBuffs.push({ typeId: 'sahur', mult: 3, t: 6 });
        for (const t of this.towers) {
          if (t.typeId === 'sahur') this.effects.push({ type: 'sparkle', x: t.x, y: t.y, life: 0.9, maxLife: 0.9 });
        }
        break;
      case 'ballerina': // every Ballerina fires an instant 24-blade nova
        for (const t of this.towers) {
          if (t.typeId !== 'ballerina') continue;
          t.spinVel = 20;
          for (let i = 0; i < 24; i++) {
            const proj = new Projectile(t.x, t.y, (i / 24) * Math.PI * 2, t);
            proj.maxTravel = t.stats.range + 40;
            this.projectiles.push(proj);
          }
        }
        break;
      case 'bombardiro': { // 10 explosions carpet the track
        for (let i = 0; i < 10; i++) {
          const pos = this.path.getPos(Math.random() * this.path.total);
          const delay = i * 0.09;
          this.effects.push({ type: 'boom', x: pos.x, y: pos.y, radius: 70, delay, life: 0.35, maxLife: 0.35 });
          for (const b of this.bloons) {
            if (b.alive && dist(pos.x, pos.y, b.x, b.y) <= 70) {
              this._damageBloon(b, 40, 'explosion', 0);
            }
          }
        }
        this.sfx.play('boom');
        break;
      }
      case 'lirili': // freeze everything; MOAB-class heavily slowed
        for (const b of this.bloons) {
          if (!b.alive) continue;
          if (b.isMoab) b.applySlow(1.2, 2.5); // halved to 60% for MOAB-class
          else b.applyStun(2.5);
        }
        this.effects.push({ type: 'pulse', x: CANVAS_W / 2, y: CANVAS_H / 2, radius: CANVAS_W * 0.7, color: '#bfe3ff', life: 0.6, maxLife: 0.6 });
        break;
      case 'assassino': { // 80 damage to the strongest visible bloon
        let target = null;
        let best = -1;
        for (const b of this.bloons) {
          if (!b.alive) continue;
          const val = b.isMoab ? 1e6 + b.hp : rbe(b.typeId);
          if (val > best) { best = val; target = b; }
        }
        if (target) {
          this._damageBloon(target, 80, 'normal', 0);
          this.effects.push({ type: 'pop', x: target.x, y: target.y, radius: 18, color: '#6f4e37', life: 0.3, maxLife: 0.3 });
        }
        break;
      }
      case 'patapim': // all towers attack 50% faster for 8s
        this.rateBuffs.push({ typeId: null, mult: 1.5, t: 8 });
        for (const t of this.towers) {
          this.effects.push({ type: 'sparkle', x: t.x, y: t.y, life: 0.9, maxLife: 0.9 });
        }
        break;
      case 'bananini': { // instant cash
        this.cash += 250;
        const farm = this.towers.find((t) => t.typeId === 'bananini');
        this.effects.push({ type: 'cash', x: farm.x, y: farm.y - 24, text: '+$250', life: 1.2, maxLife: 1.2 });
        this.sfx.play('cash');
        break;
      }
      case 'tralalero': // 5 normal damage to every bloon on screen
        for (const b of [...this.bloons]) {
          if (b.alive) this._damageBloon(b, 5, 'normal', 0);
        }
        this.effects.push({ type: 'pulse', x: CANVAS_W / 2, y: CANVAS_H / 2, radius: CANVAS_W * 0.7, color: '#78c8ff', life: 0.6, maxLife: 0.6 });
        break;
      default:
        break;
    }
    return true;
  }

  // Attack-rate multiplier for a tower from active ability buffs.
  _rateMultFor(tower) {
    let mult = 1;
    for (const buf of this.rateBuffs) {
      if (buf.typeId === null || buf.typeId === tower.typeId) mult *= buf.mult;
    }
    return mult;
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

    // ability cooldowns + temporary rate buffs
    for (const key of Object.keys(this.abilityCds)) {
      if (this.abilityCds[key] > 0) this.abilityCds[key] -= dt;
    }
    for (const buf of this.rateBuffs) buf.t -= dt;
    this.rateBuffs = this.rateBuffs.filter((buf) => buf.t > 0);

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
        this.sfx.play('leak');
        if (this.lives <= 0) {
          this.lives = 0;
          this._finishRun('defeat');
          return;
        }
      }
    }
    this.bloons = this.bloons.filter((b) => b.alive && !b.escaped);

    this._updateBosses(dt);

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
      if (t.stunT > 0) t.stunT -= dt;
      if (t.spinVel > 0.05) {
        t.spin += t.spinVel * dt;
        t.spinVel *= Math.pow(0.1, dt); // exponential decay
      }
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

  // Boss special behaviors: spawner (Gusini), regen+rally (Trippi),
  // dash + tower stun (Vaca).
  _updateBosses(dt) {
    for (const b of this.bloons) {
      if (!b.alive || !b.def.isBoss) continue;

      if (b.def.bossKind === 'spawner') {
        while (b.nextSpawnHp > 0 && b.hp <= b.nextSpawnHp) {
          b.nextSpawnHp -= b.maxHp * 0.2;
          for (let i = 0; i < 6; i++) {
            this.bloons.push(new Bloon('ceramic', {
              distance: Math.max(0, b.distance - 20 - i * 18),
              hpMult: b.hpMult,
            }));
          }
          this.effects.push({ type: 'pulse', x: b.x, y: b.y, radius: 90, color: '#f0b040', life: 0.5, maxLife: 0.5 });
          this.sfx.play('rally');
        }
      } else if (b.def.bossKind === 'regen') {
        b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.01 * dt);
        b.pulseT -= dt;
        if (b.pulseT <= 0) {
          b.pulseT = 10;
          for (const e of this.bloons) {
            if (!e.alive || e.def.isBoss) continue;
            e.hasteT = 3;
            e.hasteMult = Math.max(e.hasteMult, 1.4);
          }
          this.effects.push({ type: 'pulse', x: b.x, y: b.y, radius: 180, color: '#ff8fb8', life: 0.6, maxLife: 0.6 });
          this.sfx.play('rally');
        }
      } else if (b.def.bossKind === 'vortex') {
        b.dashT -= dt;
        if (b.dashT <= 0) {
          b.dashT = 7;
          b.hasteT = 1.5;
          b.hasteMult = 2.5;
          let stunned = false;
          for (const t of this.towers) {
            if (dist(b.x, b.y, t.x, t.y) <= 160) {
              t.stunT = 2;
              stunned = true;
            }
          }
          this.effects.push({ type: 'pulse', x: b.x, y: b.y, radius: 160, color: '#b48aff', life: 0.6, maxLife: 0.6 });
          this.sfx.play('dash');
          if (stunned) this.sfx.play('towerStun');
        }
      }
    }
  }

  _updateTower(t, dt) {
    if (t.def.attack === 'none') return;
    if (t.stunT > 0) return; // stunned by a vortex boss
    t.cooldown -= dt * this._rateMultFor(t);
    if (t.cooldown > 0) return;

    if (t.def.attack === 'pulse') {
      const inRange = this.bloons.filter((b) => b.visibleTo(t.stats.camoDetect)
        && dist(t.x, t.y, b.x, b.y) <= t.stats.range);
      if (inRange.length === 0) return;
      t.cooldown = 1 / t.stats.rate;
      t.recoilT = 0.15;
      this.sfx.play('pulse');
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
      t.spinVel = 14; // Ballerina pirouette
      this.sfx.play('shoot');
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
    if (t.def.projStyle === 'bomb') this.sfx.play('shootBomb');
    else if (t.def.projStyle === 'plasma') this.sfx.play('shootPlasma');
    else this.sfx.play('shoot');

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
        this.sfx.play('boom');
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
    this.sfx.play(b.isMoab ? 'moabBoom' : 'pop');
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

    const boss = this.bloons.find((b) => b.alive && b.def.isBoss);
    if (boss) drawBossBar(ctx, boss);

    if (this.placingType && this.state === 'playing') {
      const def = getTowerDef(this.placingType);
      drawGhost(ctx, this.placingType, this.mouse.x, this.mouse.y, def.range, this.canPlaceAt(this.mouse.x, this.mouse.y));
    }
  }
}

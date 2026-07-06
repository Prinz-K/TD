import { uid, TARGETING_MODES } from '../constants.js';
import { BLOON_TYPES, BASE_SPEED } from '../data/bloons.js';
import { getTowerDef } from '../data/towers.js';

// ---------------------------------------------------------------- Bloon ----

export class Bloon {
  constructor(typeId, opts = {}) {
    this.id = uid('b');
    this.setType(typeId, opts.hpMult || 1);
    this.hpMult = opts.hpMult || 1;
    this.camo = !!opts.camo;
    this.regrow = !!opts.regrow;
    // lineage: chain of ancestor types this bloon popped out of, oldest
    // first — regrow climbs back up this chain.
    this.lineage = opts.lineage ? [...opts.lineage] : [];
    this.regrowTimer = 0;

    this.distance = opts.distance || 0;
    this.x = 0;
    this.y = 0;
    this.alive = true;
    this.escaped = false;

    this.slowPct = 0;
    this.slowTimer = 0;
    this.stunTimer = 0;
    this.hitT = 0; // white flash when damaged
    this.hasteT = 0; // boss rally / dash speed boost
    this.hasteMult = 1;

    // boss behavior state (see game._updateBosses)
    if (this.def.isBoss) {
      this.nextSpawnHp = this.maxHp * 0.8; // spawner threshold
      this.pulseT = 10;                    // regen rally timer
      this.dashT = 7;                      // vortex dash timer
    }
  }

  setType(typeId, hpMult = 1) {
    this.typeId = typeId;
    this.def = BLOON_TYPES[typeId];
    this.maxHp = Math.round(this.def.hp * (this.def.isMoab ? hpMult : 1));
    this.hp = this.maxHp;
  }

  get isMoab() { return !!this.def.isMoab; }

  update(dt, path) {
    if (!this.alive || this.escaped) return;

    if (this.hitT > 0) this.hitT -= dt;
    if (this.hasteT > 0) {
      this.hasteT -= dt;
      if (this.hasteT <= 0) this.hasteMult = 1;
    }
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowPct = 0;
    }
    if (this.regrow && this.lineage.length > 0) {
      this.regrowTimer += dt;
      if (this.regrowTimer >= 2.5) {
        this.regrowTimer = 0;
        const parentType = this.lineage.pop();
        this.setType(parentType, this.hpMult);
      }
    }
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      return;
    }

    const haste = this.hasteT > 0 ? this.hasteMult : 1;
    const speed = BASE_SPEED * this.def.speed * (1 - this.slowPct) * haste;
    this.distance += speed * dt;
    const pos = path.getPos(this.distance);
    this.x = pos.x;
    this.y = pos.y;
    if (pos.reachedEnd) this.escaped = true;
  }

  applySlow(pct, dur) {
    if (this.isMoab) pct *= 0.5; // MOAB-class resists slows
    if (pct >= this.slowPct) {
      this.slowPct = pct;
      this.slowTimer = Math.max(this.slowTimer, dur);
    }
  }

  applyStun(dur) {
    if (this.isMoab) return; // can't stun MOAB-class
    this.stunTimer = Math.max(this.stunTimer, dur);
  }

  // Returns actual damage dealt (0 if immune). Popping/children handled by Game.
  takeDamage(amount, damageType, moabBonus = 0) {
    if (this.def.immune.includes(damageType)) return 0;
    let dmg = amount;
    if (this.isMoab && moabBonus) dmg += moabBonus;
    const dealt = Math.min(this.hp, dmg);
    this.hp -= dmg;
    if (dealt > 0) this.hitT = 0.08;
    if (this.hp <= 0) this.alive = false;
    return dealt;
  }

  visibleTo(camoDetect) {
    return !this.camo || camoDetect;
  }
}

// ---------------------------------------------------------------- Tower ----

export class Tower {
  constructor(typeId, x, y) {
    this.id = uid('t');
    this.typeId = typeId;
    this.def = getTowerDef(typeId);
    this.x = x;
    this.y = y;
    this.tiers = [0, 0, 0]; // bought tiers per path
    this.totalSpent = this.def.cost;
    this.targeting = 'First';
    this.cooldown = 0;
    this.aimAngle = -Math.PI / 2;
    this.buffs = { rangeMult: 0, rateMult: 0, damageAdd: 0, camo: false };
    // animation state
    this.spawnT = 0.45;    // drop-in on placement
    this.recoilT = 0;      // kick-back when firing
    this.celebrateT = 0;   // bounce when upgraded
    this.animPhase = Math.random() * Math.PI * 2; // idle bob offset
    this.spin = 0;         // pirouette angle (Ballerina)
    this.spinVel = 0;
    this.stunT = 0;        // stunned by a vortex boss
    this.recompute();
  }

  // Merge base def + bought tier fx + aura buffs into this.stats.
  recompute() {
    const s = {
      range: this.def.range,
      rate: this.def.rate,
      damage: this.def.damage,
      pierce: this.def.pierce,
      projSpeed: this.def.projSpeed || 0,
      aoeRadius: this.def.aoeRadius || 0,
      moabBonus: 0,
      radialCount: this.def.radialCount || 0,
      multishot: 0,
      slowPct: this.def.slowPct || 0,
      slowDur: this.def.slowDur || 0,
      stun: 0,
      income: this.def.income || 0,
      interest: false,
      interestCap: 150,
      camoDetect: !!this.def.camoDetect,
      allyRangeMult: this.def.allyRangeMult || 0,
      allyRateMult: this.def.allyRateMult || 0,
      allyDamageAdd: 0,
      allyCamo: false,
      auraSlow: 0,
    };
    for (let p = 0; p < 3; p++) {
      for (let t = 0; t < this.tiers[p]; t++) {
        const fx = this.def.paths[p].tiers[t].fx;
        for (const key of Object.keys(fx)) {
          if (key === 'rateMult' || key === 'projSpeedMult') continue;
          if (typeof fx[key] === 'boolean') s[key] = s[key] || fx[key];
          else s[key] = (s[key] || 0) + fx[key];
        }
        if (fx.rateMult) s.rate *= fx.rateMult;
        if (fx.projSpeedMult) s.projSpeed *= fx.projSpeedMult;
      }
    }
    // aura buffs from Patapim(s)
    s.range *= (1 + this.buffs.rangeMult);
    s.rate *= (1 + this.buffs.rateMult);
    if (s.damage > 0) s.damage += this.buffs.damageAdd;
    s.camoDetect = s.camoDetect || this.buffs.camo;
    this.stats = s;
  }

  // BTD crosspath rule: max 2 paths invested, only one path past tier 2.
  canBuyTier(pathIdx) {
    const bought = this.tiers[pathIdx];
    if (bought >= 3) return false;
    const others = [0, 1, 2].filter((i) => i !== pathIdx);
    const investedOthers = others.filter((i) => this.tiers[i] > 0).length;
    if (bought === 0 && investedOthers >= 2) return false;
    if (bought + 1 === 3 && others.some((i) => this.tiers[i] >= 3)) return false;
    return true;
  }

  nextTier(pathIdx) {
    const t = this.tiers[pathIdx];
    return t < 3 ? this.def.paths[pathIdx].tiers[t] : null;
  }

  buyTier(pathIdx) {
    const tier = this.nextTier(pathIdx);
    if (!tier || !this.canBuyTier(pathIdx)) return null;
    this.tiers[pathIdx] += 1;
    this.totalSpent += tier.cost;
    this.celebrateT = 0.8;
    this.recompute();
    return tier;
  }

  sellValue(ratio) {
    return Math.round(this.totalSpent * ratio);
  }

  cycleTargeting() {
    const i = TARGETING_MODES.indexOf(this.targeting);
    this.targeting = TARGETING_MODES[(i + 1) % TARGETING_MODES.length];
  }
}

// ----------------------------------------------------------- Projectile ----

export class Projectile {
  constructor(x, y, angle, source) {
    this.id = uid('p');
    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;
    this.vx = Math.cos(angle) * source.stats.projSpeed;
    this.vy = Math.sin(angle) * source.stats.projSpeed;
    this.angle = angle;
    this.damage = source.stats.damage;
    this.pierce = source.stats.pierce;
    this.damageType = source.def.damageType;
    this.moabBonus = source.stats.moabBonus;
    this.aoeRadius = source.stats.aoeRadius;
    this.stun = source.stats.stun;
    this.slowPct = 0;
    this.slowDur = 0;
    this.camoDetect = source.stats.camoDetect;
    this.style = source.def.projStyle || 'blade';
    this.color = source.def.color;
    this.maxTravel = source.stats.range + 70;
    this.hitIds = new Set();
    this.alive = true;
    this.spin = 0;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.spin += dt * 20;
    const dx = this.x - this.startX;
    const dy = this.y - this.startY;
    if (dx * dx + dy * dy > this.maxTravel * this.maxTravel) this.alive = false;
  }
}

import { generateId } from '../constants.js';
import { getEnemyType } from './EnemyTypes.js';

// A single enemy walking along the path. Tracks status effects (stun/slow)
// and detection state for camo enemies.
export default class Enemy {
  constructor(typeId, scaleHp = 1, scaleReward = 1) {
    const def = getEnemyType(typeId);
    this.id = generateId('enemy');
    this.typeId = typeId;
    this.def = def;
    this.maxHp = def.hp * scaleHp;
    this.hp = this.maxHp;
    this.speed = def.speed;
    this.armor = def.armor;
    this.reward = Math.round(def.reward * scaleReward);
    this.color = def.color;
    this.radius = def.radius;
    this.isCamo = !!def.camo;
    this.isBoss = !!def.isBoss;
    this.splitsOnDeath = !!def.splitsOnDeath;

    this.distanceTraveled = 0;
    this.x = 0;
    this.y = 0;
    this.alive = true;
    this.reachedCore = false;

    this.statusEffects = []; // {type, duration, magnitude}
    this.detected = !this.isCamo; // non-camo are always "detected"
    this.detectedPermanently = false; // Purge sets this for rest of wave
  }

  isStunned() {
    return this.statusEffects.some((e) => e.type === 'stun');
  }

  getSlowMultiplier() {
    let mult = 1;
    for (const e of this.statusEffects) {
      if (e.type === 'slow') mult *= (1 - e.magnitude);
    }
    return Math.max(0.1, mult);
  }

  addStatus(type, duration, magnitude = 0) {
    this.statusEffects.push({ type, duration, magnitude });
  }

  updateStatusEffects(dt) {
    for (const e of this.statusEffects) e.duration -= dt;
    this.statusEffects = this.statusEffects.filter((e) => e.duration > 0);
  }

  // Detection check used by towers/hero; passive scan / purge handled by caller.
  isVisibleTo(detectionRadiusCheckFn) {
    if (!this.isCamo) return true;
    if (this.detectedPermanently) return true;
    if (detectionRadiusCheckFn && detectionRadiusCheckFn(this)) return true;
    return false;
  }

  takeDamage(amount, ignoreArmor = false, armorPierce = 0) {
    let effectiveArmor = ignoreArmor ? 0 : Math.max(0, this.armor - armorPierce);
    let dmg = Math.max(1, amount - effectiveArmor);
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.alive = false;
    }
    return dmg;
  }
}

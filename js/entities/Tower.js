import { generateId, tileCenter } from '../constants.js';
import { getTowerType } from './TowerTypes.js';
import UpgradeTree from './UpgradeTree.js';

// A placed tower instance. Holds base+upgrade derived stats, targeting mode,
// and buff state contributed by FirewallBeacons (recomputed by TowerManager).
export default class Tower {
  constructor(typeId, gridX, gridY) {
    this.id = generateId('tower');
    this.typeId = typeId;
    this.def = getTowerType(typeId);
    this.gridX = gridX;
    this.gridY = gridY;
    const center = tileCenter(gridX, gridY);
    this.x = center.x;
    this.y = center.y;

    this.upgrades = new UpgradeTree(this.def);
    this.totalSpent = this.def.cost;
    this.targetingMode = 'First'; // First | Last | Strongest | Closest
    this.cooldown = 0;
    this.shieldHp = 0; // from FirewallBeacon Path B T1

    // Buff state applied externally by TowerManager each recompute.
    this.buffDamagePct = 0;
    this.buffAtkSpeedPct = 0;

    this.recomputeStats();
  }

  recomputeStats() {
    const a = this.upgrades.getAggregatedEffects('A');
    const b = this.upgrades.getAggregatedEffects('B');

    let damage = this.def.baseDamage + (a.dmgBonus || 0);
    if (a.dmgMultiplier) damage *= a.dmgMultiplier;

    let attackSpeed = this.def.baseAttackSpeed + (b.atkSpeedBonus || 0);
    let range = this.def.baseRange + (b.rangeBonus || 0) + (a.rangeBonus || 0);

    // Apply FirewallBeacon buffs (additive percentages set externally).
    damage *= (1 + this.buffDamagePct);
    attackSpeed *= (1 + this.buffAtkSpeedPct);

    this.damage = damage;
    this.attackSpeed = attackSpeed;
    this.range = range;

    if (this.def.type === 'chain') {
      this.chains = this.def.baseChains + (a.chainBonus || 0);
      this.chainFalloff = a.chainFalloff || 1.0; // default: flat 100% per spec note
      this.stun = a.stun || 0;
      this.burstDamage = b.burstDamage || 0;
      this.burstRadius = b.burstRadius || 0;
    }

    if (this.def.type === 'single') {
      this.armorPierce = a.armorPierce || 0;
      this.fullArmorIgnore = !!a.fullArmorIgnore;
      this.slowPct = b.slowPct || 0;
      this.slowDuration = b.slowDuration || 0;
      this.shockwaveRadius = b.shockwaveRadius || 0;
      this.shockwaveDamage = b.shockwaveDamage || 0;
    }

    if (this.def.type === 'support') {
      const allBuffMult = a.allBuffMultiplier || 1;
      this.outDamageBuffPct = (this.def.buffDamagePct + (a.extraDmgBuffPct || 0)) * allBuffMult;
      this.outAtkSpeedBuffPct = (this.def.buffAtkSpeedPct + (a.extraAtkSpeedBuffPct || 0)) * allBuffMult;
      this.enemySlowPct = a.enemySlowPct || 0;
      this.shieldBonus = b.shieldBonus || 0;
      this.killBonusCpu = b.killBonusCpu || 0;
    }
  }

  cycleTargetingMode() {
    const modes = ['First', 'Last', 'Strongest', 'Closest'];
    const idx = modes.indexOf(this.targetingMode);
    this.targetingMode = modes[(idx + 1) % modes.length];
  }

  getSellValue() {
    return Math.round(this.totalSpent * 0.75);
  }

  trySpendUpgrade(path, cpuAvailable) {
    if (!this.upgrades.canUpgrade(path)) return { success: false, reason: 'blocked' };
    const tierDef = this.upgrades.getNextTierDef(path);
    if (!tierDef) return { success: false, reason: 'maxed' };
    if (cpuAvailable < tierDef.cost) return { success: false, reason: 'cpu' };
    this.upgrades.applyUpgrade(path);
    this.totalSpent += tierDef.cost;
    this.recomputeStats();
    return { success: true, cost: tierDef.cost };
  }
}

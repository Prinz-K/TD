// Static data definitions for the three tower types and their upgrade trees.
// Upgrade cost/effects per path/tier. Effects are applied additively on top
// of base stats by Tower.js's recomputeStats().

export const TOWER_TYPES = {
  PulseEmitter: {
    id: 'PulseEmitter',
    name: 'Pulse Emitter',
    color: '#00ffff',
    cost: 150,
    baseDamage: 30,
    baseAttackSpeed: 1.8, // attacks per second
    baseRange: 140,
    chainRange: 120,
    baseChains: 3, // max enemies hit (chain lightning)
    type: 'chain',
    pathA: {
      name: 'Overcharge',
      tiers: [
        { cost: 100, label: '+1 chain, +10 dmg', chainBonus: 1, dmgBonus: 10 },
        { cost: 200, label: '+2 chains, stun 0.3s', chainBonus: 2, stun: 0.3 },
        { cost: 400, label: '+4 chains, 85% dmg/jump', chainBonus: 4, chainFalloff: 0.85 },
      ],
    },
    pathB: {
      name: 'Wide Net',
      tiers: [
        { cost: 100, label: '+40 range, +0.3 atk/s', rangeBonus: 40, atkSpeedBonus: 0.3 },
        { cost: 200, label: 'AoE burst on final target', burstDamage: 60, burstRadius: 80 },
      ],
    },
  },
  CompilerCannon: {
    id: 'CompilerCannon',
    name: 'Compiler Cannon',
    color: '#ff6600',
    cost: 200,
    baseDamage: 120,
    baseAttackSpeed: 0.5,
    baseRange: 180,
    type: 'single',
    pathA: {
      name: 'Armor Breaker',
      tiers: [
        { cost: 125, label: '+40 dmg, armor pierce +20', dmgBonus: 40, armorPierce: 20 },
        { cost: 250, label: '+80 dmg, +40 pierce', dmgBonus: 80, armorPierce: 40 },
        { cost: 500, label: 'x2.5 dmg, full armor ignore', dmgMultiplier: 2.5, fullArmorIgnore: true },
      ],
    },
    pathB: {
      name: 'Disruptor',
      tiers: [
        { cost: 125, label: '+50 range, slow 30%/1.5s', rangeBonus: 50, slowPct: 0.3, slowDuration: 1.5 },
        { cost: 250, label: 'shockwave on kill', shockwaveRadius: 100, shockwaveDamage: 50 },
      ],
    },
  },
  FirewallBeacon: {
    id: 'FirewallBeacon',
    name: 'Firewall Beacon',
    color: '#00ff88',
    cost: 175,
    baseDamage: 0,
    baseAttackSpeed: 0,
    baseRange: 180,
    type: 'support',
    buffDamagePct: 0.20,
    buffAtkSpeedPct: 0.15,
    pathA: {
      name: 'Amplifier',
      tiers: [
        { cost: 100, label: '+60 buff range, +10% dmg buff', rangeBonus: 60, extraDmgBuffPct: 0.10 },
        { cost: 200, label: '+15% dmg buff, +20% fire rate buff', extraDmgBuffPct: 0.15, extraAtkSpeedBuffPct: 0.20 },
        { cost: 400, label: 'x2 all buffs, slow enemies 15%', allBuffMultiplier: 2, enemySlowPct: 0.15 },
      ],
    },
    pathB: {
      name: 'Hardening',
      tiers: [
        { cost: 100, label: '+10 shield HP to nearby towers', shieldBonus: 10 },
        { cost: 200, label: 'on tower kill: +50 CPU bonus', killBonusCpu: 50 },
      ],
    },
  },
};

export function getTowerType(typeId) {
  return TOWER_TYPES[typeId];
}

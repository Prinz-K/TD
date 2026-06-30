// Static data definitions for the three tower types (Brainrot characters) and
// their upgrade trees. Internal IDs are kept stable (PulseEmitter /
// CompilerCannon / FirewallBeacon) so all systems keep working; only the
// display name/color/labels are themed. Upgrade cost/effects per path/tier are
// applied additively on top of base stats by Tower.js's recomputeStats().

export const TOWER_TYPES = {
  // Tung Tung Tung Sahur — the wooden bat creature that hammers fast,
  // rapid multi-hits = chain attacker.
  PulseEmitter: {
    id: 'PulseEmitter',
    name: 'Tung Tung Tung Sahur',
    color: '#a9743b',
    cost: 150,
    baseDamage: 30,
    baseAttackSpeed: 1.8, // attacks per second
    baseRange: 140,
    chainRange: 120,
    baseChains: 3, // max enemies hit (bonk chain)
    type: 'chain',
    pathA: {
      name: 'Tung Frenzy',
      tiers: [
        { cost: 100, label: '+1 bonk, +10 dmg', chainBonus: 1, dmgBonus: 10 },
        { cost: 200, label: '+2 bonks, stun 0.3s', chainBonus: 2, stun: 0.3 },
        { cost: 400, label: '+4 bonks, 85% dmg/jump', chainBonus: 4, chainFalloff: 0.85 },
      ],
    },
    pathB: {
      name: 'Echo Boom',
      tiers: [
        { cost: 100, label: '+40 range, +0.3 atk/s', rangeBonus: 40, atkSpeedBonus: 0.3 },
        { cost: 200, label: 'AoE boom on final target', burstDamage: 60, burstRadius: 80 },
      ],
    },
  },
  // Bombardiro Crocodilo — the crocodile-bomber. Slow, heavy single bombs that
  // punch through armor.
  CompilerCannon: {
    id: 'CompilerCannon',
    name: 'Bombardiro Crocodilo',
    color: '#4a7c2f',
    cost: 200,
    baseDamage: 120,
    baseAttackSpeed: 0.5,
    baseRange: 180,
    type: 'single',
    pathA: {
      name: 'Bombardamento',
      tiers: [
        { cost: 125, label: '+40 dmg, armor pierce +20', dmgBonus: 40, armorPierce: 20 },
        { cost: 250, label: '+80 dmg, +40 pierce', dmgBonus: 80, armorPierce: 40 },
        { cost: 500, label: 'x2.5 dmg, full armor ignore', dmgMultiplier: 2.5, fullArmorIgnore: true },
      ],
    },
    pathB: {
      name: 'Croco Shock',
      tiers: [
        { cost: 125, label: '+50 range, slow 30%/1.5s', rangeBonus: 50, slowPct: 0.3, slowDuration: 1.5 },
        { cost: 250, label: 'shockwave on kill', shockwaveRadius: 100, shockwaveDamage: 50 },
      ],
    },
  },
  // Brr Brr Patapim — the rooted forest creature. Doesn't attack; buffs and
  // shields nearby allies = support.
  FirewallBeacon: {
    id: 'FirewallBeacon',
    name: 'Brr Brr Patapim',
    color: '#3fa34d',
    cost: 175,
    baseDamage: 0,
    baseAttackSpeed: 0,
    baseRange: 180,
    type: 'support',
    buffDamagePct: 0.20,
    buffAtkSpeedPct: 0.15,
    pathA: {
      name: 'Patapim Aura',
      tiers: [
        { cost: 100, label: '+60 buff range, +10% dmg buff', rangeBonus: 60, extraDmgBuffPct: 0.10 },
        { cost: 200, label: '+15% dmg buff, +20% fire rate buff', extraDmgBuffPct: 0.15, extraAtkSpeedBuffPct: 0.20 },
        { cost: 400, label: 'x2 all buffs, slow enemies 15%', allBuffMultiplier: 2, enemySlowPct: 0.15 },
      ],
    },
    pathB: {
      name: 'Root Guard',
      tiers: [
        { cost: 100, label: '+10 shield HP to nearby allies', shieldBonus: 10 },
        { cost: 200, label: 'on ally kill: +50 Lira bonus', killBonusCpu: 50 },
      ],
    },
  },
};

export function getTowerType(typeId) {
  return TOWER_TYPES[typeId];
}

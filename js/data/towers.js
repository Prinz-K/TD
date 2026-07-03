// The Brainrot roster — each character maps onto a classic Bloons TD tower
// role and has three upgrade paths with the BTD crosspathing rule (invest in
// at most two paths; only one path may reach tier 3).
//
// Tier fx fields (all optional, applied on top of base stats):
//   damage, pierce, range, aoeRadius, moabBonus, radialCount, slowPct,
//   slowDur, stun, income  -> additive
//   rateMult, projSpeedMult -> multiplicative
//   camoDetect, interest    -> flags
//   allyRangeMult, allyRateMult, allyDamageAdd, allyCamo, auraSlow -> aura

export const TOWER_ORDER = [
  'sahur', 'ballerina', 'bombardiro', 'lirili',
  'assassino', 'patapim', 'bananini', 'tralalero',
];

export const TOWERS = {
  // Dart Monkey role: cheap, reliable starter.
  sahur: {
    id: 'sahur', name: 'Tung Tung Tung Sahur', cost: 200, unlockCost: 0,
    color: '#a9743b', desc: 'Bonks bloons with his trusty bat. Tung tung tung!',
    attack: 'projectile', projStyle: 'bat', damageType: 'sharp',
    range: 130, rate: 0.95, damage: 1, pierce: 2, projSpeed: 520,
    paths: [
      { name: 'Bonk Power', tiers: [
        { cost: 120, label: 'Harder Bonks: +2 pierce', fx: { pierce: 2 } },
        { cost: 300, label: 'Heavy Bat: +1 damage', fx: { damage: 1 } },
        { cost: 1400, label: 'MEGA BONK: +3 dmg, +4 pierce, +6 MOAB dmg', fx: { damage: 3, pierce: 4, moabBonus: 6 } },
      ] },
      { name: 'Tung Tempo', tiers: [
        { cost: 150, label: 'Quick Tung: +40% attack speed', fx: { rateMult: 1.4 } },
        { cost: 350, label: 'Double Tung: +50% attack speed', fx: { rateMult: 1.5 } },
        { cost: 1200, label: 'TUNGTUNGTUNG: attack speed x2', fx: { rateMult: 2 } },
      ] },
      { name: 'Night Watch', tiers: [
        { cost: 90, label: 'Sharp Eyes: +25 range', fx: { range: 25 } },
        { cost: 220, label: 'Sahur Vision: +30 range, camo detection', fx: { range: 30, camoDetect: true } },
        { cost: 700, label: 'All-Seeing: +40 range, +3 pierce', fx: { range: 40, pierce: 3 } },
      ] },
    ],
  },

  // Tack Shooter role: short range, shoots in all directions.
  ballerina: {
    id: 'ballerina', name: 'Ballerina Cappuccina', cost: 280, unlockCost: 0,
    color: '#f58fb8', desc: 'Spins gracefully, flinging coffee blades in all directions.',
    attack: 'radial', projStyle: 'blade', damageType: 'sharp',
    range: 95, rate: 1.1, damage: 1, pierce: 1, projSpeed: 420, radialCount: 8,
    paths: [
      { name: 'More Blades', tiers: [
        { cost: 130, label: 'Extra Blades: +4 blades', fx: { radialCount: 4 } },
        { cost: 320, label: 'Blade Storm: +4 blades, +1 pierce', fx: { radialCount: 4, pierce: 1 } },
        { cost: 1500, label: 'Prima Ballerina: +8 blades, +1 damage', fx: { radialCount: 8, damage: 1 } },
      ] },
      { name: 'Faster Spins', tiers: [
        { cost: 140, label: 'Quick Pirouette: +35% attack speed', fx: { rateMult: 1.35 } },
        { cost: 330, label: 'Grand Jete: +45% attack speed', fx: { rateMult: 1.45 } },
        { cost: 1300, label: 'Espresso Overdrive: attack speed x1.9', fx: { rateMult: 1.9 } },
      ] },
      { name: 'Wide Stage', tiers: [
        { cost: 100, label: 'Bigger Stage: +18 range', fx: { range: 18 } },
        { cost: 240, label: 'Flying Blades: +20 range, +1 pierce', fx: { range: 20, pierce: 1 } },
        { cost: 800, label: 'World Tour: +30 range, +2 pierce', fx: { range: 30, pierce: 2 } },
      ] },
    ],
  },

  // Bomb Shooter role: explosions pop leads, but not blacks.
  bombardiro: {
    id: 'bombardiro', name: 'Bombardiro Crocodilo', cost: 525, unlockCost: 0,
    color: '#4a7c2f', desc: 'Aerial crocodile bomber. Explosions pop Lead bloons!',
    attack: 'projectile', projStyle: 'bomb', damageType: 'explosion',
    range: 150, rate: 0.65, damage: 1, pierce: 20, projSpeed: 380, aoeRadius: 55,
    paths: [
      { name: 'Bigger Bombs', tiers: [
        { cost: 250, label: 'Bigger Bombs: +18 blast radius', fx: { aoeRadius: 18 } },
        { cost: 500, label: 'Heavy Bombs: +1 damage, +12 radius', fx: { damage: 1, aoeRadius: 12 } },
        { cost: 1800, label: 'BOMBARDAMENTO: +2 dmg, +30 radius, +8 MOAB dmg', fx: { damage: 2, aoeRadius: 30, moabBonus: 8 } },
      ] },
      { name: 'Rapid Reload', tiers: [
        { cost: 220, label: 'Faster Reload: +33% attack speed', fx: { rateMult: 1.33 } },
        { cost: 480, label: 'Croc Barrage: +45% attack speed', fx: { rateMult: 1.45 } },
        { cost: 1600, label: 'Carpet Bombing: attack speed x1.8', fx: { rateMult: 1.8 } },
      ] },
      { name: 'Shock & Awe', tiers: [
        { cost: 200, label: 'Long Bombs: +25 range', fx: { range: 25 } },
        { cost: 550, label: 'Concussion: stuns bloons 0.5s', fx: { stun: 0.5 } },
        { cost: 1500, label: 'Croc Shock: stun 1s, +4 MOAB dmg', fx: { stun: 0.5, moabBonus: 4 } },
      ] },
    ],
  },

  // Ice Monkey role: the elephant with a clock — slows time for bloons.
  lirili: {
    id: 'lirili', name: 'Lirili Larila', cost: 500, unlockCost: 120,
    color: '#9aa8b8', desc: 'Cactus-elephant with a ticking clock. Slows everything nearby.',
    attack: 'pulse', damageType: 'cold',
    range: 100, rate: 0.65, damage: 1, pierce: 999, slowPct: 0.4, slowDur: 2,
    paths: [
      { name: 'Deep Chill', tiers: [
        { cost: 180, label: 'Colder: slow 55%', fx: { slowPct: 0.15 } },
        { cost: 400, label: 'Arctic Tick: slow 70%', fx: { slowPct: 0.15 } },
        { cost: 1400, label: 'Time Stop: freezes bloons 1.2s', fx: { stun: 1.2 } },
      ] },
      { name: 'Wide Clock', tiers: [
        { cost: 150, label: 'Bigger Clock: +22 radius', fx: { range: 22 } },
        { cost: 350, label: 'Grand Clock: +28 radius', fx: { range: 28 } },
        { cost: 1100, label: 'Clock Tower: +40 radius, faster ticks', fx: { range: 40, rateMult: 1.5 } },
      ] },
      { name: 'Sharp Hands', tiers: [
        { cost: 200, label: 'Frost Bite: +1 damage', fx: { damage: 1 } },
        { cost: 450, label: 'Shatter: +2 damage', fx: { damage: 2 } },
        { cost: 1600, label: 'Tempus Fugit: +3 dmg, +10 MOAB dmg', fx: { damage: 3, moabBonus: 10 } },
      ] },
    ],
  },

  // Ninja Monkey role: fast, sees camo out of the box.
  assassino: {
    id: 'assassino', name: 'Cappuccino Assassino', cost: 450, unlockCost: 200,
    color: '#6f4e37', desc: 'Silent coffee killer. Fast attacks and camo detection.',
    attack: 'projectile', projStyle: 'shuriken', damageType: 'sharp',
    range: 140, rate: 1.5, damage: 1, pierce: 2, projSpeed: 620, camoDetect: true,
    paths: [
      { name: 'Multi Throw', tiers: [
        { cost: 250, label: 'Twin Beans: throws 2 shurikens', fx: { multishot: 1 } },
        { cost: 550, label: 'Triple Shot: throws 3 shurikens', fx: { multishot: 1 } },
        { cost: 1700, label: 'Bean Barrage: throws 5, +1 pierce', fx: { multishot: 2, pierce: 1 } },
      ] },
      { name: 'Caffeine Rush', tiers: [
        { cost: 220, label: 'Espresso Shot: +35% attack speed', fx: { rateMult: 1.35 } },
        { cost: 500, label: 'Double Shot: +50% attack speed', fx: { rateMult: 1.5 } },
        { cost: 1500, label: 'Ristretto Rage: attack speed x1.9', fx: { rateMult: 1.9 } },
      ] },
      { name: 'True Assassin', tiers: [
        { cost: 300, label: 'Sharp Beans: +1 damage', fx: { damage: 1 } },
        { cost: 700, label: 'Lethal Brew: +1 dmg, +2 pierce', fx: { damage: 1, pierce: 2 } },
        { cost: 2200, label: 'CONTRACT KILL: +2 dmg, +12 MOAB dmg', fx: { damage: 2, moabBonus: 12 } },
      ] },
    ],
  },

  // Monkey Village role: buffs all towers in its aura.
  patapim: {
    id: 'patapim', name: 'Brr Brr Patapim', cost: 800, unlockCost: 320,
    color: '#3fa34d', desc: 'Forest spirit. Buffs all Brainrots in his grove.',
    attack: 'none', damageType: 'normal',
    range: 120, rate: 0, damage: 0, pierce: 0,
    allyRangeMult: 0.1, allyRateMult: 0,
    paths: [
      { name: 'Growing Grove', tiers: [
        { cost: 250, label: 'Fertile Soil: allies +15% range', fx: { allyRangeMult: 0.15 } },
        { cost: 500, label: 'Deep Roots: allies +1 damage', fx: { allyDamageAdd: 1 } },
        { cost: 2000, label: 'Ancient Forest: allies +1 dmg, +15% range', fx: { allyDamageAdd: 1, allyRangeMult: 0.15 } },
      ] },
      { name: 'War Drums', tiers: [
        { cost: 300, label: 'Pata Rhythm: allies +12% attack speed', fx: { allyRateMult: 0.12 } },
        { cost: 650, label: 'Pim Beat: allies +18% attack speed', fx: { allyRateMult: 0.18 } },
        { cost: 2200, label: 'BRR BRR ANTHEM: allies +25% attack speed', fx: { allyRateMult: 0.25 } },
      ] },
      { name: 'Jungle Eyes', tiers: [
        { cost: 220, label: 'Watchful Canopy: allies get camo detection', fx: { allyCamo: true } },
        { cost: 450, label: 'Sticky Vines: bloons in grove 15% slower', fx: { auraSlow: 0.15 } },
        { cost: 1400, label: 'Grasping Roots: bloons 30% slower, +20 aura', fx: { auraSlow: 0.15, range: 20 } },
      ] },
    ],
  },

  // Banana Farm role: generates cash each round.
  bananini: {
    id: 'bananini', name: 'Chimpanzini Bananini', cost: 1050, unlockCost: 450,
    color: '#f2c744', desc: 'Banana-monkey hybrid. Grows cash every round.',
    attack: 'none', damageType: 'normal',
    range: 60, rate: 0, damage: 0, pierce: 0, income: 80,
    paths: [
      { name: 'More Bananas', tiers: [
        { cost: 500, label: 'Bigger Bunch: +$60 per round', fx: { income: 60 } },
        { cost: 1000, label: 'Banana Grove: +$110 per round', fx: { income: 110 } },
        { cost: 2800, label: 'BANANINI EMPIRE: +$300 per round', fx: { income: 300 } },
      ] },
      { name: 'Ripe Value', tiers: [
        { cost: 400, label: 'Sweet Ripening: +$45 per round', fx: { income: 45 } },
        { cost: 900, label: 'Golden Bananas: +$90 per round', fx: { income: 90 } },
        { cost: 2400, label: 'Midas Peel: +$220 per round', fx: { income: 220 } },
      ] },
      { name: 'Monkey Bank', tiers: [
        { cost: 600, label: 'Piggy Bank: +5% interest each round (max $150)', fx: { interest: true } },
        { cost: 1200, label: 'Vault: +$70 per round', fx: { income: 70 } },
        { cost: 2000, label: 'Hedge Fund: interest cap $400', fx: { interestCap: 250 } },
      ] },
    ],
  },

  // Super Monkey role: the shark with Nikes. Expensive, melts everything.
  tralalero: {
    id: 'tralalero', name: 'Tralalero Tralala', cost: 2500, unlockCost: 800,
    color: '#4a90c2', desc: 'Legendary three-legged shark in Nikes. Hypersonic attacks.',
    attack: 'projectile', projStyle: 'plasma', damageType: 'normal',
    range: 175, rate: 5.5, damage: 1, pierce: 1, projSpeed: 900,
    paths: [
      { name: 'Plasma Waves', tiers: [
        { cost: 1500, label: 'Plasma Chomp: +1 damage', fx: { damage: 1 } },
        { cost: 3000, label: 'Tsunami Beam: +1 dmg, +1 pierce', fx: { damage: 1, pierce: 1 } },
        { cost: 8000, label: 'TRALALA GOD: +3 damage, +2 pierce', fx: { damage: 3, pierce: 2 } },
      ] },
      { name: 'Epic Range', tiers: [
        { cost: 900, label: 'Ocean Sight: +30 range, camo detection', fx: { range: 30, camoDetect: true } },
        { cost: 1800, label: 'Deep Vision: +40 range, +20% speed', fx: { range: 40, rateMult: 1.2 } },
        { cost: 5000, label: 'Everywhere Shark: +60 range, x1.5 speed', fx: { range: 60, rateMult: 1.5 } },
      ] },
      { name: 'Shark Missiles', tiers: [
        { cost: 1200, label: 'Nike Kick: +4 MOAB dmg', fx: { moabBonus: 4 } },
        { cost: 2600, label: 'Torpedo Fins: +8 MOAB dmg', fx: { moabBonus: 8 } },
        { cost: 7000, label: 'MOAB EXECUTIONER: +20 MOAB dmg', fx: { moabBonus: 20 } },
      ] },
    ],
  },
};

export function getTowerDef(id) {
  return TOWERS[id];
}

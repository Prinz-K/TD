// Bloon archetypes, Bloons-TD style: popping a layer spawns its children.
// speed is a multiplier on BASE_SPEED (red = 1, like BTD).
// Immunities by damage type: 'sharp' (lead blocks), 'explosion' (black
// blocks), 'cold' (white blocks). 'normal' damage pops everything.

export const BASE_SPEED = 70; // px/s for a red bloon

export const BLOON_TYPES = {
  red: {
    name: 'Red', hp: 1, speed: 1.0, radius: 11, color: '#e64a4a',
    children: [], immune: [],
  },
  blue: {
    name: 'Blue', hp: 1, speed: 1.4, radius: 12, color: '#4a7ee6',
    children: ['red'], immune: [],
  },
  green: {
    name: 'Green', hp: 1, speed: 1.8, radius: 12, color: '#4db34d',
    children: ['blue'], immune: [],
  },
  yellow: {
    name: 'Yellow', hp: 1, speed: 3.2, radius: 13, color: '#f2c744',
    children: ['green'], immune: [],
  },
  pink: {
    name: 'Pink', hp: 1, speed: 3.5, radius: 13, color: '#f58fb8',
    children: ['yellow'], immune: [],
  },
  black: {
    name: 'Black', hp: 1, speed: 1.8, radius: 10, color: '#3a3a44',
    children: ['pink', 'pink'], immune: ['explosion'],
  },
  white: {
    name: 'White', hp: 1, speed: 2.0, radius: 10, color: '#f2f2ee',
    children: ['pink', 'pink'], immune: ['cold'],
  },
  lead: {
    name: 'Lead', hp: 1, speed: 1.0, radius: 13, color: '#8a8f9c',
    children: ['black', 'black'], immune: ['sharp'],
  },
  zebra: {
    name: 'Zebra', hp: 1, speed: 1.8, radius: 13, color: '#d9d9d9',
    children: ['black', 'white'], immune: [], striped: true,
  },
  rainbow: {
    name: 'Rainbow', hp: 1, speed: 2.2, radius: 14, color: '#c77dff',
    children: ['zebra', 'zebra'], immune: [], rainbow: true,
  },
  ceramic: {
    name: 'Ceramic', hp: 10, speed: 2.5, radius: 15, color: '#b5651d',
    children: ['rainbow', 'rainbow'], immune: [],
  },
  moab: {
    name: 'MOAB', hp: 200, speed: 1.0, radius: 34, color: '#5b7ea8',
    children: ['ceramic', 'ceramic', 'ceramic', 'ceramic'], immune: [], isMoab: true,
  },
  bfb: {
    name: 'BFB', hp: 700, speed: 0.6, radius: 44, color: '#b04a4a',
    children: ['moab', 'moab', 'moab', 'moab'], immune: [], isMoab: true,
  },

  // ---- Bosses (blimp-class with special behaviors, see game._updateBosses) --
  // Spawner goose: releases ceramics every 20% HP lost.
  boss_gusini: {
    name: 'Bombombini Gusini', hp: 350, speed: 0.9, radius: 38, color: '#e8e4da',
    children: ['ceramic', 'ceramic'], immune: [], isMoab: true, isBoss: true, bossKind: 'spawner',
  },
  // Regenerating shrimp-cat: heals itself and rallies bloons around it.
  boss_trippi: {
    name: 'Trippi Troppi', hp: 900, speed: 0.75, radius: 40, color: '#e88aa0',
    children: ['ceramic', 'ceramic'], immune: [], isMoab: true, isBoss: true, bossKind: 'regen',
  },
  // Saturn cow: dashes forward and stuns nearby towers with its ring.
  boss_vaca: {
    name: 'Vaca Saturno Saturnita', hp: 1800, speed: 0.65, radius: 44, color: '#8a6fc2',
    children: ['ceramic', 'ceramic', 'ceramic', 'ceramic'], immune: [], isMoab: true, isBoss: true, bossKind: 'vortex',
  },
};

const rbeCache = {};
// Red Bloon Equivalent: total pops in this bloon (own hp + all children).
export function rbe(typeId) {
  if (rbeCache[typeId] !== undefined) return rbeCache[typeId];
  const def = BLOON_TYPES[typeId];
  let total = def.hp;
  for (const child of def.children) total += rbe(child);
  rbeCache[typeId] = total;
  return total;
}

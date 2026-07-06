// The 40-round campaign, BTD-style pacing: greens r5, yellows r8, pinks r11,
// blacks/whites mid-teens, leads r17, zebras r20, first camo r24, rainbows
// r25, ceramics r30, MOAB r40. After round 40: generated freeplay.
//
// Each round is an array of groups:
//   { t: bloonType, n: count, sp: seconds between spawns,
//     delay: seconds before group starts, camo?, regrow?, hpMult? }

function g(t, n, sp, delay = 0, opts = {}) {
  return { t, n, sp, delay, ...opts };
}

export const ROUNDS = [
  /* 1 */ [g('red', 20, 0.9)],
  /* 2 */ [g('red', 30, 0.7)],
  /* 3 */ [g('red', 22, 0.6), g('blue', 5, 0.9, 8)],
  /* 4 */ [g('red', 30, 0.5), g('blue', 15, 0.65, 4)],
  /* 5 */ [g('blue', 25, 0.55), g('green', 5, 0.9, 10)],
  /* 6 */ [g('blue', 15, 0.5), g('green', 15, 0.7, 5)],
  /* 7 */ [g('red', 20, 0.35), g('green', 22, 0.5, 4)],
  /* 8 */ [g('green', 20, 0.5), g('yellow', 10, 0.8, 8)],
  /* 9 */ [g('green', 30, 0.4), g('yellow', 10, 0.5, 8)],
  /* 10 */ [g('blue', 40, 0.25), g('yellow', 20, 0.45, 5)],
  /* 11 */ [g('yellow', 20, 0.45), g('pink', 10, 0.7, 7)],
  /* 12 */ [g('green', 25, 0.35), g('yellow', 15, 0.4, 4), g('pink', 8, 0.6, 9)],
  /* 13 */ [g('green', 50, 0.3), g('pink', 15, 0.5, 6)],
  /* 14 */ [g('yellow', 30, 0.35), g('black', 10, 0.8, 8)],
  /* 15 */ [g('pink', 20, 0.4), g('white', 10, 0.8, 6)],
  /* 16 */ [g('black', 15, 0.6), g('white', 15, 0.6, 3)],
  /* 17 */ [g('yellow', 20, 0.35), g('lead', 8, 1.1, 6)],
  /* 18 */ [g('pink', 30, 0.35), g('black', 12, 0.5, 5), g('white', 12, 0.5, 8)],
  /* 19 */ [g('black', 20, 0.45), g('white', 20, 0.45, 2), g('pink', 15, 0.3, 10)],
  /* 20 */ [g('zebra', 15, 0.65), g('boss_gusini', 1, 1, 12)],
  /* 21 */ [g('lead', 12, 0.8), g('zebra', 10, 0.6, 5)],
  /* 22 */ [g('black', 25, 0.3), g('white', 25, 0.3, 2)],
  /* 23 */ [g('zebra', 20, 0.45), g('lead', 8, 0.9, 6)],
  /* 24 */ [g('green', 15, 0.5, 0, { camo: true }), g('yellow', 20, 0.35, 6)],
  /* 25 */ [g('rainbow', 15, 0.65), g('yellow', 20, 0.3, 4)],
  /* 26 */ [g('yellow', 20, 0.4, 0, { camo: true }), g('zebra', 15, 0.5, 5)],
  /* 27 */ [g('green', 60, 0.15), g('yellow', 30, 0.3, 4, { regrow: true })],
  /* 28 */ [g('rainbow', 10, 0.7, 0, { regrow: true }), g('lead', 10, 0.9, 5)],
  /* 29 */ [g('pink', 30, 0.25, 0, { regrow: true }), g('zebra', 12, 0.5, 6)],
  /* 30 */ [g('ceramic', 8, 1.1), g('boss_trippi', 1, 1, 14)],
  /* 31 */ [g('rainbow', 15, 0.45), g('pink', 20, 0.3, 4, { camo: true })],
  /* 32 */ [g('ceramic', 10, 0.9), g('zebra', 25, 0.3, 4)],
  /* 33 */ [g('green', 40, 0.18, 0, { camo: true, regrow: true }), g('lead', 12, 0.7, 6)],
  /* 34 */ [g('ceramic', 15, 0.65), g('rainbow', 10, 0.5, 6)],
  /* 35 */ [g('rainbow', 25, 0.35), g('lead', 6, 0.8, 8, { camo: true })],
  /* 36 */ [g('yellow', 60, 0.12), g('ceramic', 8, 0.8, 6)],
  /* 37 */ [g('ceramic', 20, 0.5)],
  /* 38 */ [g('ceramic', 8, 0.8, 0, { camo: true }), g('rainbow', 15, 0.4, 5, { regrow: true })],
  /* 39 */ [g('rainbow', 30, 0.25), g('ceramic', 10, 0.6, 8)],
  /* 40 */ [g('rainbow', 10, 0.5), g('boss_vaca', 1, 1, 12)],
];

// Endless freeplay past round 40, scaling up counts and MOAB-class HP.
export function freeplayRound(round) {
  const over = round - 40;
  const hpMult = 1 + over * 0.06;
  const groups = [
    g('ceramic', Math.min(10 + over * 2, 40), 0.35),
    g('moab', 1 + Math.floor(over / 2), 2.2, 5, { hpMult }),
  ];
  if (over % 3 === 0) groups.push(g('ceramic', 10, 0.4, 3, { camo: true }));
  if (round % 5 === 0) groups.push(g('bfb', Math.floor(over / 5), 4.5, 8, { hpMult }));
  // rotating boss visit every 10 rounds
  if (round % 10 === 0) {
    const bosses = ['boss_gusini', 'boss_trippi', 'boss_vaca'];
    groups.push(g(bosses[Math.floor(round / 10) % 3], 1, 1, 10, { hpMult: hpMult * 2 }));
  }
  return groups;
}

export function getRound(round) {
  if (round <= ROUNDS.length) return ROUNDS[round - 1];
  return freeplayRound(round);
}

export function roundEndCash(round) {
  return 100 + round;
}

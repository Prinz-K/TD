import { SAVE_KEY } from './constants.js';
import { TOWERS, TOWER_ORDER } from './data/towers.js';

// Persistent progression (localStorage): pops earn Brainrot Points which
// unlock new characters and permanent perks across runs — the roguelite loop.

export const PERKS = {
  startCash: { name: 'Deep Pockets', desc: '+$100 starting cash per level', max: 3, costs: [80, 160, 280], per: 100 },
  startLives: { name: 'Thick Skin', desc: '+25 starting lives per level', max: 2, costs: [70, 150], per: 25 },
  cashRound: { name: 'Rich Rounds', desc: '+$25 end-of-round cash per level', max: 3, costs: [100, 200, 350], per: 25 },
};

export default class Meta {
  constructor() {
    this.points = 0;
    this.unlocked = {};
    this.perks = { startCash: 0, startLives: 0, cashRound: 0 };
    for (const id of TOWER_ORDER) {
      if (TOWERS[id].unlockCost === 0) this.unlocked[id] = true;
    }
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      this.points = data.points || 0;
      this.unlocked = { ...this.unlocked, ...(data.unlocked || {}) };
      this.perks = { ...this.perks, ...(data.perks || {}) };
    } catch (e) { /* corrupted save: start fresh */ }
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        points: this.points, unlocked: this.unlocked, perks: this.perks,
      }));
    } catch (e) { /* storage unavailable */ }
  }

  reset() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    this.points = 0;
    this.unlocked = {};
    this.perks = { startCash: 0, startLives: 0, cashRound: 0 };
    for (const id of TOWER_ORDER) {
      if (TOWERS[id].unlockCost === 0) this.unlocked[id] = true;
    }
  }

  addPoints(n) {
    this.points += n;
    this.save();
  }

  isUnlocked(towerId) {
    return !!this.unlocked[towerId];
  }

  unlockTower(towerId) {
    const cost = TOWERS[towerId].unlockCost;
    if (this.unlocked[towerId] || this.points < cost) return false;
    this.points -= cost;
    this.unlocked[towerId] = true;
    this.save();
    return true;
  }

  perkCost(key) {
    const def = PERKS[key];
    const lvl = this.perks[key];
    return lvl >= def.max ? null : def.costs[lvl];
  }

  buyPerk(key) {
    const cost = this.perkCost(key);
    if (cost === null || this.points < cost) return false;
    this.points -= cost;
    this.perks[key] += 1;
    this.save();
    return true;
  }

  getStartCashBonus() { return this.perks.startCash * PERKS.startCash.per; }
  getStartLivesBonus() { return this.perks.startLives * PERKS.startLives.per; }
  getRoundCashBonus() { return this.perks.cashRound * PERKS.cashRound.per; }
}

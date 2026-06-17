import SaveManager from '../core/SaveManager.js';

// Persistent meta-progression: Tech Points and permanent upgrade levels.
const UPGRADE_DEFS = {
  towerDamageBoost: { max: 3, costs: [50, 100, 200], label: 'Tower Damage Boost', desc: '+5% all tower damage per level' },
  startCpuBonus: { max: 3, costs: [75, 150, 300], label: 'Start CPU Bonus', desc: '+50 starting CPU per level' },
  heroAbilityCd: { max: 2, costs: [100, 200], label: 'Hero Ability CD', desc: '-10% hero ability cooldowns per level' },
  passiveScan: { max: 1, costs: [150], label: 'Passive Scan', desc: 'Auto-detect camo within 100px' },
  compilerMastery: { max: 1, costs: [200], label: 'Compiler Mastery', desc: 'CompilerCannon base damage +30' },
};

export default class MetaProgression {
  constructor() {
    this.techPoints = 0;
    this.levels = {
      towerDamageBoost: 0,
      startCpuBonus: 0,
      heroAbilityCd: 0,
      passiveScan: 0,
      compilerMastery: 0,
    };
    this.firewallUnlocked = true; // see CrateSystem.js comment on unlock simplification
    this.load();
  }

  static get defs() {
    return UPGRADE_DEFS;
  }

  load() {
    const saved = SaveManager.load();
    if (saved) {
      this.techPoints = saved.techPoints || 0;
      this.levels = { ...this.levels, ...(saved.levels || {}) };
      this.firewallUnlocked = saved.firewallUnlocked !== false;
    }
  }

  save() {
    SaveManager.save({
      techPoints: this.techPoints,
      levels: this.levels,
      firewallUnlocked: this.firewallUnlocked,
    });
  }

  reset() {
    SaveManager.reset();
    this.techPoints = 0;
    this.levels = { towerDamageBoost: 0, startCpuBonus: 0, heroAbilityCd: 0, passiveScan: 0, compilerMastery: 0 };
    this.firewallUnlocked = true;
  }

  addTechPoints(amount) {
    this.techPoints += amount;
    this.save();
  }

  getNextCost(key) {
    const def = UPGRADE_DEFS[key];
    const level = this.levels[key];
    if (level >= def.max) return null;
    return def.costs[level];
  }

  canPurchase(key) {
    const cost = this.getNextCost(key);
    if (cost === null) return false;
    return this.techPoints >= cost;
  }

  purchase(key) {
    const cost = this.getNextCost(key);
    if (cost === null || this.techPoints < cost) return false;
    this.techPoints -= cost;
    this.levels[key] += 1;
    this.save();
    return true;
  }

  // Convenience getters for systems to consume.
  getTowerDamageBoostPct() {
    return this.levels.towerDamageBoost * 0.05;
  }

  getStartCpuBonus() {
    return this.levels.startCpuBonus * 50;
  }

  getHeroAbilityCdLevel() {
    return this.levels.heroAbilityCd;
  }

  hasPassiveScan() {
    return this.levels.passiveScan >= 1;
  }

  getCompilerMasteryBonus() {
    return this.levels.compilerMastery >= 1 ? 30 : 0;
  }
}

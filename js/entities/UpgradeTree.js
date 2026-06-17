// Implements the BTD-style upgrade path constraint:
// A path can only reach Tier 3 if the OTHER path is at Tier 0 or Tier 1.
// Once one path reaches Tier 2, the other path is capped at Tier 2 max.
export default class UpgradeTree {
  constructor(towerTypeDef) {
    this.def = towerTypeDef;
    this.pathATier = 0; // 0..3
    this.pathBTier = 0;
  }

  getTierDef(path, tier) {
    // tier is 1-indexed; tiers array is 0-indexed
    const pathDef = path === 'A' ? this.def.pathA : this.def.pathB;
    if (!pathDef || tier < 1 || tier > pathDef.tiers.length) return null;
    return pathDef.tiers[tier - 1];
  }

  getCurrentTier(path) {
    return path === 'A' ? this.pathATier : this.pathBTier;
  }

  getMaxTierAvailable(path) {
    const pathDef = path === 'A' ? this.def.pathA : this.def.pathB;
    return pathDef ? pathDef.tiers.length : 0;
  }

  canUpgrade(path) {
    const current = this.getCurrentTier(path);
    const maxAvailable = this.getMaxTierAvailable(path);
    if (current >= maxAvailable) return false;
    const nextTier = current + 1;
    const other = path === 'A' ? this.pathBTier : this.pathATier;
    if (nextTier >= 3) {
      // Reaching tier 3 only allowed if other path is at tier 0 or 1.
      return other <= 1;
    }
    return true;
  }

  getNextTierDef(path) {
    const current = this.getCurrentTier(path);
    const maxAvailable = this.getMaxTierAvailable(path);
    if (current >= maxAvailable) return null;
    return this.getTierDef(path, current + 1);
  }

  isBlockedByBTDRule(path) {
    const current = this.getCurrentTier(path);
    const maxAvailable = this.getMaxTierAvailable(path);
    if (current >= maxAvailable) return false;
    const nextTier = current + 1;
    const other = path === 'A' ? this.pathBTier : this.pathATier;
    return nextTier >= 3 && other > 1;
  }

  applyUpgrade(path) {
    if (!this.canUpgrade(path)) return false;
    if (path === 'A') this.pathATier += 1;
    else this.pathBTier += 1;
    return true;
  }

  // Aggregates all purchased tier effects for a path into one merged object.
  getAggregatedEffects(path) {
    const tier = this.getCurrentTier(path);
    const merged = {};
    for (let t = 1; t <= tier; t++) {
      const def = this.getTierDef(path, t);
      if (!def) continue;
      for (const key of Object.keys(def)) {
        if (key === 'cost' || key === 'label') continue;
        if (typeof def[key] === 'number') {
          merged[key] = (merged[key] || 0) + def[key];
        } else {
          merged[key] = def[key];
        }
      }
    }
    return merged;
  }
}

import Tower from '../entities/Tower.js';
import { distance } from '../constants.js';

// Manages the set of placed towers: placement, selling, and recomputing
// FirewallBeacon buffs across nearby towers (additive stacking).
export default class TowerManager {
  constructor(grid, bus) {
    this.grid = grid;
    this.bus = bus;
    this.towers = [];
    this.damageBoostPct = 0; // from meta-progression Tower Damage Boost
    this.compilerMasteryBonus = 0; // from meta Compiler Mastery
  }

  placeTower(typeId, gridX, gridY) {
    if (!this.grid.isBuildable(gridX, gridY)) return null;
    const tower = new Tower(typeId, gridX, gridY);
    if (typeId === 'CompilerCannon' && this.compilerMasteryBonus) {
      tower.def = { ...tower.def, baseDamage: tower.def.baseDamage + this.compilerMasteryBonus };
      tower.recomputeStats();
    }
    this.towers.push(tower);
    this.grid.occupy(gridX, gridY, tower.id);
    this.recomputeBuffs();
    return tower;
  }

  removeTower(towerId) {
    const idx = this.towers.findIndex((t) => t.id === towerId);
    if (idx === -1) return null;
    const tower = this.towers[idx];
    this.grid.vacate(tower.gridX, tower.gridY);
    this.towers.splice(idx, 1);
    this.recomputeBuffs();
    return tower;
  }

  getTowerAt(gridX, gridY) {
    const id = this.grid.getOccupant(gridX, gridY);
    if (!id) return null;
    return this.towers.find((t) => t.id === id) || null;
  }

  recomputeBuffs() {
    const beacons = this.towers.filter((t) => t.def.type === 'support');
    for (const tower of this.towers) {
      if (tower.def.type === 'support') continue;
      let dmgPct = this.damageBoostPct; // meta upgrade baseline
      let atkPct = 0;
      let shield = 0;
      for (const beacon of beacons) {
        const d = distance(tower.x, tower.y, beacon.x, beacon.y);
        if (d <= beacon.range) {
          dmgPct += beacon.outDamageBuffPct || 0;
          atkPct += beacon.outAtkSpeedBuffPct || 0;
          shield += beacon.shieldBonus || 0;
        }
      }
      tower.buffDamagePct = dmgPct;
      tower.buffAtkSpeedPct = atkPct;
      tower.shieldHp = shield;
      tower.recomputeStats();
      // recomputeStats reapplies buffDamagePct/buffAtkSpeedPct multiplicatively
      // each call, so guard against compounding by resetting base first.
    }
  }

  applyEnemySlowFromBeacons(enemies) {
    const beacons = this.towers.filter((t) => t.def.type === 'support' && t.enemySlowPct > 0);
    if (beacons.length === 0) return;
    for (const e of enemies) {
      if (!e.alive) continue;
      for (const beacon of beacons) {
        if (distance(e.x, e.y, beacon.x, beacon.y) <= beacon.range) {
          // Refresh a short slow each tick while in range (non-stacking duration-wise).
          const existing = e.statusEffects.find((s) => s.type === 'slow' && s.fromBeacon);
          if (existing) {
            existing.duration = 0.3;
          } else {
            e.statusEffects.push({ type: 'slow', duration: 0.3, magnitude: beacon.enemySlowPct, fromBeacon: true });
          }
        }
      }
    }
  }
}

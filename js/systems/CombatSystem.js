import { distance } from '../constants.js';
import Projectile from '../entities/Projectile.js';

// Handles tower/hero target acquisition and attack resolution, including
// chain lightning, AoE bursts, shockwaves, slows/stuns, and camo visibility.
export default class CombatSystem {
  constructor(eventBus) {
    this.bus = eventBus;
    this.projectiles = [];
  }

  isEnemyVisible(enemy, hero) {
    if (!enemy.isCamo) return true;
    if (enemy.detectedPermanently) return true;
    if (hero && hero.passiveScan && distance(hero.x, hero.y, enemy.x, enemy.y) <= hero.passiveScanRadius) {
      return true;
    }
    return false;
  }

  getVisibleEnemiesInRange(x, y, range, enemies, hero) {
    return enemies.filter((e) => e.alive && !e.reachedCore
      && distance(x, y, e.x, e.y) <= range
      && this.isEnemyVisible(e, hero));
  }

  selectTarget(x, y, range, mode, enemies, hero) {
    const candidates = this.getVisibleEnemiesInRange(x, y, range, enemies, hero);
    if (candidates.length === 0) return null;
    switch (mode) {
      case 'Last':
        return candidates.reduce((a, b) => (a.distanceTraveled < b.distanceTraveled ? a : b));
      case 'Strongest':
        return candidates.reduce((a, b) => (a.maxHp > b.maxHp ? a : b));
      case 'Closest':
        return candidates.reduce((a, b) => (distance(x, y, a.x, a.y) < distance(x, y, b.x, b.y) ? a : b));
      case 'First':
      default:
        return candidates.reduce((a, b) => (a.distanceTraveled > b.distanceTraveled ? a : b));
    }
  }

  updateTower(tower, dt, enemies, hero, onKill) {
    if (tower.def.type === 'support') return; // FirewallBeacon doesn't attack
    if (tower.cooldown > 0) tower.cooldown -= dt;
    if (tower.cooldown > 0) return;

    const target = this.selectTarget(tower.x, tower.y, tower.range, tower.targetingMode, enemies, hero);
    if (!target) return;

    tower.cooldown = 1 / Math.max(0.01, tower.attackSpeed);

    if (tower.def.type === 'chain') {
      this._doChainAttack(tower, target, enemies, hero, onKill);
    } else if (tower.def.type === 'single') {
      this._doSingleAttack(tower, target, onKill);
    }
  }

  _doChainAttack(tower, firstTarget, enemies, hero, onKill) {
    const hitIds = new Set();
    let current = firstTarget;
    let chainIndex = 0;
    const maxChains = tower.chains;
    const falloff = tower.chainFalloff || 1.0;
    const arcs = [];

    while (current && chainIndex < maxChains) {
      hitIds.add(current.id);
      const dmg = tower.damage * Math.pow(falloff, chainIndex);
      this._applyDamage(current, dmg, false, 0, onKill);
      if (tower.stun > 0) current.addStatus('stun', tower.stun);
      arcs.push({ x1: chainIndex === 0 ? tower.x : current._prevX, y1: chainIndex === 0 ? tower.y : current._prevY, x2: current.x, y2: current.y });
      const prevX = current.x;
      const prevY = current.y;

      // Find nearest un-hit visible enemy within chainRange of current.
      let next = null;
      let bestDist = Infinity;
      for (const e of enemies) {
        if (!e.alive || e.reachedCore || hitIds.has(e.id)) continue;
        if (!this.isEnemyVisible(e, hero)) continue;
        const d = distance(current.x, current.y, e.x, e.y);
        if (d <= tower.def.chainRange && d < bestDist) {
          bestDist = d;
          next = e;
        }
      }
      if (next) next._prevX = prevX, next._prevY = prevY;
      current = next;
      chainIndex += 1;
    }

    if (tower.burstDamage > 0 && arcs.length > 0) {
      const lastArc = arcs[arcs.length - 1];
      for (const e of enemies) {
        if (!e.alive || e.reachedCore) continue;
        if (distance(lastArc.x2, lastArc.y2, e.x, e.y) <= tower.burstRadius) {
          this._applyDamage(e, tower.burstDamage, false, 0, onKill);
        }
      }
      this.bus.emit('aoeBurst', { x: lastArc.x2, y: lastArc.y2, radius: tower.burstRadius, color: '#ffd34d' });
    }

    this.bus.emit('chainLightning', { arcs, color: tower.def.color });
  }

  _doSingleAttack(tower, target, onKill) {
    const proj = new Projectile(tower.x, tower.y, target, tower.damage, tower.def.color, {
      armorPierce: tower.armorPierce || 0,
      fullArmorIgnore: !!tower.fullArmorIgnore,
      onHit: (enemy) => {
        const dmgMult = 1; // multiplier already baked into tower.damage via recomputeStats
        const dealt = this._applyDamage(enemy, tower.damage, tower.fullArmorIgnore, tower.armorPierce, onKill, () => {
          if (tower.shockwaveRadius > 0) {
            this.bus.emit('shockwave', { x: enemy.x, y: enemy.y, radius: tower.shockwaveRadius, color: tower.def.color });
          }
        }, tower.shockwaveRadius, tower.shockwaveDamage);
        if (tower.slowPct > 0 && enemy.alive) {
          enemy.addStatus('slow', tower.slowDuration, tower.slowPct);
        }
      },
    });
    this.projectiles.push(proj);
  }

  _applyDamage(enemy, amount, ignoreArmor, armorPierce, onKill, onKillExtra, shockwaveRadius, shockwaveDamage) {
    const dealt = enemy.takeDamage(amount, ignoreArmor, armorPierce);
    this.bus.emit('enemyHit', { enemy, amount: dealt });
    if (!enemy.alive) {
      if (onKill) onKill(enemy);
      if (onKillExtra) onKillExtra();
      if (shockwaveRadius > 0) {
        this.bus.emit('shockwaveKill', { x: enemy.x, y: enemy.y, radius: shockwaveRadius, damage: shockwaveDamage });
      }
    }
    return dealt;
  }

  updateProjectiles(dt) {
    for (const p of this.projectiles) p.update(dt);
    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  updateHero(hero, dt, enemies, onKill) {
    if (hero.attackCooldown > 0) hero.attackCooldown -= dt;
    if (hero.attackCooldown > 0) return;
    const target = this.selectTarget(hero.x, hero.y, hero.attackRange, 'Closest', enemies, hero);
    if (!target) return;
    hero.attackCooldown = 1 / hero.attackRate;
    this._applyDamage(target, hero.attackDamage, false, 0, onKill);
    this.bus.emit('heroAttack', { x: hero.x, y: hero.y, tx: target.x, ty: target.y });
  }

  applyEmpBurst(hero, enemies) {
    for (const e of enemies) {
      if (!e.alive || e.reachedCore) continue;
      if (distance(hero.x, hero.y, e.x, e.y) <= hero.empRadius) {
        e.addStatus('stun', hero.empDuration);
      }
    }
    this.bus.emit('empBurst', { x: hero.x, y: hero.y, radius: hero.empRadius });
  }

  applyPurge(hero, enemies) {
    for (const e of enemies) {
      if (!e.alive || e.reachedCore) continue;
      if (e.isCamo && distance(hero.x, hero.y, e.x, e.y) <= hero.purgeRadius) {
        e.detectedPermanently = true;
      }
    }
    this.bus.emit('purge', { x: hero.x, y: hero.y, radius: hero.purgeRadius });
  }
}

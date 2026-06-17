import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

// Draws towers, enemies, hero, and projectiles each frame onto the entities layer.
export default class EntityRenderer {
  constructor(ctx) {
    this.ctx = ctx;
  }

  draw(towers, enemies, hero, projectiles, selectedTowerId) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (const tower of towers) this.drawTower(tower, tower.id === selectedTowerId);
    for (const enemy of enemies) this.drawEnemy(enemy);
    for (const proj of projectiles) this.drawProjectile(proj);
    if (hero) this.drawHero(hero);
  }

  drawTower(tower, selected) {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = tower.def.color;
    ctx.shadowBlur = selected ? 22 : 12;

    if (selected) {
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
      ctx.strokeStyle = `${tower.def.color}55`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.fillStyle = tower.def.color;
    if (tower.def.type === 'support') {
      // diamond shape for support towers
      ctx.beginPath();
      ctx.moveTo(tower.x, tower.y - 16);
      ctx.lineTo(tower.x + 16, tower.y);
      ctx.lineTo(tower.x, tower.y + 16);
      ctx.lineTo(tower.x - 16, tower.y);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a0a14';
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, 7, 0, Math.PI * 2);
    ctx.fill();

    // small tier pips
    const tierA = tower.upgrades.pathATier;
    const tierB = tower.upgrades.pathBTier;
    ctx.font = '8px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`${tierA}/${tierB}`, tower.x, tower.y + 26);
    ctx.restore();
  }

  drawEnemy(enemy) {
    const ctx = this.ctx;
    const isHiddenCamo = enemy.isCamo && !enemy.detectedPermanently && !enemy._renderDetected;
    ctx.save();
    ctx.globalAlpha = isHiddenCamo ? 0.25 : 1.0;
    ctx.shadowColor = enemy.color;
    ctx.shadowBlur = enemy.isBoss ? 20 : 10;
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    if (enemy.isStunned()) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // HP bar
    if (!isHiddenCamo) {
      const barWidth = enemy.radius * 2.2;
      const pct = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#222';
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 10, barWidth, 4);
      ctx.fillStyle = pct > 0.5 ? '#44ff88' : pct > 0.2 ? '#ffd700' : '#ff4466';
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 10, barWidth * pct, 4);
    }
    ctx.restore();
  }

  drawProjectile(proj) {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = proj.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = proj.color;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawHero(hero) {
    const ctx = this.ctx;
    // fading trail
    for (const t of hero.trail) {
      if (t.life <= 0) continue;
      ctx.save();
      ctx.globalAlpha = t.life * 0.4;
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(t.x, t.y, hero.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(hero.x, hero.y, hero.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#0a0a14';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

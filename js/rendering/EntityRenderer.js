import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

// Draws towers (Brainrot characters), enemies, hero, and projectiles each
// frame in a soft, rounded "toon" style: drop shadows, rounded bodies, simple
// cartoon faces with eyes.
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

  // ---- small toon helpers ----------------------------------------------

  _shadow(x, y, rx, ry = rx * 0.4) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _darken(hex, amt = 0.75) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return hex;
    const r = Math.round(parseInt(m[1], 16) * amt);
    const g = Math.round(parseInt(m[2], 16) * amt);
    const b = Math.round(parseInt(m[3], 16) * amt);
    return `rgb(${r},${g},${b})`;
  }

  // Two cartoon eyes centered on (x, y), looking toward (dx, dy).
  _eyes(x, y, spread, eyeR, dx = 0, dy = 0.3) {
    const ctx = this.ctx;
    const len = Math.hypot(dx, dy) || 1;
    const px = (dx / len) * eyeR * 0.4;
    const py = (dy / len) * eyeR * 0.4;
    for (const sx of [-spread, spread]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + sx, y, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c1c28';
      ctx.beginPath();
      ctx.arc(x + sx + px, y + py, eyeR * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(x + sx + px - eyeR * 0.18, y + py - eyeR * 0.18, eyeR * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- towers -----------------------------------------------------------

  drawTower(tower, selected) {
    const ctx = this.ctx;
    const { x, y } = tower;
    const color = tower.def.color;

    if (selected) {
      ctx.save();
      ctx.fillStyle = `${this._darken(color, 1)}`;
      ctx.globalAlpha = 0.12;
      ctx.beginPath();
      ctx.arc(x, y, tower.range, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, tower.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    this._shadow(x, y + 16, 17, 6);

    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = this._darken(color, 0.65);

    if (tower.def.type === 'support') {
      // Brr Brr Patapim — round leafy guardian with little ear tufts.
      ctx.fillStyle = this._darken(color, 0.8);
      for (const sx of [-12, 12]) {
        ctx.beginPath();
        ctx.ellipse(x + sx, y - 12, 6, 10, sx > 0 ? 0.4 : -0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      this._eyes(x, y - 2, 6, 4);
    } else if (tower.def.type === 'single') {
      // Bombardiro Crocodilo — chunky body with a snout.
      ctx.fillStyle = color;
      this._roundRect(x - 16, y - 14, 32, 28, 9);
      ctx.fill();
      ctx.stroke();
      // snout
      ctx.fillStyle = this._darken(color, 0.85);
      this._roundRect(x - 6, y + 6, 12, 10, 4);
      ctx.fill();
      this._eyes(x, y - 4, 7, 4.5);
    } else {
      // Tung Tung Tung Sahur — wooden bat-headed bonker.
      ctx.fillStyle = color;
      this._roundRect(x - 14, y - 16, 28, 32, 8);
      ctx.fill();
      ctx.stroke();
      // wood grain hint
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 10); ctx.lineTo(x - 8, y + 12);
      ctx.moveTo(x + 6, y - 10); ctx.lineTo(x + 6, y + 12);
      ctx.stroke();
      this._eyes(x, y - 4, 6, 4);
    }
    ctx.restore();

    // tier pips
    const tierA = tower.upgrades.pathATier;
    const tierB = tower.upgrades.pathBTier;
    if (tierA || tierB) {
      ctx.save();
      ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
      ctx.fillStyle = '#5b3a12';
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.strokeText(`${tierA}/${tierB}`, x, y + 30);
      ctx.fillText(`${tierA}/${tierB}`, x, y + 30);
      ctx.restore();
    }
  }

  // ---- enemies ----------------------------------------------------------

  drawEnemy(enemy) {
    const ctx = this.ctx;
    const isHiddenCamo = enemy.isCamo && !enemy.detectedPermanently && !enemy._renderDetected;
    const r = enemy.radius;
    ctx.save();
    ctx.globalAlpha = isHiddenCamo ? 0.28 : 1.0;

    if (!isHiddenCamo) this._shadow(enemy.x, enemy.y + r, r, r * 0.4);

    // rounded blobby body
    ctx.fillStyle = enemy.color;
    ctx.strokeStyle = this._darken(enemy.color, 0.65);
    ctx.lineWidth = enemy.isBoss ? 3.5 : 2.5;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // glossy highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(enemy.x - r * 0.3, enemy.y - r * 0.35, r * 0.4, r * 0.25, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // boss crown
    if (enemy.isBoss) {
      ctx.fillStyle = '#ffd34d';
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const cy = enemy.y - r - 4;
      ctx.moveTo(enemy.x - 12, cy + 8);
      ctx.lineTo(enemy.x - 12, cy);
      ctx.lineTo(enemy.x - 5, cy + 5);
      ctx.lineTo(enemy.x, cy - 3);
      ctx.lineTo(enemy.x + 5, cy + 5);
      ctx.lineTo(enemy.x + 12, cy);
      ctx.lineTo(enemy.x + 12, cy + 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // face — eyes look in travel direction (down-the-path, roughly rightward)
    this._eyes(enemy.x, enemy.y - r * 0.1, r * 0.4, Math.max(3, r * 0.28), 0.6, 0);

    if (enemy.isStunned()) {
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // HP bar
    if (!isHiddenCamo) {
      const barWidth = r * 2.4;
      const pct = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      this._roundRect(enemy.x - barWidth / 2, enemy.y - r - 12, barWidth, 5, 2.5);
      ctx.fill();
      ctx.fillStyle = pct > 0.5 ? '#5fd35f' : pct > 0.2 ? '#ffd34d' : '#ff6b6b';
      this._roundRect(enemy.x - barWidth / 2, enemy.y - r - 12, barWidth * pct, 5, 2.5);
      ctx.fill();
      ctx.restore();
    }
  }

  // ---- projectiles ------------------------------------------------------

  drawProjectile(proj) {
    const ctx = this.ctx;
    ctx.save();
    this._shadow(proj.x, proj.y + proj.radius + 2, proj.radius, proj.radius * 0.4);
    ctx.fillStyle = proj.color;
    ctx.strokeStyle = this._darken(proj.color, 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(proj.x - proj.radius * 0.3, proj.y - proj.radius * 0.3, proj.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---- hero -------------------------------------------------------------

  drawHero(hero) {
    const ctx = this.ctx;
    // soft fading trail
    for (const t of hero.trail) {
      if (t.life <= 0) continue;
      ctx.save();
      ctx.globalAlpha = t.life * 0.25;
      ctx.fillStyle = '#ff9ec4';
      ctx.beginPath();
      ctx.arc(t.x, t.y, hero.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    this._shadow(hero.x, hero.y + hero.radius, hero.radius, hero.radius * 0.4);

    ctx.save();
    // little tutu skirt
    ctx.fillStyle = '#ffc6dd';
    ctx.beginPath();
    ctx.moveTo(hero.x - hero.radius - 4, hero.y + hero.radius);
    ctx.lineTo(hero.x, hero.y + 2);
    ctx.lineTo(hero.x + hero.radius + 4, hero.y + hero.radius);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ff7fb0';
    ctx.strokeStyle = this._darken('#ff7fb0', 0.7);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(hero.x, hero.y, hero.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    this._eyes(hero.x, hero.y - 2, 5, 3.5);
    ctx.restore();
  }

  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
}

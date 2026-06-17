import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

// Draws particles, chain-lightning arcs, and AoE flashes onto the effects layer.
export default class EffectsRenderer {
  constructor(ctx) {
    this.ctx = ctx;
  }

  draw(effectsSystem) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (const flash of effectsSystem.flashes) this.drawFlash(flash);
    for (const arc of effectsSystem.arcs) this.drawArc(arc);
    for (const p of effectsSystem.particles) this.drawParticle(p);
  }

  drawFlash(flash) {
    const ctx = this.ctx;
    const pct = flash.life / flash.maxLife;
    ctx.save();
    ctx.globalAlpha = pct * 0.6;
    ctx.shadowColor = flash.color;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = flash.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(flash.x, flash.y, flash.radius * (1 - pct * 0.3), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = flash.color;
    ctx.globalAlpha = pct * 0.15;
    ctx.fill();
    ctx.restore();
  }

  drawArc(arc) {
    const ctx = this.ctx;
    const pct = arc.life / arc.maxLife;
    ctx.save();
    ctx.globalAlpha = pct;
    ctx.shadowColor = arc.color || '#00ffff';
    ctx.shadowBlur = 12;

    const gradient = ctx.createLinearGradient(arc.x1, arc.y1, arc.x2, arc.y2);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, arc.color || '#00ffff');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(arc.x1, arc.y1);
    // slight jitter midpoint for a lightning look
    const midX = (arc.x1 + arc.x2) / 2 + (Math.random() - 0.5) * 10;
    const midY = (arc.y1 + arc.y2) / 2 + (Math.random() - 0.5) * 10;
    ctx.lineTo(midX, midY);
    ctx.lineTo(arc.x2, arc.y2);
    ctx.stroke();
    ctx.restore();
  }

  drawParticle(p) {
    const ctx = this.ctx;
    const pct = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = pct;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * pct, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

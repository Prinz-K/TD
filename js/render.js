import { CANVAS_W, CANVAS_H, PATH_WIDTH } from './constants.js';

// All drawing, in a soft Bloons-like toon style: bold outlines, glossy
// highlights, drop shadows, saturated colors.

function darken(hex, amt = 0.72) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  return `rgb(${Math.round(parseInt(m[1], 16) * amt)},${Math.round(parseInt(m[2], 16) * amt)},${Math.round(parseInt(m[3], 16) * amt)})`;
}

function shadow(ctx, x, y, rx, ry) {
  ctx.save();
  ctx.fillStyle = 'rgba(30,60,20,0.20)';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function eyes(ctx, x, y, spread, r, lookX = 0.3, lookY = 0.2) {
  for (const sx of [-spread, spread]) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + sx, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#1c1c28';
    ctx.beginPath();
    ctx.arc(x + sx + lookX * r, y + lookY * r, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(x + sx + lookX * r - r * 0.2, y + lookY * r - r * 0.2, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ------------------------------------------------------------------ map ----

// Pre-render the static map (meadow + track + decorations) once.
export function renderMapToCanvas(path) {
  const c = document.createElement('canvas');
  c.width = CANVAS_W;
  c.height = CANVAS_H;
  const ctx = c.getContext('2d');

  // meadow base with soft vertical light
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, '#9edb72');
  grad.addColorStop(1, '#7cc558');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // soft meadow patches
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    ctx.ellipse(rand() * CANVAS_W, rand() * CANVAS_H, 60 + rand() * 110, 40 + rand() * 60, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(40,110,40,0.10)';
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.ellipse(rand() * CANVAS_W, rand() * CANVAS_H, 50 + rand() * 90, 30 + rand() * 50, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // track: dark edge stroke underneath, sandy fill on top
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(path.pts[0].x, path.pts[0].y);
    for (const p of path.pts) ctx.lineTo(p.x, p.y);
  };
  trace();
  ctx.strokeStyle = '#b98d4f';
  ctx.lineWidth = PATH_WIDTH + 10;
  ctx.stroke();
  trace();
  ctx.strokeStyle = '#e8c887';
  ctx.lineWidth = PATH_WIDTH;
  ctx.stroke();
  trace();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = PATH_WIDTH * 0.45;
  ctx.stroke();

  // entry / exit markers
  const start = path.pts[0];
  const end = path.pts[path.pts.length - 1];
  ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 4;
  ctx.strokeText('▶ START', Math.max(60, start.x + 70), start.y - 34);
  ctx.fillText('▶ START', Math.max(60, start.x + 70), start.y - 34);
  ctx.strokeText('EXIT ▶', Math.min(CANVAS_W - 55, end.x - 80), end.y - 36);
  ctx.fillText('EXIT ▶', Math.min(CANVAS_W - 55, end.x - 80), end.y - 36);

  // decorative bushes / flowers away from the track
  for (let i = 0; i < 26; i++) {
    const x = rand() * CANVAS_W;
    const y = rand() * CANVAS_H;
    if (path.distTo(x, y) < PATH_WIDTH * 0.5 + 34) continue;
    if (i % 3 === 0) drawBush(ctx, x, y, 10 + rand() * 10);
    else drawFlower(ctx, x, y, rand() < 0.5 ? '#ffe066' : '#ff8fa3');
  }
  return c;
}

function drawBush(ctx, x, y, r) {
  shadow(ctx, x, y + r * 0.6, r * 1.2, r * 0.4);
  for (const [dx, dy, rr] of [[-r * 0.6, 0, r * 0.75], [r * 0.6, 0, r * 0.75], [0, -r * 0.45, r * 0.85]]) {
    ctx.fillStyle = '#4e9e3f';
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.5, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawFlower(ctx, x, y, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.arc(x, y, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

// --------------------------------------------------------------- bloons ----

export function drawBloon(ctx, b) {
  const r = b.def.radius;
  ctx.save();
  if (b.isMoab) { drawMoab(ctx, b); ctx.restore(); return; }

  shadow(ctx, b.x, b.y + r * 0.9, r * 0.8, r * 0.3);

  // balloon body (slightly taller than wide) + knot
  const color = b.def.color;
  ctx.fillStyle = color;
  ctx.strokeStyle = darken(color, 0.62);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(b.x, b.y, r * 0.85, r, 0, 0, Math.PI * 2);
  ctx.fill();

  if (b.def.striped) { // zebra
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#3a3a44';
    for (let i = -2; i <= 2; i += 2) {
      ctx.fillRect(b.x - r, b.y + i * r * 0.28 - r * 0.14, r * 2, r * 0.28);
    }
    ctx.restore();
  }
  if (b.def.rainbow) {
    ctx.save();
    ctx.clip();
    const bands = ['#ff5c5c', '#ffb14d', '#ffe14d', '#6fdb6f', '#5c9dff'];
    bands.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(b.x - r, b.y - r + (i / bands.length) * 2 * r, r * 2, (2 * r) / bands.length);
    });
    ctx.restore();
  }
  if (b.typeId === 'ceramic' && b.hp < b.maxHp * 0.6) {
    // cracks
    ctx.strokeStyle = 'rgba(60,30,10,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(b.x - r * 0.4, b.y - r * 0.5);
    ctx.lineTo(b.x - r * 0.1, b.y);
    ctx.lineTo(b.x - r * 0.45, b.y + r * 0.4);
    ctx.moveTo(b.x + r * 0.35, b.y - r * 0.3);
    ctx.lineTo(b.x + r * 0.15, b.y + r * 0.25);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.ellipse(b.x, b.y, r * 0.85, r, 0, 0, Math.PI * 2);
  ctx.stroke();

  // knot
  ctx.fillStyle = darken(color, 0.62);
  ctx.beginPath();
  ctx.moveTo(b.x - 3, b.y + r + 1);
  ctx.lineTo(b.x + 3, b.y + r + 1);
  ctx.lineTo(b.x, b.y + r - 3);
  ctx.closePath();
  ctx.fill();

  // gloss
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(b.x - r * 0.3, b.y - r * 0.4, r * 0.28, r * 0.4, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // camo patches
  if (b.camo) {
    ctx.fillStyle = 'rgba(50,80,40,0.55)';
    for (const [dx, dy, rr] of [[-r * 0.3, r * 0.25, r * 0.3], [r * 0.35, -r * 0.15, r * 0.26], [0, r * 0.55, r * 0.22]]) {
      ctx.beginPath();
      ctx.arc(b.x + dx, b.y + dy, rr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // regrow sprout
  if (b.regrow) {
    ctx.fillStyle = '#3fa34d';
    ctx.beginPath();
    ctx.ellipse(b.x - 3, b.y - r - 4, 4, 2.5, -0.6, 0, Math.PI * 2);
    ctx.ellipse(b.x + 3, b.y - r - 4, 4, 2.5, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // frozen/stunned tint
  if (b.stunTimer > 0) {
    ctx.fillStyle = 'rgba(160,220,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, r * 0.9, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ceramic hp pips
  if (b.typeId === 'ceramic') {
    drawHpBar(ctx, b.x, b.y - r - 8, 26, b.hp / b.maxHp);
  }
}

function drawMoab(ctx, b) {
  const r = b.def.radius;
  const w = r * 2.4;
  const h = r * 1.25;
  const color = b.typeId === 'bfb' ? '#c05555' : '#6e93bd';
  shadow(ctx, b.x, b.y + h * 0.75, w * 0.5, h * 0.28);

  // tail fins
  ctx.fillStyle = darken(color, 0.7);
  ctx.beginPath();
  ctx.moveTo(b.x - w * 0.48, b.y);
  ctx.lineTo(b.x - w * 0.68, b.y - h * 0.55);
  ctx.lineTo(b.x - w * 0.52, b.y);
  ctx.lineTo(b.x - w * 0.68, b.y + h * 0.55);
  ctx.closePath();
  ctx.fill();

  // hull
  ctx.fillStyle = color;
  ctx.strokeStyle = darken(color, 0.55);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(b.x, b.y, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // belly stripe
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(b.x, b.y + h * 0.16, w * 0.4, h * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // nose cone
  ctx.fillStyle = darken(color, 0.75);
  ctx.beginPath();
  ctx.ellipse(b.x + w * 0.42, b.y, w * 0.1, h * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  // menacing eyes
  eyes(ctx, b.x + w * 0.18, b.y - h * 0.12, 8, 5, 0.5, 0.1);
  ctx.strokeStyle = darken(color, 0.4);
  ctx.lineWidth = 2.5;
  ctx.beginPath(); // angry brows
  ctx.moveTo(b.x + w * 0.06, b.y - h * 0.34);
  ctx.lineTo(b.x + w * 0.16, b.y - h * 0.22);
  ctx.moveTo(b.x + w * 0.34, b.y - h * 0.22);
  ctx.lineTo(b.x + w * 0.44, b.y - h * 0.34);
  ctx.stroke();

  drawHpBar(ctx, b.x, b.y - h * 0.5 - 12, w * 0.8, b.hp / b.maxHp);
}

function drawHpBar(ctx, x, y, w, pct) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  roundRect(ctx, x - w / 2, y, w, 6, 3);
  ctx.fill();
  ctx.fillStyle = pct > 0.5 ? '#5fd35f' : pct > 0.25 ? '#ffd34d' : '#ff6b6b';
  roundRect(ctx, x - w / 2, y, Math.max(2, w * Math.max(0, pct)), 6, 3);
  ctx.fill();
  ctx.restore();
}

// --------------------------------------------------------------- towers ----

export function drawTower(ctx, tower, selected) {
  if (selected) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, tower.stats.range, 0, Math.PI * 2);
    ctx.fill();
    ctx.setLineDash([7, 7]);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
  drawCharacter(ctx, tower.typeId, tower.x, tower.y, 1);

  const total = tower.tiers[0] + tower.tiers[1] + tower.tiers[2];
  if (total > 0) {
    ctx.save();
    ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#5b3a12';
    const label = tower.tiers.join('-');
    ctx.strokeText(label, tower.x, tower.y + 32);
    ctx.fillText(label, tower.x, tower.y + 32);
    ctx.restore();
  }
}

// The character art: soft rounded toon figures with faces and signature props.
export function drawCharacter(ctx, id, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  shadow(ctx, 0, 17, 16, 6);
  ctx.lineWidth = 2.5;

  switch (id) {
    case 'sahur': { // wooden creature holding a bat
      ctx.fillStyle = '#a9743b';
      ctx.strokeStyle = darken('#a9743b', 0.6);
      roundRect(ctx, -13, -17, 26, 34, 9);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-6, -10); ctx.lineTo(-6, 12);
      ctx.moveTo(5, -8); ctx.lineTo(5, 12);
      ctx.stroke();
      // bat
      ctx.fillStyle = '#c99655';
      ctx.strokeStyle = darken('#c99655', 0.6);
      ctx.lineWidth = 2;
      ctx.save();
      ctx.translate(15, -4);
      ctx.rotate(-0.6);
      roundRect(ctx, -3, -16, 7, 24, 3.5);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      eyes(ctx, 0, -6, 5.5, 3.8);
      mouth(ctx, 0, 3, 4);
      break;
    }
    case 'ballerina': { // pink dancer with tutu, arms up
      ctx.fillStyle = '#ffd9e8';
      ctx.beginPath(); // tutu
      ctx.moveTo(-17, 13);
      ctx.lineTo(0, 0);
      ctx.lineTo(17, 13);
      ctx.quadraticCurveTo(0, 20, -17, 13);
      ctx.fill();
      ctx.fillStyle = '#f58fb8';
      ctx.strokeStyle = darken('#f58fb8', 0.65);
      ctx.beginPath();
      ctx.arc(0, -4, 13, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // arms up
      ctx.strokeStyle = '#f58fb8';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-11, -10); ctx.quadraticCurveTo(-18, -20, -10, -24);
      ctx.moveTo(11, -10); ctx.quadraticCurveTo(18, -20, 10, -24);
      ctx.stroke();
      eyes(ctx, 0, -7, 5, 3.4);
      mouth(ctx, 0, 1, 3.5);
      break;
    }
    case 'bombardiro': { // green croc with snout + little bomb
      ctx.fillStyle = '#4a7c2f';
      ctx.strokeStyle = darken('#4a7c2f', 0.6);
      roundRect(ctx, -15, -15, 30, 30, 10);
      ctx.fill(); ctx.stroke();
      // snout
      ctx.fillStyle = '#5c9440';
      roundRect(ctx, -7, 2, 14, 12, 5);
      ctx.fill();
      ctx.fillStyle = '#ffffff'; // teeth
      ctx.beginPath();
      ctx.moveTo(-5, 8); ctx.lineTo(-3, 11); ctx.lineTo(-1, 8);
      ctx.moveTo(1, 8); ctx.lineTo(3, 11); ctx.lineTo(5, 8);
      ctx.fill();
      // bomb under arm
      ctx.fillStyle = '#33333d';
      ctx.beginPath();
      ctx.arc(15, 6, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f2c744';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(17, 1); ctx.quadraticCurveTo(20, -3, 18, -5);
      ctx.stroke();
      eyes(ctx, 0, -7, 6, 4);
      break;
    }
    case 'lirili': { // gray elephant with big ears + clock
      ctx.fillStyle = '#8fa0b3'; // ears
      ctx.strokeStyle = darken('#8fa0b3', 0.65);
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(sx * 14, -6, 7, 11, sx * 0.35, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = '#9aa8b8';
      ctx.beginPath();
      ctx.arc(0, -2, 14, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // trunk
      ctx.strokeStyle = '#9aa8b8';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 4); ctx.quadraticCurveTo(2, 14, 9, 15);
      ctx.stroke();
      // clock on chest
      ctx.fillStyle = '#ffe08a';
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-8, 11, 6, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-8, 11); ctx.lineTo(-8, 7.5);
      ctx.moveTo(-8, 11); ctx.lineTo(-5.5, 11);
      ctx.stroke();
      eyes(ctx, 0, -6, 5.5, 3.6);
      break;
    }
    case 'assassino': { // hooded coffee cup ninja
      ctx.fillStyle = '#4a3628'; // hood
      ctx.strokeStyle = darken('#4a3628', 0.6);
      ctx.beginPath();
      ctx.arc(0, -3, 15, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#6f4e37'; // cup body
      roundRect(ctx, -10, 2, 20, 15, 5);
      ctx.fill();
      ctx.strokeStyle = '#6f4e37'; // cup handle
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(12, 9, 4.5, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      // face slit
      ctx.fillStyle = '#e8d3b8';
      roundRect(ctx, -10, -9, 20, 8, 4);
      ctx.fill();
      eyes(ctx, 0, -5, 5, 3.2, 0.5, 0);
      break;
    }
    case 'patapim': { // leafy forest spirit with big nose
      ctx.fillStyle = '#2e7d38'; // leaf tufts
      for (const [dx, dy] of [[-11, -15], [0, -19], [11, -15]]) {
        ctx.beginPath();
        ctx.ellipse(dx, dy, 7, 10, dx * 0.03, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#3fa34d';
      ctx.strokeStyle = darken('#3fa34d', 0.6);
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // big nose
      ctx.fillStyle = '#e8a87c';
      ctx.strokeStyle = darken('#e8a87c', 0.7);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 4, 5, 8, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      eyes(ctx, 0, -5, 6.5, 3.6);
      break;
    }
    case 'bananini': { // banana with monkey face
      ctx.fillStyle = '#f2c744';
      ctx.strokeStyle = darken('#f2c744', 0.65);
      ctx.lineWidth = 2.5;
      ctx.save();
      ctx.rotate(0.25);
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 18, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      // peel tips
      ctx.fillStyle = '#c99b2f';
      ctx.beginPath();
      ctx.arc(-4, -17, 3, 0, Math.PI * 2);
      ctx.arc(5, 16, 3, 0, Math.PI * 2);
      ctx.fill();
      // monkey face patch
      ctx.fillStyle = '#e8c39a';
      ctx.beginPath();
      ctx.ellipse(0, -2, 8, 9, 0.2, 0, Math.PI * 2);
      ctx.fill();
      eyes(ctx, 0, -5, 4, 3);
      mouth(ctx, 0, 3, 3.5);
      break;
    }
    case 'tralalero': { // blue shark wearing sneakers
      ctx.fillStyle = '#4a90c2'; // dorsal fin
      ctx.strokeStyle = darken('#4a90c2', 0.6);
      ctx.beginPath();
      ctx.moveTo(-2, -14);
      ctx.quadraticCurveTo(-2, -28, 10, -22);
      ctx.quadraticCurveTo(4, -18, 4, -13);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // body
      ctx.fillStyle = '#4a90c2';
      ctx.beginPath();
      ctx.ellipse(0, -1, 16, 13, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // white belly
      ctx.fillStyle = '#dceefb';
      ctx.beginPath();
      ctx.ellipse(1, 4, 11, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      // teeth grin
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-6, 6); ctx.lineTo(-4, 9) ; ctx.lineTo(-2, 6);
      ctx.lineTo(0, 9); ctx.lineTo(2, 6); ctx.lineTo(4, 9); ctx.lineTo(6, 6);
      ctx.fill(); ctx.stroke();
      // sneakers!
      for (const sx of [-7, 7]) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#c44';
        ctx.lineWidth = 1.5;
        roundRect(ctx, sx - 5, 12, 10, 6, 3);
        ctx.fill(); ctx.stroke();
      }
      eyes(ctx, 0, -6, 6.5, 3.8, 0.5, 0);
      break;
    }
    default: {
      ctx.fillStyle = '#999';
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function mouth(ctx, x, y, w) {
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, w, 0.25 * Math.PI, 0.75 * Math.PI);
  ctx.stroke();
}

// Small portrait for the shop cards.
export function makePortrait(id, size = 56) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  drawCharacter(ctx, id, size / 2, size / 2 + 2, size / 44);
  return c;
}

// ---------------------------------------------------------- projectiles ----

export function drawProjectile(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  switch (p.style) {
    case 'bat':
      ctx.rotate(p.spin);
      ctx.fillStyle = '#c99655';
      ctx.strokeStyle = darken('#c99655', 0.6);
      ctx.lineWidth = 1.5;
      roundRect(ctx, -2.5, -8, 5, 16, 2.5);
      ctx.fill(); ctx.stroke();
      break;
    case 'blade':
      ctx.rotate(p.spin);
      ctx.fillStyle = '#e8e8f0';
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -7); ctx.lineTo(4, 0); ctx.lineTo(0, 7); ctx.lineTo(-4, 0);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      break;
    case 'bomb':
      ctx.fillStyle = '#33333d';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(-2, -2, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'shuriken':
      ctx.rotate(p.spin * 1.5);
      ctx.fillStyle = '#6f4e37';
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(5, 0, 4, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'plasma':
      ctx.fillStyle = 'rgba(120,200,255,0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eaf7ff';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
  }
  ctx.restore();
}

// -------------------------------------------------------------- effects ----

export function drawEffect(ctx, fx) {
  const pct = Math.max(0, fx.life / fx.maxLife);
  ctx.save();
  ctx.globalAlpha = pct;
  if (fx.type === 'pop') {
    // starburst
    ctx.strokeStyle = fx.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    const r = 6 + (1 - pct) * 14;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.moveTo(fx.x + Math.cos(a) * r * 0.4, fx.y + Math.sin(a) * r * 0.4);
      ctx.lineTo(fx.x + Math.cos(a) * r, fx.y + Math.sin(a) * r);
      ctx.stroke();
    }
  } else if (fx.type === 'boom') {
    ctx.strokeStyle = '#ff9f43';
    ctx.fillStyle = 'rgba(255,180,80,0.35)';
    ctx.lineWidth = 4;
    const r = fx.radius * (1 - pct * 0.5);
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (fx.type === 'pulse') {
    ctx.strokeStyle = fx.color || '#9fd6ff';
    ctx.lineWidth = 3;
    const r = fx.radius * (1 - pct);
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
    ctx.stroke();
  } else if (fx.type === 'cash') {
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#c98a00';
    const y = fx.y - (1 - pct) * 22;
    ctx.strokeText(fx.text, fx.x, y);
    ctx.fillText(fx.text, fx.x, y);
  }
  ctx.restore();
}

// ------------------------------------------------------------ placement ----

export function drawGhost(ctx, id, x, y, range, valid) {
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = valid ? 'rgba(120,220,120,0.25)' : 'rgba(230,80,80,0.30)';
  ctx.beginPath();
  ctx.arc(x, y, range, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = valid ? 'rgba(90,190,90,0.9)' : 'rgba(220,60,60,0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();
  drawCharacter(ctx, id, x, y, 1);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

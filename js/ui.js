import { fmt, CAMPAIGN_ROUNDS, SELL_RATIO } from './constants.js';
import { TOWERS, TOWER_ORDER } from './data/towers.js';
import { MAPS, MAP_ORDER, createMap } from './engine/path.js';
import { makePortrait, makeMapThumb } from './render.js';
import { PERKS } from './meta.js';

// DOM sidebar (BTD-style shop on the right) + full-screen overlays
// (main menu with unlock shop, victory, defeat).
export default class UI {
  constructor(game) {
    this.game = game;
    this.sidebar = document.getElementById('sidebar');
    this.overlayRoot = document.getElementById('overlay-root');
    this.portraits = {};
    for (const id of TOWER_ORDER) this.portraits[id] = makePortrait(id);
    this._buildSidebar();
  }

  // --------------------------------------------------------- sidebar ----

  _buildSidebar() {
    this.sidebar.innerHTML = '';

    const title = el('div', 'sb-title', '🧠 BRAINROT TD');
    this.sidebar.appendChild(title);

    this.statsEl = el('div', 'sb-stats');
    this.cashEl = el('div', 'stat cash');
    this.livesEl = el('div', 'stat lives');
    this.roundEl = el('div', 'stat round');
    this.statsEl.append(this.cashEl, this.livesEl, this.roundEl);
    this.sidebar.appendChild(this.statsEl);

    this.shopEl = el('div', 'shop-grid');
    this.sidebar.appendChild(this.shopEl);

    this.infoEl = el('div', 'tower-info hidden');
    this.sidebar.appendChild(this.infoEl);

    const controls = el('div', 'sb-controls');
    this.startBtn = el('button', 'start-btn', 'Start Round');
    this.startBtn.addEventListener('click', () => this.game.startRound());
    this.speedBtn = el('button', 'speed-btn', '▶▶ 1x');
    this.speedBtn.addEventListener('click', () => this.game.toggleSpeed());
    this.muteBtn = el('button', 'mute-btn', this.game.sfx.muted ? '🔇' : '🔊');
    this.muteBtn.title = 'Toggle sound';
    this.muteBtn.addEventListener('click', () => {
      const muted = this.game.sfx.toggleMuted();
      this.muteBtn.textContent = muted ? '🔇' : '🔊';
    });
    controls.append(this.startBtn, this.speedBtn, this.muteBtn);
    this.sidebar.appendChild(controls);

    this.hintEl = el('div', 'sb-hint', 'Click a character, then click the map to place. Right-click cancels. Space starts / speeds up.');
    this.sidebar.appendChild(this.hintEl);

    this.refreshShop();
    this.refresh();
  }

  refreshShop() {
    this.shopEl.innerHTML = '';
    this.shopCards = {};
    for (const id of TOWER_ORDER) {
      if (!this.game.meta.isUnlocked(id)) continue;
      const def = TOWERS[id];
      const card = el('div', 'shop-card');
      card.title = def.desc;
      const canv = this.portraits[id];
      canv.classList.add('portrait');
      card.appendChild(canv);
      card.appendChild(el('div', 'shop-name', def.name));
      card.appendChild(el('div', 'shop-cost', `$${fmt(def.cost)}`));
      card.addEventListener('click', () => {
        if (this.game.cash >= def.cost) this.game.beginPlacing(id);
      });
      this.shopEl.appendChild(card);
      this.shopCards[id] = card;
    }
  }

  refreshStats() {
    this.cashEl.textContent = `🪙 $${fmt(this.game.cash)}`;
    this.livesEl.textContent = `❤️ ${fmt(this.game.lives)}`;
    const current = this.game.round + 1; // the round being played / up next
    this.roundEl.textContent = current > CAMPAIGN_ROUNDS
      ? `🌀 Round ${current} (Freeplay)`
      : `🌊 Round ${current}/${CAMPAIGN_ROUNDS}`;
    // affordability tint
    if (this.shopCards) {
      for (const id of Object.keys(this.shopCards)) {
        this.shopCards[id].classList.toggle('unaffordable', this.game.cash < TOWERS[id].cost);
        this.shopCards[id].classList.toggle('placing', this.game.placingType === id);
      }
    }
  }

  refresh() {
    this.refreshStats();
    this.startBtn.disabled = this.game.roundActive || this.game.state !== 'playing';
    this.startBtn.textContent = this.game.roundActive ? 'Round in progress…' : `Start Round ${this.game.round + 1}`;
    this.speedBtn.textContent = this.game.speedMult === 3 ? '▶▶ 3x' : '▶ 1x';
  }

  // ------------------------------------------------------ tower info ----

  showTowerInfo(tower) {
    if (!tower) {
      this.infoEl.classList.add('hidden');
      this.shopEl.classList.remove('hidden');
      return;
    }
    this.shopEl.classList.add('hidden');
    this.infoEl.classList.remove('hidden');
    this.infoEl.innerHTML = '';

    const head = el('div', 'ti-head');
    const pc = makePortrait(tower.typeId, 48);
    pc.classList.add('portrait');
    head.appendChild(pc);
    head.appendChild(el('div', 'ti-name', tower.def.name));
    this.infoEl.appendChild(head);

    const s = tower.stats;
    const statBits = [];
    if (s.damage > 0) statBits.push(`Dmg ${s.damage}`);
    if (s.pierce > 0 && s.pierce < 900) statBits.push(`Pierce ${s.pierce}`);
    if (s.rate > 0) statBits.push(`${s.rate.toFixed(2)}/s`);
    statBits.push(`Range ${Math.round(s.range)}`);
    if (s.aoeRadius) statBits.push(`Blast ${Math.round(s.aoeRadius)}`);
    if (s.slowPct) statBits.push(`Slow ${Math.round(s.slowPct * 100)}%`);
    if (s.income) statBits.push(`+$${s.income}/round`);
    if (s.moabBonus) statBits.push(`MOAB +${s.moabBonus}`);
    if (s.camoDetect) statBits.push('Camo ✓');
    this.infoEl.appendChild(el('div', 'ti-stats', statBits.join(' · ')));

    for (let p = 0; p < 3; p++) {
      this.infoEl.appendChild(this._buildPathRow(tower, p));
    }

    if (tower.def.attack === 'projectile' || tower.def.attack === 'pulse') {
      const tgt = el('button', 'ti-btn targeting', `Target: ${tower.targeting}`);
      tgt.addEventListener('click', () => {
        tower.cycleTargeting();
        this.showTowerInfo(tower);
      });
      this.infoEl.appendChild(tgt);
    }

    const sell = el('button', 'ti-btn sell', `Sell for $${fmt(tower.sellValue(SELL_RATIO))}`);
    sell.addEventListener('click', () => this.game.sellTower(tower));
    this.infoEl.appendChild(sell);

    const close = el('button', 'ti-btn close', 'Close');
    close.addEventListener('click', () => this.game.selectTower(null));
    this.infoEl.appendChild(close);
  }

  _buildPathRow(tower, pathIdx) {
    const pathDef = tower.def.paths[pathIdx];
    const bought = tower.tiers[pathIdx];
    const row = el('div', 'upgrade-row');

    const dots = [];
    for (let i = 0; i < 3; i++) dots.push(i < bought ? '●' : '○');
    row.appendChild(el('div', 'up-title', `${pathDef.name}  ${dots.join('')}`));

    const next = tower.nextTier(pathIdx);
    if (!next) {
      row.appendChild(el('div', 'up-desc maxed', 'MAXED'));
      return row;
    }
    row.appendChild(el('div', 'up-desc', next.label));

    const btn = el('button', 'up-btn');
    const allowed = tower.canBuyTier(pathIdx);
    if (!allowed) {
      btn.textContent = 'Locked (crosspath rule)';
      btn.disabled = true;
    } else {
      btn.textContent = `Buy — $${fmt(next.cost)}`;
      btn.disabled = this.game.cash < next.cost;
    }
    btn.addEventListener('click', () => this.game.upgradeTower(tower, pathIdx));
    row.appendChild(btn);
    return row;
  }

  // -------------------------------------------------------- overlays ----

  hideOverlays() {
    this.overlayRoot.innerHTML = '';
  }

  showMenu() {
    this.overlayRoot.innerHTML = '';
    const ov = el('div', 'overlay');
    const panel = el('div', 'menu-panel');

    panel.appendChild(el('h1', 'menu-title', '🧠 BRAINROT TD'));
    panel.appendChild(el('div', 'menu-sub', 'Pop the bloons. Protect the meadow. Assemble the brainrot squad.'));
    panel.appendChild(el('div', 'menu-points', `Brainrot Points: ${fmt(this.game.meta.points)} 🧠`));

    // character unlock shop
    panel.appendChild(el('div', 'menu-section-title', 'Characters'));
    const grid = el('div', 'unlock-grid');
    for (const id of TOWER_ORDER) {
      const def = TOWERS[id];
      const unlocked = this.game.meta.isUnlocked(id);
      const card = el('div', `unlock-card${unlocked ? ' unlocked' : ''}`);
      const pc = makePortrait(id, 52);
      pc.classList.add('portrait');
      if (!unlocked) pc.classList.add('locked-img');
      card.appendChild(pc);
      card.appendChild(el('div', 'unlock-name', def.name));
      if (unlocked) {
        card.appendChild(el('div', 'unlock-state', 'Unlocked ✓'));
      } else {
        const btn = el('button', 'unlock-btn', `Unlock — ${def.unlockCost} pts`);
        btn.disabled = this.game.meta.points < def.unlockCost;
        btn.addEventListener('click', () => {
          if (this.game.meta.unlockTower(id)) this.showMenu();
        });
        card.appendChild(btn);
      }
      grid.appendChild(card);
    }
    panel.appendChild(grid);

    // perks
    panel.appendChild(el('div', 'menu-section-title', 'Permanent Perks'));
    const perkGrid = el('div', 'perk-grid');
    for (const key of Object.keys(PERKS)) {
      const def = PERKS[key];
      const lvl = this.game.meta.perks[key];
      const cost = this.game.meta.perkCost(key);
      const card = el('div', 'perk-card');
      card.appendChild(el('div', 'perk-name', def.name));
      card.appendChild(el('div', 'perk-desc', def.desc));
      card.appendChild(el('div', 'perk-lvl', `Level ${lvl}/${def.max}`));
      const btn = el('button', 'unlock-btn');
      if (cost === null) {
        btn.textContent = 'Maxed';
        btn.disabled = true;
      } else {
        btn.textContent = `Buy — ${cost} pts`;
        btn.disabled = this.game.meta.points < cost;
        btn.addEventListener('click', () => {
          if (this.game.meta.buyPerk(key)) this.showMenu();
        });
      }
      card.appendChild(btn);
      perkGrid.appendChild(card);
    }
    panel.appendChild(perkGrid);

    // map select
    panel.appendChild(el('div', 'menu-section-title', 'Map'));
    if (!this.mapThumbs) {
      this.mapThumbs = {};
      for (const id of MAP_ORDER) {
        const m = createMap(id);
        this.mapThumbs[id] = makeMapThumb(m.path, m.theme, 168, 112);
      }
    }
    const mapGrid = el('div', 'map-grid');
    for (const id of MAP_ORDER) {
      const def = MAPS[id];
      const card = el('div', `map-card${this.game.selectedMapId === id ? ' active' : ''}`);
      const thumb = this.mapThumbs[id];
      thumb.classList.add('map-thumb');
      card.appendChild(thumb);
      card.appendChild(el('div', 'map-name', def.name));
      card.appendChild(el('div', `map-diff ${def.difficulty.toLowerCase()}`, def.difficulty));
      card.addEventListener('click', () => {
        this.game.setMap(id);
        this.showMenu();
      });
      mapGrid.appendChild(card);
    }
    panel.appendChild(mapGrid);

    const play = el('button', 'play-btn', '▶ PLAY');
    play.addEventListener('click', () => this.game.startRun());
    panel.appendChild(play);

    const reset = el('button', 'reset-btn', 'Reset all progress');
    reset.addEventListener('click', () => {
      if (confirm('Erase all Brainrot Points, unlocks and perks?')) {
        this.game.meta.reset();
        this.showMenu();
      }
    });
    panel.appendChild(reset);

    ov.appendChild(panel);
    this.overlayRoot.appendChild(ov);
  }

  showVictory() {
    this._showEnd('🏆 VICTORY!', `You survived all ${CAMPAIGN_ROUNDS} rounds!`, true);
  }

  showDefeat() {
    this._showEnd('💀 GAME OVER', `The bloons broke through on round ${this.game.round + 1}.`, false);
  }

  _showEnd(title, msg, victory) {
    this.overlayRoot.innerHTML = '';
    const ov = el('div', 'overlay');
    const panel = el('div', `menu-panel end ${victory ? 'win' : 'lose'}`);
    panel.appendChild(el('h1', 'menu-title', title));
    panel.appendChild(el('div', 'menu-sub', msg));
    panel.appendChild(el('div', 'menu-points',
      `Pops: ${fmt(this.game.xpEarned)} → +${fmt(this.game.earnedPoints || 0)} Brainrot Points 🧠`));

    if (victory) {
      const cont = el('button', 'play-btn', '🌀 Continue Freeplay');
      cont.addEventListener('click', () => this.game.continueFreeplay());
      panel.appendChild(cont);
    }
    const menu = el('button', 'play-btn secondary', 'Back to Menu');
    menu.addEventListener('click', () => {
      this.game._resetRun();
      this.game.state = 'menu';
      this.showMenu();
      this.refreshShop();
      this.refresh();
      this.showTowerInfo(null);
    });
    panel.appendChild(menu);

    ov.appendChild(panel);
    this.overlayRoot.appendChild(ov);
  }
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

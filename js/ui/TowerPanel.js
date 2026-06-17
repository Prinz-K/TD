import { formatNumber } from '../constants.js';
import { TOWER_TYPES } from '../entities/TowerTypes.js';

// Builds the Tower Info Panel (right side, when a placed tower is selected)
// and the Tower Buy Panel (popup near a clicked empty buildable tile).
export default class TowerPanel {
  constructor(root, callbacks) {
    this.root = root;
    this.callbacks = callbacks;
    this._buildInfoPanel();
    this._buildBuyPanel();
  }

  _buildInfoPanel() {
    this.infoPanel = document.createElement('div');
    this.infoPanel.className = 'tower-info-panel hidden';
    this.root.appendChild(this.infoPanel);
  }

  _buildBuyPanel() {
    this.buyPanel = document.createElement('div');
    this.buyPanel.className = 'tower-buy-panel hidden';
    this.root.appendChild(this.buyPanel);
  }

  showBuyPanel(px, py, gridX, gridY, cpu, unlockedTypes) {
    this.buyPanel.innerHTML = '';
    this.buyPanel.classList.remove('hidden');

    const left = Math.min(px, 1344 - 220);
    const top = Math.min(py, 864 - 160);
    this.buyPanel.style.left = `${left}px`;
    this.buyPanel.style.top = `${top}px`;

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = 'Build Tower';
    this.buyPanel.appendChild(title);

    for (const typeId of unlockedTypes) {
      const def = TOWER_TYPES[typeId];
      const btn = document.createElement('button');
      btn.className = 'buy-tower-btn';
      btn.style.borderColor = def.color;
      btn.innerHTML = `<span class="swatch" style="background:${def.color}"></span> ${def.name} <span class="cost">${def.cost} CPU</span>`;
      btn.disabled = cpu < def.cost;
      btn.addEventListener('click', () => this.callbacks.onBuyTower(typeId, gridX, gridY));
      this.buyPanel.appendChild(btn);
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'panel-close-btn';
    closeBtn.textContent = 'Cancel';
    closeBtn.addEventListener('click', () => this.callbacks.onCloseBuyPanel());
    this.buyPanel.appendChild(closeBtn);
  }

  hideBuyPanel() {
    this.buyPanel.classList.add('hidden');
  }

  showInfoPanel(tower, cpu) {
    this.infoPanel.innerHTML = '';
    this.infoPanel.classList.remove('hidden');

    const header = document.createElement('div');
    header.className = 'panel-title';
    header.innerHTML = `<span class="swatch" style="background:${tower.def.color}"></span> ${tower.def.name}`;
    this.infoPanel.appendChild(header);

    const stats = document.createElement('div');
    stats.className = 'tower-stats';
    let statsHtml = '';
    statsHtml += `<div>Damage: ${tower.damage.toFixed(0)}</div>`;
    statsHtml += `<div>Range: ${tower.range.toFixed(0)}</div>`;
    statsHtml += `<div>Attack Speed: ${tower.attackSpeed.toFixed(2)}/s</div>`;
    if (tower.def.type === 'chain') {
      statsHtml += `<div>Chains: ${tower.chains}</div>`;
      if (tower.stun) statsHtml += `<div>Stun: ${tower.stun}s</div>`;
      if (tower.burstDamage) statsHtml += `<div>Burst: ${tower.burstDamage} dmg (r${tower.burstRadius})</div>`;
    }
    if (tower.def.type === 'single') {
      if (tower.armorPierce) statsHtml += `<div>Armor Pierce: ${tower.armorPierce}</div>`;
      if (tower.fullArmorIgnore) statsHtml += `<div>Full Armor Ignore</div>`;
      if (tower.slowPct) statsHtml += `<div>Slow: ${(tower.slowPct * 100).toFixed(0)}% / ${tower.slowDuration}s</div>`;
      if (tower.shockwaveRadius) statsHtml += `<div>Shockwave on kill: ${tower.shockwaveDamage} (r${tower.shockwaveRadius})</div>`;
    }
    if (tower.def.type === 'support') {
      statsHtml += `<div>Dmg Buff: +${(tower.outDamageBuffPct * 100).toFixed(0)}%</div>`;
      statsHtml += `<div>Atk Spd Buff: +${(tower.outAtkSpeedBuffPct * 100).toFixed(0)}%</div>`;
      if (tower.enemySlowPct) statsHtml += `<div>Enemy Slow: ${(tower.enemySlowPct * 100).toFixed(0)}%</div>`;
      if (tower.shieldBonus) statsHtml += `<div>Shield Bonus: +${tower.shieldBonus} HP</div>`;
      if (tower.killBonusCpu) statsHtml += `<div>Kill bonus: +${tower.killBonusCpu} CPU</div>`;
    }
    if (tower.shieldHp > 0) statsHtml += `<div>Shield HP: ${tower.shieldHp}</div>`;
    stats.innerHTML = statsHtml;
    this.infoPanel.appendChild(stats);

    this.infoPanel.appendChild(this._buildPathSection(tower, 'A', cpu));
    this.infoPanel.appendChild(this._buildPathSection(tower, 'B', cpu));

    const targetingBtn = document.createElement('button');
    targetingBtn.className = 'targeting-btn';
    targetingBtn.textContent = `Target: ${tower.targetingMode}`;
    targetingBtn.addEventListener('click', () => this.callbacks.onCycleTargeting(tower.id));
    this.infoPanel.appendChild(targetingBtn);

    const sellBtn = document.createElement('button');
    sellBtn.className = 'sell-btn';
    sellBtn.textContent = `Sell: ${tower.getSellValue()} CPU`;
    sellBtn.addEventListener('click', () => this.callbacks.onSellTower(tower.id));
    this.infoPanel.appendChild(sellBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'panel-close-btn';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => this.callbacks.onCloseInfoPanel());
    this.infoPanel.appendChild(closeBtn);
  }

  _buildPathSection(tower, path, cpu) {
    const pathDef = path === 'A' ? tower.def.pathA : tower.def.pathB;
    const section = document.createElement('div');
    section.className = 'upgrade-path';

    const tier = tower.upgrades.getCurrentTier(path);
    const maxTier = tower.upgrades.getMaxTierAvailable(path);
    const nextDef = tower.upgrades.getNextTierDef(path);
    const blocked = tower.upgrades.isBlockedByBTDRule(path);

    let html = `<div class="path-title">${pathDef.name} (Path ${path}) — Tier ${tier}/${maxTier}</div>`;
    if (nextDef) {
      html += `<div class="path-next">${nextDef.label} — ${nextDef.cost} CPU</div>`;
    } else {
      html += `<div class="path-next">Maxed</div>`;
    }
    section.innerHTML = html;

    const btn = document.createElement('button');
    btn.className = 'upgrade-btn';
    if (!nextDef) {
      btn.textContent = 'Maxed';
      btn.disabled = true;
    } else if (blocked) {
      btn.textContent = 'Blocked (other path)';
      btn.disabled = true;
      btn.classList.add('blocked');
    } else if (cpu < nextDef.cost) {
      btn.textContent = `Upgrade ${path} (need ${nextDef.cost} CPU)`;
      btn.disabled = true;
    } else {
      btn.textContent = `Upgrade ${path}`;
      btn.disabled = false;
    }
    btn.addEventListener('click', () => this.callbacks.onUpgrade(tower.id, path));
    section.appendChild(btn);

    return section;
  }

  hideInfoPanel() {
    this.infoPanel.classList.add('hidden');
  }
}

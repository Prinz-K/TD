import { formatNumber } from '../constants.js';
import MetaProgression from '../roguelite/MetaProgression.js';
import { ENEMY_TYPES } from '../entities/EnemyTypes.js';

// Full-screen DOM overlay shown between waves (meta shop, wave preview,
// crate button, start wave) plus Game Over / Victory overlays.
export default class PrepScreen {
  constructor(root, callbacks) {
    this.root = root;
    this.callbacks = callbacks;
    this._buildPrep();
    this._buildEndOverlay();
  }

  _buildPrep() {
    this.prepEl = document.createElement('div');
    this.prepEl.className = 'prep-overlay hidden';
    this.root.appendChild(this.prepEl);
  }

  _buildEndOverlay() {
    this.endEl = document.createElement('div');
    this.endEl.className = 'end-overlay hidden';
    this.root.appendChild(this.endEl);
  }

  showPrep(data) {
    const { waveNumber, composition, meta, crateAvailable, endless } = data;
    this.prepEl.classList.remove('hidden');
    this.prepEl.innerHTML = '';

    const panel = document.createElement('div');
    panel.className = 'prep-panel';

    const title = document.createElement('h1');
    title.className = 'prep-title';
    title.textContent = endless ? `Endless Wave ${waveNumber} Incoming` : `Wave ${waveNumber} Incoming`;
    panel.appendChild(title);

    const preview = document.createElement('div');
    preview.className = 'wave-preview';
    const typeMap = { speedUnit: 'SpeedUnit', tank: 'Tank', camo: 'Camo', trojan: 'TrojanCarrier', boss: 'Boss' };
    for (const key of Object.keys(typeMap)) {
      if (!composition[key]) continue;
      const def = ENEMY_TYPES[typeMap[key]];
      const chip = document.createElement('div');
      chip.className = 'enemy-chip';
      chip.innerHTML = `<span class="swatch" style="background:${def.color}"></span> ${def.name} x${composition[key]}`;
      preview.appendChild(chip);
    }
    panel.appendChild(preview);

    if (crateAvailable) {
      const crateBtn = document.createElement('button');
      crateBtn.className = 'crate-btn';
      crateBtn.textContent = '🎁 Open Brainrot Box!';
      crateBtn.addEventListener('click', () => {
        const resultText = this.callbacks.onOpenCrate();
        crateBtn.disabled = true;
        crateBtn.textContent = resultText || 'Box opened!';
      });
      panel.appendChild(crateBtn);
    }

    panel.appendChild(this._buildShop(meta));

    const startBtn = document.createElement('button');
    startBtn.className = 'start-wave-btn';
    startBtn.textContent = 'Start Wave';
    startBtn.addEventListener('click', () => this.callbacks.onStartWave());
    panel.appendChild(startBtn);

    const resetBtn = document.createElement('button');
    resetBtn.className = 'reset-progress-btn';
    resetBtn.textContent = 'Reset Progress';
    resetBtn.addEventListener('click', () => {
      if (confirm('This will permanently erase all meta-progression (Rizz and upgrades). Continue?')) {
        this.callbacks.onResetProgress();
      }
    });
    panel.appendChild(resetBtn);

    this.prepEl.appendChild(panel);
  }

  _buildShop(meta) {
    const shop = document.createElement('div');
    shop.className = 'meta-shop';

    const tpHeader = document.createElement('div');
    tpHeader.className = 'tp-header';
    tpHeader.textContent = `🧠 Rizz: ${formatNumber(meta.techPoints)}`;
    shop.appendChild(tpHeader);

    const grid = document.createElement('div');
    grid.className = 'shop-grid';

    for (const key of Object.keys(MetaProgression.defs)) {
      const def = MetaProgression.defs[key];
      const level = meta.levels[key];
      const cost = meta.getNextCost(key);

      const card = document.createElement('div');
      card.className = 'shop-card';
      card.innerHTML = `
        <div class="shop-card-title">${def.label}</div>
        <div class="shop-card-desc">${def.desc}</div>
        <div class="shop-card-level">Level ${level}/${def.max}</div>
      `;

      const btn = document.createElement('button');
      btn.className = 'shop-buy-btn';
      if (cost === null) {
        btn.textContent = 'Maxed';
        btn.disabled = true;
      } else {
        btn.textContent = `Buy (${cost} Rizz)`;
        btn.disabled = meta.techPoints < cost;
      }
      btn.addEventListener('click', () => this.callbacks.onPurchaseMeta(key));
      card.appendChild(btn);
      grid.appendChild(card);
    }

    shop.appendChild(grid);
    return shop;
  }

  hidePrep() {
    this.prepEl.classList.add('hidden');
  }

  showEnd(data) {
    const { type, wave, kills, techPointsEarned, endlessAvailable } = data;
    this.endEl.classList.remove('hidden');
    this.endEl.innerHTML = '';

    const panel = document.createElement('div');
    panel.className = `end-panel ${type === 'victory' ? 'victory' : 'gameover'}`;

    const title = document.createElement('h1');
    title.textContent = type === 'victory' ? 'VICTORY' : 'GAME OVER';
    panel.appendChild(title);

    const stats = document.createElement('div');
    stats.className = 'end-stats';
    stats.innerHTML = `
      <div>Wave Reached: ${wave}</div>
      <div>Total Kills: ${kills}</div>
      <div>Rizz Earned: ${techPointsEarned}</div>
    `;
    panel.appendChild(stats);

    if (type === 'victory' && endlessAvailable) {
      const continueBtn = document.createElement('button');
      continueBtn.className = 'continue-btn';
      continueBtn.textContent = 'Continue to Endless';
      continueBtn.addEventListener('click', () => this.callbacks.onContinueEndless());
      panel.appendChild(continueBtn);

      const stopBtn = document.createElement('button');
      stopBtn.className = 'restart-btn';
      stopBtn.textContent = 'Stop Here (Restart)';
      stopBtn.addEventListener('click', () => this.callbacks.onRestart());
      panel.appendChild(stopBtn);
    } else {
      const restartBtn = document.createElement('button');
      restartBtn.className = 'restart-btn';
      restartBtn.textContent = 'Restart';
      restartBtn.addEventListener('click', () => this.callbacks.onRestart());
      panel.appendChild(restartBtn);
    }

    this.endEl.appendChild(panel);
  }

  hideEnd() {
    this.endEl.classList.add('hidden');
  }
}

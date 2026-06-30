import { formatNumber } from '../constants.js';

// Builds and updates the always-visible top bar + hero ability buttons +
// game speed toggle. All elements are DOM, absolutely positioned children
// of #ui-overlay so they remain clickable above the canvases.
export default class HUD {
  constructor(root, callbacks) {
    this.root = root;
    this.callbacks = callbacks;
    this._build();
  }

  _build() {
    this.container = document.createElement('div');
    this.container.className = 'hud-bar';

    this.cpuEl = document.createElement('div');
    this.cpuEl.className = 'hud-cpu';
    this.container.appendChild(this.cpuEl);

    this.waveEl = document.createElement('div');
    this.waveEl.className = 'hud-wave';
    this.container.appendChild(this.waveEl);

    this.coreEl = document.createElement('div');
    this.coreEl.className = 'hud-core';
    this.container.appendChild(this.coreEl);

    this.root.appendChild(this.container);

    // Speed toggle (top-right)
    this.speedBtn = document.createElement('button');
    this.speedBtn.className = 'hud-speed-btn';
    this.speedBtn.textContent = '1x';
    this.speedBtn.addEventListener('click', () => this.callbacks.onToggleSpeed());
    this.root.appendChild(this.speedBtn);

    // Hero ability buttons (bottom-left)
    this.abilityBar = document.createElement('div');
    this.abilityBar.className = 'hero-ability-bar';

    this.empBtn = document.createElement('button');
    this.empBtn.className = 'ability-btn ability-emp';
    this.empBtn.addEventListener('click', () => this.callbacks.onEmp());
    this.abilityBar.appendChild(this.empBtn);

    this.purgeBtn = document.createElement('button');
    this.purgeBtn.className = 'ability-btn ability-purge';
    this.purgeBtn.addEventListener('click', () => this.callbacks.onPurge());
    this.abilityBar.appendChild(this.purgeBtn);

    this.root.appendChild(this.abilityBar);
  }

  update(state) {
    this.cpuEl.textContent = `🪙 ${formatNumber(state.cpu)} Lira`;

    if (state.endless) {
      this.waveEl.textContent = `Endless Wave ${state.wave}`;
    } else {
      this.waveEl.textContent = `Wave ${state.wave} / 10`;
    }

    if (state.coreMaxHp <= 10) {
      this.coreEl.textContent = '❤'.repeat(Math.max(0, state.coreHp));
      this.coreEl.title = `Base HP: ${state.coreHp}/${state.coreMaxHp}`;
    } else {
      this.coreEl.textContent = `HP: ${state.coreHp}`;
    }

    this.speedBtn.textContent = state.gameSpeed === 2 ? '2x' : '1x';

    if (state.empCooldown > 0) {
      this.empBtn.textContent = `🧠 Blast ${state.empCooldown.toFixed(1)}s`;
      this.empBtn.disabled = true;
    } else {
      this.empBtn.textContent = '🧠 Brain Blast (E)';
      this.empBtn.disabled = false;
    }

    if (state.purgeCooldown > 0) {
      this.purgeBtn.textContent = `👁 Reveal ${state.purgeCooldown.toFixed(1)}s`;
      this.purgeBtn.disabled = true;
    } else {
      this.purgeBtn.textContent = '👁 Skibidi Reveal (Q)';
      this.purgeBtn.disabled = false;
    }
  }

  setVisible(visible) {
    this.container.style.display = visible ? 'flex' : 'none';
    this.speedBtn.style.display = visible ? 'block' : 'none';
    this.abilityBar.style.display = visible ? 'flex' : 'none';
  }
}

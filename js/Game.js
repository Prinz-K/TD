import { CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE, START_CPU, CORE_START_HP } from './constants.js';
import EventBus from './core/EventBus.js';
import InputManager from './core/InputManager.js';
import { createMainframeDelta } from './map/MapData.js';
import Grid from './map/Grid.js';
import PathManager from './map/PathManager.js';
import Hero from './entities/Hero.js';
import Renderer from './rendering/Renderer.js';
import WaveManager from './systems/WaveManager.js';
import CombatSystem from './systems/CombatSystem.js';
import EconomyManager from './systems/EconomyManager.js';
import TowerManager from './systems/TowerManager.js';
import EffectsSystem from './systems/EffectsSystem.js';
import MetaProgression from './roguelite/MetaProgression.js';
import RunState from './roguelite/RunState.js';
import CrateSystem from './roguelite/CrateSystem.js';
import HUD from './ui/HUD.js';
import TowerPanel from './ui/TowerPanel.js';
import PrepScreen from './ui/PrepScreen.js';
import { TOWER_TYPES } from './entities/TowerTypes.js';

const TOWER_TYPE_LIST = ['PulseEmitter', 'CompilerCannon', 'FirewallBeacon'];

// Top-level game orchestrator: owns the fixed-timestep loop and wires
// systems, entities, and UI together.
export default class Game {
  constructor() {
    this.container = document.getElementById('game-container');
    this.canvases = {
      map: document.getElementById('layer-map'),
      entities: document.getElementById('layer-entities'),
      effects: document.getElementById('layer-effects'),
    };
    for (const c of Object.values(this.canvases)) {
      c.width = CANVAS_WIDTH;
      c.height = CANVAS_HEIGHT;
    }
    this.uiRoot = document.getElementById('ui-overlay');

    this.bus = new EventBus();
    this.input = new InputManager(this.container);

    this.mapData = createMainframeDelta();
    this.grid = new Grid(this.mapData);
    this.pathManager = new PathManager(this.mapData);

    this.renderer = new Renderer(this.canvases, this.grid);

    this.meta = new MetaProgression();
    this.economy = new EconomyManager(START_CPU + this.meta.getStartCpuBonus());
    this.towerManager = new TowerManager(this.grid, this.bus);
    this.towerManager.damageBoostPct = this.meta.getTowerDamageBoostPct();
    this.towerManager.compilerMasteryBonus = this.meta.getCompilerMasteryBonus();

    this.waveManager = new WaveManager();
    this.combatSystem = new CombatSystem(this.bus);
    this.effectsSystem = new EffectsSystem(this.bus);
    this.crateSystem = new CrateSystem(this.bus);

    this.runState = new RunState(this.meta.getStartCpuBonus());
    this.runState.coreHp = CORE_START_HP;
    this.runState.coreMaxHp = CORE_START_HP;

    const heroStart = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
    this.hero = new Hero(heroStart.x, heroStart.y);
    this.hero.applyMetaModifiers({
      passiveScan: this.meta.hasPassiveScan(),
      heroAbilityCdLevel: this.meta.getHeroAbilityCdLevel(),
    });

    this.enemies = [];
    this.selectedTowerId = null;
    this.buyPanelTile = null;
    this.waveCompleteTimer = null;
    this.pendingCrateForThisPrep = false;
    this.bossKilledThisWave = false;

    this._buildUI();
    this._bindInput();
    this._bindEvents();

    this.lastTime = performance.now();
    this.accumulator = 0;
    this.STEP = 1 / 60;

    this._showPrepScreen();
    requestAnimationFrame((t) => this._loop(t));
  }

  _buildUI() {
    this.hud = new HUD(this.uiRoot, {
      onToggleSpeed: () => this._toggleSpeed(),
      onEmp: () => this._tryUseEmp(),
      onPurge: () => this._tryUsePurge(),
    });

    this.towerPanel = new TowerPanel(this.uiRoot, {
      onBuyTower: (typeId, gx, gy) => this._buyTower(typeId, gx, gy),
      onCloseBuyPanel: () => this._closeBuyPanel(),
      onUpgrade: (towerId, path) => this._upgradeTower(towerId, path),
      onSellTower: (towerId) => this._sellTower(towerId),
      onCycleTargeting: (towerId) => this._cycleTargeting(towerId),
      onCloseInfoPanel: () => this._deselectTower(),
    });

    this.prepScreen = new PrepScreen(this.uiRoot, {
      onStartWave: () => this._startWaveFromPrep(),
      onPurchaseMeta: (key) => this._purchaseMeta(key),
      onOpenCrate: () => this._openCrate(),
      onResetProgress: () => this._resetProgress(),
      onContinueEndless: () => this._continueEndless(),
      onRestart: () => this._restart(),
    });
  }

  _bindInput() {
    this.input.onClick((x, y) => this._handleCanvasClick(x, y));
    this.input.onKeyPress('e', () => this._tryUseEmp());
    this.input.onKeyPress('q', () => this._tryUsePurge());

    this.container.addEventListener('mousemove', (e) => {
      const rect = this.container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const tile = this.grid.worldToGrid(x, y);
      if (this.grid.inBounds(tile.x, tile.y)) {
        this.renderer.mapRenderer.setHover(tile.x, tile.y);
        this.renderer.markMapDirty();
      }
    });
  }

  _bindEvents() {
    this.bus.on('enemyHit', () => {});
  }

  // ---------------- Input handling ----------------

  _handleCanvasClick(x, y) {
    if (this.runState.phase !== 'wave') return; // ignore clicks during prep/end overlays
    const tile = this.grid.worldToGrid(x, y);
    if (!this.grid.inBounds(tile.x, tile.y)) {
      this._deselectTower();
      this._closeBuyPanel();
      return;
    }

    const occupantId = this.grid.getOccupant(tile.x, tile.y);
    if (occupantId) {
      this._selectTower(occupantId);
      this._closeBuyPanel();
      return;
    }

    if (this.grid.isBuildable(tile.x, tile.y)) {
      this._deselectTower();
      this.buyPanelTile = tile;
      this.towerPanel.showBuyPanel(x, y, tile.x, tile.y, this.economy.cpu, TOWER_TYPE_LIST);
      return;
    }

    // path or no-build tile clicked: deselect/close
    this._deselectTower();
    this._closeBuyPanel();
  }

  _selectTower(towerId) {
    this.selectedTowerId = towerId;
    this._refreshInfoPanel();
  }

  _deselectTower() {
    this.selectedTowerId = null;
    this.towerPanel.hideInfoPanel();
  }

  _refreshInfoPanel() {
    if (!this.selectedTowerId) return;
    const tower = this.towerManager.towers.find((t) => t.id === this.selectedTowerId);
    if (!tower) {
      this._deselectTower();
      return;
    }
    this.towerPanel.showInfoPanel(tower, this.economy.cpu);
  }

  _closeBuyPanel() {
    this.buyPanelTile = null;
    this.towerPanel.hideBuyPanel();
  }

  _buyTower(typeId, gx, gy) {
    const cost = this._getTowerCost(typeId);
    if (this.economy.cpu < cost) return;
    if (!this.grid.isBuildable(gx, gy)) return;
    this.economy.spend(cost);
    const tower = this.towerManager.placeTower(typeId, gx, gy);
    this.renderer.markMapDirty();
    this._closeBuyPanel();
    if (tower) this._selectTower(tower.id);
  }

  _getTowerCost(typeId) {
    const def = TOWER_TYPES[typeId];
    return def ? def.cost : 0;
  }

  _upgradeTower(towerId, path) {
    const tower = this.towerManager.towers.find((t) => t.id === towerId);
    if (!tower) return;
    const result = tower.trySpendUpgrade(path, this.economy.cpu);
    if (result.success) {
      this.economy.spend(result.cost);
      this.towerManager.recomputeBuffs();
      this._refreshInfoPanel();
    }
  }

  _sellTower(towerId) {
    const tower = this.towerManager.towers.find((t) => t.id === towerId);
    if (!tower) return;
    const value = tower.getSellValue();
    this.towerManager.removeTower(towerId);
    this.economy.add(value);
    this.renderer.markMapDirty();
    this._deselectTower();
  }

  _cycleTargeting(towerId) {
    const tower = this.towerManager.towers.find((t) => t.id === towerId);
    if (!tower) return;
    tower.cycleTargetingMode();
    this._refreshInfoPanel();
  }

  _toggleSpeed() {
    this.runState.gameSpeed = this.runState.gameSpeed === 1 ? 2 : 1;
  }

  _tryUseEmp() {
    if (this.runState.phase !== 'wave') return;
    if (this.hero.useEmp()) {
      this.combatSystem.applyEmpBurst(this.hero, this.enemies);
    }
  }

  _tryUsePurge() {
    if (this.runState.phase !== 'wave') return;
    if (this.hero.usePurge()) {
      this.combatSystem.applyPurge(this.hero, this.enemies);
    }
  }

  // ---------------- Wave / Prep flow ----------------

  _showPrepScreen() {
    this.runState.phase = 'prep';
    this.hud.setVisible(false);
    const waveNumber = this.runState.wave;
    const composition = this.waveManager.getWaveComposition(waveNumber);
    const endless = waveNumber > 10;
    this.pendingCrateForThisPrep = this.runState.pendingCrate;
    this.prepScreen.showPrep({
      waveNumber,
      composition,
      meta: this.meta,
      crateAvailable: this.runState.pendingCrate,
      endless,
    });
  }

  _startWaveFromPrep() {
    this.runState.pendingCrate = false;
    this.prepScreen.hidePrep();
    this.hud.setVisible(true);
    this.runState.phase = 'wave';
    this.bossKilledThisWave = false;
    this.waveManager.startWave(this.runState.wave);
  }

  _purchaseMeta(key) {
    if (this.meta.purchase(key)) {
      // Re-render shop with updated levels/cost.
      this._showPrepScreen();
    }
  }

  _openCrate() {
    return this.crateSystem.openCrate(this.towerManager, this.economy, this.hero);
  }

  _resetProgress() {
    this.meta.reset();
    this._showPrepScreen();
  }

  _continueEndless() {
    this.runState.endlessMode = true;
    this.prepScreen.hideEnd();
    this.runState.wave += 1;
    this._showPrepScreen();
  }

  _restart() {
    this.prepScreen.hideEnd();
    this.economy.cpu = START_CPU + this.meta.getStartCpuBonus();
    this.towerManager.towers = [];
    for (let y = 0; y < this.grid.occupancy.length; y++) {
      this.grid.occupancy[y].fill(null);
    }
    this.enemies = [];
    this.combatSystem.projectiles = [];
    this.renderer.markMapDirty();
    this.hero.x = CANVAS_WIDTH / 2;
    this.hero.y = CANVAS_HEIGHT / 2;
    this.hero.empRadius = 150;
    this.hero.empCooldown = 0;
    this.hero.purgeCooldown = 0;

    this.runState = new RunState(this.meta.getStartCpuBonus());
    this.runState.coreHp = CORE_START_HP;
    this.runState.coreMaxHp = CORE_START_HP;
    this._deselectTower();
    this._closeBuyPanel();
    this._showPrepScreen();
  }

  // ---------------- Main loop ----------------

  _loop(now) {
    let frameDelta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    frameDelta = Math.min(frameDelta, 0.1); // cap at 100ms to avoid spiral-of-death

    this.accumulator += frameDelta * this.runState.gameSpeed;
    while (this.accumulator >= this.STEP) {
      this._update(this.STEP);
      this.accumulator -= this.STEP;
    }

    this._render();
    requestAnimationFrame((t) => this._loop(t));
  }

  _update(dt) {
    if (this.runState.phase !== 'wave') return;

    this._updateHero(dt);
    this._updateEnemies(dt);
    this._updateTowers(dt);
    this.combatSystem.updateProjectiles(dt);
    this.effectsSystem.update(dt);
    this.towerManager.applyEnemySlowFromBeacons(this.enemies);

    this._checkWaveCompletion(dt);
    this._refreshHud();
    if (this.selectedTowerId) this._refreshInfoPanel();
  }

  _updateHero(dt) {
    let dx = 0;
    let dy = 0;
    if (this.input.isDown('w')) dy -= 1;
    if (this.input.isDown('s')) dy += 1;
    if (this.input.isDown('a')) dx -= 1;
    if (this.input.isDown('d')) dx += 1;
    this.hero.move(dx, dy, dt);
    this.hero.updateTrail();
    this.hero.updateCooldowns(dt);

    this.combatSystem.updateHero(this.hero, dt, this.enemies, (enemy) => this._onEnemyKilled(enemy));
  }

  _updateEnemies(dt) {
    const spawned = this.waveManager.update(dt);
    for (const enemy of spawned) {
      const start = this.pathManager.getStartPoint();
      enemy.x = start.x;
      enemy.y = start.y;
      this.enemies.push(enemy);
    }

    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.reachedCore) continue;
      enemy.updateStatusEffects(dt);
      // passive scan transient detection flag for rendering
      enemy._renderDetected = enemy.detectedPermanently || this.hero.canDetect(enemy);

      if (enemy.isStunned()) continue;
      const slowMult = enemy.getSlowMultiplier();
      enemy.distanceTraveled += enemy.speed * slowMult * dt;
      const pos = this.pathManager.getPositionAtDistance(enemy.distanceTraveled);
      enemy.x = pos.x;
      enemy.y = pos.y;
      if (pos.reachedEnd) {
        enemy.reachedCore = true;
        this._onEnemyReachedCore(enemy);
      }
    }

    // Remove dead/reached-core enemies after processing (dead ones already
    // triggered rewards via onKill callbacks in CombatSystem).
    this.enemies = this.enemies.filter((e) => e.alive && !e.reachedCore);
  }

  _updateTowers(dt) {
    for (const tower of this.towerManager.towers) {
      this.combatSystem.updateTower(tower, dt, this.enemies, this.hero, (enemy) => this._onEnemyKilled(enemy, tower));
    }
  }

  _onEnemyKilled(enemy, sourceTower) {
    if (!enemy._rewardGiven) {
      enemy._rewardGiven = true;
      this.economy.add(enemy.reward);
      this.runState.kills += 1;
      this.bus.emit('enemyDeath', { x: enemy.x, y: enemy.y, color: enemy.color });

      if (enemy.isBoss) {
        this.bossKilledThisWave = true;
      }

      if (enemy.splitsOnDeath) {
        this._spawnTrojanSplits(enemy);
      }

      // FirewallBeacon "on tower kill: +50 CPU bonus" — applies to beacons
      // that have purchased that path-B tier, when a tower they buffed gets a kill.
      if (sourceTower) {
        const beacons = this.towerManager.towers.filter((t) => t.def.type === 'support' && t.killBonusCpu > 0);
        for (const beacon of beacons) {
          const dist = Math.hypot(beacon.x - sourceTower.x, beacon.y - sourceTower.y);
          if (dist <= beacon.range) {
            this.economy.add(beacon.killBonusCpu);
          }
        }
      }
    }
  }

  _spawnTrojanSplits(enemy) {
    // Spawn 3 SpeedUnits at the Trojan's death position, continuing along
    // the path from the same distanceTraveled, with reduced reward (5 CPU
    // each) to avoid economy abuse from chain-splitting.
    for (let i = 0; i < 3; i++) {
      const split = new (enemy.constructor)('SpeedUnit', 1, 1);
      split.reward = 5;
      split.distanceTraveled = Math.max(0, enemy.distanceTraveled - i * 6);
      const pos = this.pathManager.getPositionAtDistance(split.distanceTraveled);
      split.x = pos.x;
      split.y = pos.y;
      this.enemies.push(split);
    }
  }

  _onEnemyReachedCore(enemy) {
    const dead = this.runState.damageCore(1);
    if (dead) {
      this._triggerGameOver();
    }
  }

  _checkWaveCompletion(dt) {
    if (this.waveCompleteTimer !== null) {
      this.waveCompleteTimer -= dt;
      if (this.waveCompleteTimer <= 0) {
        this.waveCompleteTimer = null;
        this._onWaveCleared();
      }
      return;
    }

    if (this.waveManager.allSpawned && this.enemies.length === 0 && this.runState.phase === 'wave') {
      this.waveCompleteTimer = 2.0; // auto-transition to Prep after 2s delay
    }
  }

  _onWaveCleared() {
    const waveNumber = this.runState.wave;
    let tpEarned = 10;
    if (this.bossKilledThisWave) tpEarned += 50;
    this.meta.addTechPoints(tpEarned);
    this.runState.techPointsEarnedThisRun += tpEarned;

    const crateFromSchedule = this.waveManager.hasCrateReward(waveNumber);
    const crateFromBoss = this.bossKilledThisWave;
    if (crateFromSchedule || crateFromBoss) {
      this.runState.pendingCrate = true;
    }

    if (waveNumber === 10 && !this.runState.endlessMode) {
      this._triggerVictory();
      return;
    }

    this.runState.wave += 1;
    this.runState.phase = 'prep';
    this._showPrepScreen();
  }

  _triggerGameOver() {
    this.runState.phase = 'gameover';
    this.hud.setVisible(false);
    this.prepScreen.showEnd({
      type: 'gameover',
      wave: this.runState.wave,
      kills: this.runState.kills,
      techPointsEarned: this.runState.techPointsEarnedThisRun,
      endlessAvailable: false,
    });
  }

  _triggerVictory() {
    this.runState.phase = 'victory';
    this.hud.setVisible(false);
    this.prepScreen.showEnd({
      type: 'victory',
      wave: this.runState.wave,
      kills: this.runState.kills,
      techPointsEarned: this.runState.techPointsEarnedThisRun,
      endlessAvailable: true,
    });
  }

  _refreshHud() {
    this.hud.update({
      cpu: this.economy.cpu,
      wave: this.runState.wave,
      endless: this.runState.wave > 10,
      coreHp: this.runState.coreHp,
      coreMaxHp: this.runState.coreMaxHp,
      gameSpeed: this.runState.gameSpeed,
      empCooldown: Math.max(0, this.hero.empCooldown),
      purgeCooldown: Math.max(0, this.hero.purgeCooldown),
    });
  }

  // ---------------- Rendering ----------------

  _render() {
    this.renderer.drawFrame(
      this.towerManager.towers,
      this.enemies,
      this.runState.phase === 'wave' ? this.hero : null,
      this.combatSystem.projectiles,
      this.effectsSystem,
      this.selectedTowerId,
    );
  }
}

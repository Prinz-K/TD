import Enemy from '../entities/Enemy.js';

// Defines the 10-wave campaign and endless scaling, and handles timed
// spawning of enemy groups within a wave.
const CAMPAIGN_WAVES = [
  { speedUnit: 8 },
  { speedUnit: 10, tank: 2 },
  { speedUnit: 12, tank: 3, crate: true },
  { speedUnit: 8, camo: 5 },
  { speedUnit: 10, tank: 4, camo: 4 },
  { speedUnit: 15, tank: 3, trojan: 3, crate: true },
  { speedUnit: 10, camo: 5, trojan: 3 },
  { tank: 5, trojan: 5, camo: 8 },
  { speedUnit: 20, tank: 8, trojan: 5, crate: true },
  { boss: 1, speedUnit: 10, tank: 5 },
];

const GROUP_TYPE_MAP = {
  speedUnit: 'SpeedUnit',
  tank: 'Tank',
  camo: 'Camo',
  trojan: 'TrojanCarrier',
  boss: 'Boss',
};

const SPAWN_INTERVAL = 0.8; // seconds between individual spawns
const GROUP_OFFSET = 1.0; // seconds delay before each subsequent group starts

export default class WaveManager {
  constructor() {
    this.currentWave = 0; // 1-indexed once started
    this.spawnQueue = []; // [{typeId, spawnAt}] sorted by spawnAt
    this.elapsed = 0;
    this.spawning = false;
    this.allSpawned = false;
  }

  getWaveComposition(waveNumber) {
    if (waveNumber <= 10) {
      return CAMPAIGN_WAVES[waveNumber - 1];
    }
    // Endless: scale from wave 10 baseline, 1.15x per wave compounding.
    const wavesBeyond = waveNumber - 10;
    const scale = Math.pow(1.15, wavesBeyond);
    const comp = {};
    const isBossWave = waveNumber % 5 === 0;
    comp.speedUnit = Math.round(10 * scale) + wavesBeyond;
    comp.tank = Math.round(5 * scale);
    comp.trojan = Math.round(3 * scale);
    comp.camo = Math.round(4 * scale);
    if (isBossWave) comp.boss = 1;
    comp._scale = scale;
    return comp;
  }

  getHpRewardScale(waveNumber) {
    if (waveNumber <= 10) return { hp: 1, reward: 1 };
    const wavesBeyond = waveNumber - 10;
    const scale = Math.pow(1.15, wavesBeyond);
    return { hp: scale, reward: scale };
  }

  hasCrateReward(waveNumber) {
    if (waveNumber <= 10) {
      const comp = CAMPAIGN_WAVES[waveNumber - 1];
      return !!(comp && comp.crate);
    }
    return false; // boss-kill crate handled separately in Game.js
  }

  startWave(waveNumber) {
    this.currentWave = waveNumber;
    this.elapsed = 0;
    this.spawning = true;
    this.allSpawned = false;
    this.spawnQueue = [];

    const comp = this.getWaveComposition(waveNumber);
    const scales = this.getHpRewardScale(waveNumber);

    let groupOffset = 0;
    for (const key of Object.keys(GROUP_TYPE_MAP)) {
      if (!comp[key]) continue;
      const typeId = GROUP_TYPE_MAP[key];
      const count = comp[key];
      for (let i = 0; i < count; i++) {
        this.spawnQueue.push({
          typeId,
          spawnAt: groupOffset + i * SPAWN_INTERVAL,
          hpScale: scales.hp,
          rewardScale: scales.reward,
        });
      }
      groupOffset += count * SPAWN_INTERVAL + GROUP_OFFSET;
    }
    this.spawnQueue.sort((a, b) => a.spawnAt - b.spawnAt);
  }

  // Returns array of newly-spawned Enemy instances this tick.
  update(dt) {
    if (!this.spawning) return [];
    this.elapsed += dt;
    const spawned = [];
    while (this.spawnQueue.length && this.spawnQueue[0].spawnAt <= this.elapsed) {
      const entry = this.spawnQueue.shift();
      spawned.push(new Enemy(entry.typeId, entry.hpScale, entry.rewardScale));
    }
    if (this.spawnQueue.length === 0) {
      this.spawning = false;
      this.allSpawned = true;
    }
    return spawned;
  }
}

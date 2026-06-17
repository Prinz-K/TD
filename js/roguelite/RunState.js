// Tracks per-run state: current wave, kills, core HP, phase.
export default class RunState {
  constructor(startingCpuBonus = 0) {
    this.wave = 1;
    this.coreHp = 20;
    this.coreMaxHp = 20;
    this.kills = 0;
    this.techPointsEarnedThisRun = 0;
    this.phase = 'prep'; // 'prep' | 'wave' | 'gameover' | 'victory'
    this.gameSpeed = 1;
    this.pendingCrate = false;
    this.endlessMode = false;
    this.startingCpuBonus = startingCpuBonus;
  }

  damageCore(amount = 1) {
    this.coreHp = Math.max(0, this.coreHp - amount);
    return this.coreHp <= 0;
  }

  isCampaign() {
    return this.wave <= 10;
  }
}

// Tracks the run's CPU currency.
export default class EconomyManager {
  constructor(startingCpu) {
    this.cpu = startingCpu;
  }

  canAfford(amount) {
    return this.cpu >= amount;
  }

  spend(amount) {
    if (!this.canAfford(amount)) return false;
    this.cpu -= amount;
    return true;
  }

  add(amount) {
    this.cpu += amount;
  }
}

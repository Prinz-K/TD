// Crate reward system. Crates are awarded after waves 3/6/9 and after any
// boss kill. Reward pool:
//   - Unlock FirewallBeacon (note: simplified per spec — all 3 tower types
//     are available from the start in the buy panel for a frictionless,
//     always-playable experience; this reward instead grants a small CPU
//     bonus equivalent so the slot is never "wasted")
//   - +200 CPU bonus
//   - Free Tier-1 upgrade (path A) on a random placed tower; falls back to
//     +100 CPU if no towers are placed
//   - Hero EMP radius +30 (permanent for the run)
export default class CrateSystem {
  constructor(eventBus) {
    this.bus = eventBus;
  }

  openCrate(towerManager, economy, hero) {
    const options = ['unlock', 'cpu200', 'freeUpgrade', 'empRadius'];
    const choice = options[Math.floor(Math.random() * options.length)];
    let resultText = '';

    switch (choice) {
      case 'unlock':
        economy.add(150);
        resultText = 'All towers already unlocked — bonus +150 CPU instead!';
        break;
      case 'cpu200':
        economy.add(200);
        resultText = '+200 CPU bonus!';
        break;
      case 'freeUpgrade': {
        const towers = towerManager.towers;
        if (towers.length === 0) {
          economy.add(100);
          resultText = 'No towers placed — +100 CPU instead!';
        } else {
          const tower = towers[Math.floor(Math.random() * towers.length)];
          if (tower.upgrades.canUpgrade('A')) {
            tower.upgrades.applyUpgrade('A');
            tower.recomputeStats();
            resultText = `Free Path A upgrade for ${tower.def.name}!`;
          } else {
            economy.add(100);
            resultText = 'Tower path maxed — +100 CPU instead!';
          }
        }
        break;
      }
      case 'empRadius':
        hero.empRadius += 30;
        resultText = 'Hero EMP radius +30 (permanent this run)!';
        break;
      default:
        break;
    }

    this.bus.emit('crateOpened', { resultText });
    return resultText;
  }
}

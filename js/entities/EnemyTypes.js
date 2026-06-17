// Static data for enemy archetypes.
export const ENEMY_TYPES = {
  SpeedUnit: {
    id: 'SpeedUnit', name: 'Speed Unit', hp: 60, speed: 90, armor: 0, reward: 10,
    color: '#ff4466', radius: 10, camo: false,
  },
  Tank: {
    id: 'Tank', name: 'Tank', hp: 300, speed: 45, armor: 15, reward: 25,
    color: '#8844ff', radius: 14, camo: false,
  },
  Camo: {
    id: 'Camo', name: 'Camo', hp: 80, speed: 70, armor: 0, reward: 20,
    color: '#44ff88', radius: 10, camo: true,
  },
  TrojanCarrier: {
    id: 'TrojanCarrier', name: 'Trojan Carrier', hp: 200, speed: 55, armor: 5, reward: 30,
    color: '#ffaa00', radius: 12, camo: false, splitsOnDeath: true,
  },
  Boss: {
    id: 'Boss', name: 'Boss', hp: 1500, speed: 35, armor: 30, reward: 200,
    color: '#ff0066', radius: 22, camo: false, isBoss: true,
  },
};

export function getEnemyType(id) {
  return ENEMY_TYPES[id];
}

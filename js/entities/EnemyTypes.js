// Static data for enemy archetypes (Brainrot foes marching the path).
// Internal IDs are kept stable so WaveManager/Game logic keeps working; only
// the display name/color is themed.
export const ENEMY_TYPES = {
  // Cappuccino Assassino — fast little coffee assassin.
  SpeedUnit: {
    id: 'SpeedUnit', name: 'Cappuccino Assassino', hp: 60, speed: 90, armor: 0, reward: 10,
    color: '#6f4e37', radius: 10, camo: false,
  },
  // Trippi Troppi — slow, chunky tank.
  Tank: {
    id: 'Tank', name: 'Trippi Troppi', hp: 300, speed: 45, armor: 15, reward: 25,
    color: '#7b9acc', radius: 14, camo: false,
  },
  // Glorbo Fruttodrillo — sneaky camo crocodile-fruit.
  Camo: {
    id: 'Camo', name: 'Glorbo Fruttodrillo', hp: 80, speed: 70, armor: 0, reward: 20,
    color: '#5fc24d', radius: 10, camo: true,
  },
  // Lirilì Larilà — splits into little ones on death.
  TrojanCarrier: {
    id: 'TrojanCarrier', name: 'Lirili Larila', hp: 200, speed: 55, armor: 5, reward: 30,
    color: '#e0a93f', radius: 12, camo: false, splitsOnDeath: true,
  },
  // Tralalero Tralala — the big shark boss.
  Boss: {
    id: 'Boss', name: 'Tralalero Tralala', hp: 1500, speed: 35, armor: 30, reward: 200,
    color: '#2e6fb0', radius: 22, camo: false, isBoss: true,
  },
};

export function getEnemyType(id) {
  return ENEMY_TYPES[id];
}

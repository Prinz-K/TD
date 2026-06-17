import Game from './Game.js';

// Entry point: instantiate the game once the DOM is ready.
function boot() {
  window.circuitSurgeGame = new Game();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

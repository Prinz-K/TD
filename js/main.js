import Game from './game.js';

// Scale the fixed-size 1372x752 game to fit any screen (phones, tablets,
// desktop), centered, preserving aspect ratio. Pointer coordinates keep
// working because input code divides by getBoundingClientRect() size.
const APP_W = 1372 + 8; // content + 4px border each side
const APP_H = 720 + 8;

function fitToScreen() {
  const app = document.getElementById('app');
  const scale = Math.min(window.innerWidth / APP_W, window.innerHeight / APP_H);
  const left = (window.innerWidth - APP_W * scale) / 2;
  const top = (window.innerHeight - APP_H * scale) / 2;
  app.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
}

function boot() {
  fitToScreen();
  window.addEventListener('resize', fitToScreen);
  window.addEventListener('orientationchange', () => setTimeout(fitToScreen, 100));
  window.game = new Game();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

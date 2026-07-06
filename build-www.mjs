// Copies the game files into www/ — the clean web bundle Capacitor ships
// inside the Android/iOS app (keeps node_modules etc. out of the app).
// Run before every `npx cap sync`:  node build-www.mjs
import { cpSync, rmSync, mkdirSync } from 'node:fs';

rmSync('www', { recursive: true, force: true });
mkdirSync('www');
for (const entry of ['index.html', 'style.css', 'manifest.webmanifest', 'js', 'icons']) {
  cpSync(entry, `www/${entry}`, { recursive: true });
}
console.log('www/ bundle ready');

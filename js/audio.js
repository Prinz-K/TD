// Synthesized sound effects via Web Audio API — no external assets, so the
// game stays fully offline. The AudioContext is created lazily on the first
// user gesture (browser autoplay policy). Rapid-fire sounds are throttled
// per key so 3x speed doesn't turn into noise soup.

const MUTE_KEY = 'brainrot_td_muted';

export default class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.lastPlayed = {}; // key -> ms timestamp
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch (e) {
      this.muted = false;
    }
  }

  toggleMuted() {
    this.muted = !this.muted;
    try { localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0'); } catch (e) { /* ignore */ }
    return this.muted;
  }

  _ensureCtx() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.25;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      this.ctx = null;
      return false;
    }
    return true;
  }

  _throttled(key, minMs) {
    const now = performance.now();
    if (this.lastPlayed[key] && now - this.lastPlayed[key] < minMs) return true;
    this.lastPlayed[key] = now;
    return false;
  }

  // One oscillator note with a pitch and volume envelope.
  _tone({ freq, freqEnd, dur = 0.1, type = 'sine', vol = 1, delay = 0 }) {
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // Filtered white-noise burst (explosions, thuds).
  _noise({ dur = 0.2, vol = 1, cutoff = 800, delay = 0 }) {
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  play(name) {
    if (this.muted) return;
    if (!this._ensureCtx()) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    switch (name) {
      case 'pop': {
        if (this._throttled('pop', 35)) return;
        const f = 650 + Math.random() * 450;
        this._tone({ freq: f, freqEnd: f * 1.6, dur: 0.07, type: 'square', vol: 0.35 });
        break;
      }
      case 'shoot': {
        if (this._throttled('shoot', 60)) return;
        this._tone({ freq: 320, freqEnd: 180, dur: 0.05, type: 'triangle', vol: 0.2 });
        break;
      }
      case 'shootBomb': {
        if (this._throttled('shootBomb', 90)) return;
        this._tone({ freq: 140, freqEnd: 70, dur: 0.12, type: 'sine', vol: 0.5 });
        break;
      }
      case 'shootPlasma': {
        if (this._throttled('shootPlasma', 50)) return;
        this._tone({ freq: 900, freqEnd: 300, dur: 0.06, type: 'sawtooth', vol: 0.12 });
        break;
      }
      case 'pulse': {
        if (this._throttled('pulse', 150)) return;
        this._tone({ freq: 500, freqEnd: 900, dur: 0.18, type: 'sine', vol: 0.18 });
        break;
      }
      case 'boom': {
        if (this._throttled('boom', 80)) return;
        this._noise({ dur: 0.3, vol: 0.7, cutoff: 500 });
        this._tone({ freq: 110, freqEnd: 40, dur: 0.3, type: 'sine', vol: 0.7 });
        break;
      }
      case 'moabBoom': {
        this._noise({ dur: 0.55, vol: 1, cutoff: 400 });
        this._tone({ freq: 90, freqEnd: 30, dur: 0.55, type: 'sine', vol: 0.9 });
        this._noise({ dur: 0.4, vol: 0.7, cutoff: 600, delay: 0.14 });
        break;
      }
      case 'place': {
        this._noise({ dur: 0.12, vol: 0.5, cutoff: 900 });
        this._tone({ freq: 160, freqEnd: 70, dur: 0.12, type: 'sine', vol: 0.6 });
        break;
      }
      case 'upgrade': {
        [440, 554, 659].forEach((f, i) => {
          this._tone({ freq: f, dur: 0.12, type: 'triangle', vol: 0.4, delay: i * 0.07 });
        });
        break;
      }
      case 'roundStart': {
        this._tone({ freq: 392, dur: 0.1, type: 'triangle', vol: 0.4 });
        this._tone({ freq: 523, dur: 0.14, type: 'triangle', vol: 0.4, delay: 0.1 });
        break;
      }
      case 'cash': {
        this._tone({ freq: 988, dur: 0.07, type: 'square', vol: 0.25 });
        this._tone({ freq: 1319, dur: 0.12, type: 'square', vol: 0.25, delay: 0.06 });
        break;
      }
      case 'leak': {
        if (this._throttled('leak', 200)) return;
        this._tone({ freq: 200, freqEnd: 90, dur: 0.25, type: 'sawtooth', vol: 0.4 });
        break;
      }
      case 'moab': {
        // alarm horn
        this._tone({ freq: 220, dur: 0.3, type: 'sawtooth', vol: 0.4 });
        this._tone({ freq: 220, dur: 0.3, type: 'sawtooth', vol: 0.4, delay: 0.4 });
        this._tone({ freq: 175, dur: 0.5, type: 'sawtooth', vol: 0.4, delay: 0.8 });
        break;
      }
      case 'ability': {
        this._tone({ freq: 300, freqEnd: 900, dur: 0.18, type: 'sawtooth', vol: 0.35 });
        this._tone({ freq: 600, freqEnd: 1400, dur: 0.15, type: 'triangle', vol: 0.3, delay: 0.06 });
        break;
      }
      case 'rally': {
        this._tone({ freq: 523, dur: 0.1, type: 'triangle', vol: 0.35 });
        this._tone({ freq: 659, dur: 0.14, type: 'triangle', vol: 0.35, delay: 0.09 });
        break;
      }
      case 'dash': {
        this._noise({ dur: 0.22, vol: 0.45, cutoff: 2500 });
        this._tone({ freq: 200, freqEnd: 600, dur: 0.2, type: 'sine', vol: 0.25 });
        break;
      }
      case 'towerStun': {
        this._tone({ freq: 800, freqEnd: 120, dur: 0.25, type: 'sawtooth', vol: 0.3 });
        break;
      }
      case 'victory': {
        [523, 659, 784, 1047].forEach((f, i) => {
          this._tone({ freq: f, dur: 0.2, type: 'triangle', vol: 0.45, delay: i * 0.14 });
        });
        break;
      }
      case 'defeat': {
        [392, 330, 262, 196].forEach((f, i) => {
          this._tone({ freq: f, dur: 0.25, type: 'triangle', vol: 0.45, delay: i * 0.18 });
        });
        break;
      }
      default:
        break;
    }
  }
}

// Procedural chiptune background music via Web Audio — five looping tracks
// written as step-sequencer patterns (16th-note grid, semitone offsets from a
// base frequency, null = rest). No audio files needed, stays offline.
//
// A lookahead scheduler (setInterval ~90ms, schedules ~0.3s ahead on the
// AudioContext clock) keeps timing tight without blocking the main thread.

const MUSIC_MUTE_KEY = 'brainrot_td_music';

// Patterns: bass/lead are 16 or 32 steps; kick/hat are 16-step hit masks.
const TRACKS = {
  // calm major theme for the menu
  menu: {
    bpm: 92,
    base: 220,
    bass: [0, null, null, null, 7, null, null, null, 5, null, null, null, 7, null, null, null],
    lead: [12, null, 11, null, 9, null, 7, null, 9, null, null, null, 4, null, null, null,
      5, null, 7, null, 9, null, 11, null, 12, null, null, null, null, null, null, null],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    hat: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  },
  // bouncy and bright
  meadow1: {
    bpm: 120,
    base: 220,
    bass: [0, null, 0, null, 5, null, 5, null, 9, null, 9, null, 7, null, 5, null],
    lead: [4, null, 7, 9, null, 9, 7, null, 4, null, 2, null, 0, null, null, null,
      4, null, 7, 9, null, 12, 9, null, 7, null, 9, null, 7, 4, 2, null],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1],
  },
  // faster variation with a walking bass
  meadow2: {
    bpm: 132,
    base: 220,
    bass: [0, null, 4, null, 5, null, 7, null, 9, null, 7, null, 5, null, 4, null],
    lead: [12, null, null, 9, null, null, 7, null, 9, 11, 12, null, null, null, 9, null,
      7, null, null, 4, null, null, 5, null, 7, 9, 7, null, 4, null, 2, null],
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    hat: [0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1],
  },
  // desert feel: phrygian-ish intervals
  dunes: {
    bpm: 108,
    base: 196,
    bass: [0, null, null, 0, 1, null, null, null, 0, null, null, 0, 5, null, 4, null],
    lead: [12, null, 13, null, 12, null, 8, null, 7, null, null, null, 5, null, 4, null,
      5, null, 7, null, 8, null, 7, null, 5, null, 4, null, 1, null, 0, null],
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
  },
  // driving minor ostinato for MOAB/boss rounds
  boss: {
    bpm: 140,
    base: 165,
    bass: [0, 0, null, 0, 0, null, 3, 3, 0, 0, null, 0, 0, null, 5, 3],
    lead: [12, null, null, null, null, null, 10, null, 12, null, null, null, 15, null, 12, null,
      12, null, null, null, null, null, 10, null, 8, null, null, null, 7, null, null, null],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
  },
};

export default class Music {
  constructor(sfx) {
    this.sfx = sfx; // shares the lazily-created AudioContext
    this.playing = false;
    this.trackName = null;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.gain = null;
    try {
      this.muted = localStorage.getItem(MUSIC_MUTE_KEY) === '1';
    } catch (e) {
      this.muted = false;
    }
  }

  toggleMuted() {
    this.muted = !this.muted;
    try { localStorage.setItem(MUSIC_MUTE_KEY, this.muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (this.gain) this.gain.gain.value = this.muted ? 0 : 1;
    return this.muted;
  }

  _ensure() {
    if (!this.sfx._ensureCtx()) return false;
    if (!this.gain) {
      this.gain = this.sfx.ctx.createGain();
      this.gain.gain.value = this.muted ? 0 : 1;
      this.gain.connect(this.sfx.ctx.destination);
    }
    return true;
  }

  start(trackName) {
    if (!this._ensure()) return;
    if (this.sfx.ctx.state === 'suspended') this.sfx.ctx.resume();
    this.trackName = trackName;
    if (this.playing) return;
    this.playing = true;
    this.step = 0;
    this.nextTime = this.sfx.ctx.currentTime + 0.06;
    this.timer = setInterval(() => this._tick(), 90);
  }

  setTrack(trackName) {
    if (this.trackName === trackName) return;
    if (!this.playing) {
      this.trackName = trackName;
      return;
    }
    this.trackName = trackName;
    this.step = 0;
  }

  stop() {
    this.playing = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  _tick() {
    if (!this.playing || !this.trackName) return;
    const ctx = this.sfx.ctx;
    const track = TRACKS[this.trackName];
    const stepDur = 60 / track.bpm / 4; // 16th note
    // if the tab slept, jump forward instead of burst-scheduling
    if (this.nextTime < ctx.currentTime - 0.5) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + 0.3) {
      this._scheduleStep(track, this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % 32;
    }
  }

  _scheduleStep(track, step, t, stepDur) {
    const bassNote = track.bass[step % track.bass.length];
    if (bassNote !== null && bassNote !== undefined) {
      this._note(track.base * Math.pow(2, bassNote / 12), t, stepDur * 0.9, 'triangle', 0.055);
    }
    const leadNote = track.lead[step % track.lead.length];
    if (leadNote !== null && leadNote !== undefined) {
      this._note(track.base * 2 * Math.pow(2, leadNote / 12), t, stepDur * 0.85, 'square', 0.02);
    }
    if (track.kick[step % 16]) this._kick(t);
    if (track.hat[step % 16]) this._hat(t);
  }

  _note(freq, t, dur, type, vol) {
    const ctx = this.sfx.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(this.gain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _kick(t) {
    const ctx = this.sfx.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.09);
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(g);
    g.connect(this.gain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  _hat(t) {
    const ctx = this.sfx.ctx;
    const len = Math.floor(ctx.sampleRate * 0.03);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.018, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.gain);
    src.start(t);
  }
}

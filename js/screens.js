import { fmt, DIFFICULTIES, DIFFICULTY_ORDER } from './constants.js';
import { TOWERS, TOWER_ORDER } from './data/towers.js';
import { MAPS, MAP_ORDER, createMap } from './engine/path.js';
import { makePortrait, makeMapThumb } from './render.js';
import { PERKS } from './meta.js';

const VERSION = '1.0.0';

// Mobile-app style menu system: title splash, local profile "login", home hub
// with bottom-nav tabs (Home / Brainrots / Shop / Profile) and sub-screens
// for play setup and character details. Lives in #overlay-root; the in-game
// UI (sidebar etc.) is untouched and appears when no screen is shown.
export default class MenuUI {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('overlay-root');
    this.portraits = {};
    this.mapThumbs = null;
    this.current = null;
  }

  _portrait(id, size = 56) {
    const key = `${id}_${size}`;
    if (!this.portraits[key]) this.portraits[key] = makePortrait(id, size);
    const clone = document.createElement('canvas');
    clone.width = this.portraits[key].width;
    clone.height = this.portraits[key].height;
    clone.getContext('2d').drawImage(this.portraits[key], 0, 0);
    return clone;
  }

  hide() {
    this.root.innerHTML = '';
    this.current = null;
  }

  show(name, arg) {
    this.current = name;
    this.root.innerHTML = '';
    const screen = el('div', 'screen screen-enter');
    this.root.appendChild(screen);
    switch (name) {
      case 'title': this._title(screen); break;
      case 'login': this._login(screen); break;
      case 'home': this._home(screen); break;
      case 'play': this._play(screen); break;
      case 'characters': this._characters(screen); break;
      case 'charDetail': this._charDetail(screen, arg); break;
      case 'shop': this._shop(screen); break;
      case 'profile': this._profile(screen); break;
      default: this._home(screen);
    }
  }

  // ------------------------------------------------------------ pieces ----

  _header(screen, { title, back, points = true } = {}) {
    const bar = el('div', 'app-header');
    if (back) {
      const b = el('button', 'hdr-back', '‹');
      b.addEventListener('click', () => this.show(back));
      bar.appendChild(b);
    } else {
      const chip = el('div', 'profile-chip');
      const av = this._portrait(this.game.meta.profile.avatar || 'sahur', 34);
      av.classList.add('chip-avatar');
      chip.appendChild(av);
      chip.appendChild(el('span', 'chip-name', this.game.meta.profile.name || 'Player'));
      chip.addEventListener('click', () => this.show('profile'));
      bar.appendChild(chip);
    }
    bar.appendChild(el('div', 'hdr-title', title || ''));
    if (points) {
      bar.appendChild(el('div', 'points-chip', `🧠 ${fmt(this.game.meta.points)}`));
    } else {
      bar.appendChild(el('div', 'points-chip spacer', ''));
    }
    screen.appendChild(bar);
  }

  _nav(screen, active) {
    const nav = el('div', 'bottom-nav');
    const tabs = [
      ['home', '🏠', 'Home'],
      ['characters', '🎭', 'Brainrots'],
      ['shop', '🛒', 'Shop'],
      ['profile', '👤', 'Profile'],
    ];
    for (const [id, icon, label] of tabs) {
      const tab = el('button', `nav-tab${active === id ? ' active' : ''}`);
      tab.appendChild(el('div', 'nav-icon', icon));
      tab.appendChild(el('div', 'nav-label', label));
      tab.addEventListener('click', () => this.show(id));
      nav.appendChild(tab);
    }
    screen.appendChild(nav);
  }

  // ------------------------------------------------------------- title ----

  _title(screen) {
    screen.classList.add('title-screen');
    const box = el('div', 'title-box');
    const heads = el('div', 'title-heads');
    for (const id of ['bombardiro', 'sahur', 'ballerina']) {
      const p = this._portrait(id, id === 'sahur' ? 96 : 72);
      p.classList.add('title-head');
      heads.appendChild(p);
    }
    box.appendChild(heads);
    box.appendChild(el('h1', 'title-logo', '🧠 BRAINROT TD'));
    box.appendChild(el('div', 'title-sub', 'Pop the bloons. Protect the meadow.'));
    box.appendChild(el('div', 'tap-to-start', 'TAP TO START'));
    screen.appendChild(box);
    screen.appendChild(el('div', 'title-version', `v${VERSION}`));
    screen.addEventListener('click', () => {
      this.show(this.game.meta.hasProfile() ? 'home' : 'login');
    }, { once: true });
  }

  // ------------------------------------------------------------- login ----

  _login(screen) {
    this._header(screen, { title: 'Create your profile', points: false });
    const body = el('div', 'screen-body login-body');

    body.appendChild(el('div', 'login-label', 'Your name'));
    const input = document.createElement('input');
    input.className = 'login-input';
    input.type = 'text';
    input.maxLength = 16;
    input.placeholder = 'Player name…';
    input.value = this.game.meta.profile.name || '';
    body.appendChild(input);

    body.appendChild(el('div', 'login-label', 'Pick your avatar'));
    const grid = el('div', 'avatar-grid');
    let selected = this.game.meta.profile.avatar || 'sahur';
    const cells = {};
    for (const id of TOWER_ORDER) {
      const cell = el('button', `avatar-cell${id === selected ? ' active' : ''}`);
      cell.appendChild(this._portrait(id, 52));
      cell.addEventListener('click', () => {
        selected = id;
        for (const key of Object.keys(cells)) cells[key].classList.toggle('active', key === id);
      });
      cells[id] = cell;
      grid.appendChild(cell);
    }
    body.appendChild(grid);

    const go = el('button', 'big-btn go-btn', "LET'S GO!");
    const refreshGo = () => { go.disabled = input.value.trim().length === 0; };
    input.addEventListener('input', refreshGo);
    refreshGo();
    go.addEventListener('click', () => {
      this.game.meta.setProfile(input.value.trim(), selected);
      this.show('home');
    });
    body.appendChild(go);
    screen.appendChild(body);
  }

  // -------------------------------------------------------------- home ----

  _home(screen) {
    this._header(screen, { title: 'BRAINROT TD' });
    const body = el('div', 'screen-body home-body');

    const hero = el('div', 'home-hero');
    const p = this._portrait(this.game.meta.profile.avatar || 'sahur', 88);
    p.classList.add('home-avatar');
    hero.appendChild(p);
    hero.appendChild(el('div', 'home-welcome', `Welcome back, ${this.game.meta.profile.name || 'Player'}!`));
    body.appendChild(hero);

    const saved = this.game.loadRunData();
    if (saved) {
      const mapName = (MAPS[saved.mapId] || MAPS.meadow).name;
      const diffName = (DIFFICULTIES[saved.difficulty] || DIFFICULTIES.medium).name;
      const cont = el('button', 'big-btn continue-big', `⏵ CONTINUE — Round ${saved.round + 1} · ${mapName} (${diffName})`);
      cont.addEventListener('click', () => {
        this.hide();
        this.game.resumeRun();
      });
      body.appendChild(cont);
    }

    const play = el('button', 'big-btn play-big', '▶ PLAY');
    play.addEventListener('click', () => this.show('play'));
    body.appendChild(play);

    screen.appendChild(body);
    this._nav(screen, 'home');
  }

  // ------------------------------------------------------- play set-up ----

  _play(screen) {
    this._header(screen, { title: 'New Game', back: 'home' });
    const body = el('div', 'screen-body play-body');

    body.appendChild(el('div', 'section-label', 'Difficulty'));
    const diffGrid = el('div', 'diff-grid');
    for (const id of DIFFICULTY_ORDER) {
      const def = DIFFICULTIES[id];
      const card = el('div', `diff-card ${id}${this.game.difficulty === id ? ' active' : ''}`);
      card.appendChild(el('div', 'diff-name', def.name));
      card.appendChild(el('div', 'diff-info', `❤️ ${def.lives} lives`));
      card.appendChild(el('div', 'diff-info', `💰 prices ×${def.priceMult}`));
      card.appendChild(el('div', 'diff-info', `🧠 points ×${def.pointsMult}`));
      card.addEventListener('click', () => {
        this.game.setDifficulty(id);
        this.show('play');
      });
      diffGrid.appendChild(card);
    }
    body.appendChild(diffGrid);

    body.appendChild(el('div', 'section-label', 'Map'));
    if (!this.mapThumbs) {
      this.mapThumbs = {};
      for (const id of MAP_ORDER) {
        const m = createMap(id);
        this.mapThumbs[id] = makeMapThumb(m.path, m.theme, 168, 112);
      }
    }
    const mapGrid = el('div', 'map-grid');
    for (const id of MAP_ORDER) {
      const def = MAPS[id];
      const card = el('div', `map-card${this.game.selectedMapId === id ? ' active' : ''}`);
      const thumbSrc = this.mapThumbs[id];
      const thumb = document.createElement('canvas');
      thumb.width = thumbSrc.width;
      thumb.height = thumbSrc.height;
      thumb.getContext('2d').drawImage(thumbSrc, 0, 0);
      thumb.classList.add('map-thumb');
      card.appendChild(thumb);
      card.appendChild(el('div', 'map-name', def.name));
      card.appendChild(el('div', `map-diff ${def.difficulty.toLowerCase()}`, def.difficulty));
      card.addEventListener('click', () => {
        this.game.setMap(id);
        this.show('play');
      });
      mapGrid.appendChild(card);
    }
    body.appendChild(mapGrid);

    const saved = this.game.loadRunData();
    const start = el('button', 'big-btn play-big', '▶ START');
    start.addEventListener('click', () => {
      if (saved && !confirm('Start a new game? Your saved run will be lost.')) return;
      this.hide();
      this.game.startRun();
    });
    body.appendChild(start);
    screen.appendChild(body);
  }

  // -------------------------------------------------------- characters ----

  _characters(screen) {
    this._header(screen, { title: 'Brainrots' });
    const body = el('div', 'screen-body');
    const grid = el('div', 'char-grid');
    for (const id of TOWER_ORDER) {
      const def = TOWERS[id];
      const unlocked = this.game.meta.isUnlocked(id);
      const card = el('div', `char-card${unlocked ? '' : ' locked'}`);
      const p = this._portrait(id, 64);
      if (!unlocked) p.classList.add('locked-img');
      card.appendChild(p);
      card.appendChild(el('div', 'char-name', def.name));
      card.appendChild(el('div', 'char-state', unlocked ? '✓ Unlocked' : `🔒 ${def.unlockCost} pts`));
      card.addEventListener('click', () => this.show('charDetail', id));
      grid.appendChild(card);
    }
    body.appendChild(grid);
    screen.appendChild(body);
    this._nav(screen, 'characters');
  }

  _charDetail(screen, id) {
    const def = TOWERS[id];
    const unlocked = this.game.meta.isUnlocked(id);
    this._header(screen, { title: def.name, back: 'characters' });
    const body = el('div', 'screen-body');

    const head = el('div', 'cd-head');
    const p = this._portrait(id, 96);
    if (!unlocked) p.classList.add('locked-img');
    head.appendChild(p);
    const info = el('div', 'cd-info');
    info.appendChild(el('div', 'cd-desc', def.desc));
    const bits = [`💰 $${def.cost}`, `📏 Range ${def.range}`];
    if (def.damage > 0) bits.push(`💥 Dmg ${def.damage}`);
    if (def.rate > 0) bits.push(`⚡ ${def.rate}/s`);
    if (def.camoDetect) bits.push('👁 Camo');
    if (def.income) bits.push(`🍌 +$${def.income}/round`);
    info.appendChild(el('div', 'cd-stats', bits.join('  ·  ')));
    head.appendChild(info);
    body.appendChild(head);

    if (!unlocked) {
      const unlock = el('button', 'big-btn unlock-big', `🔓 UNLOCK — ${def.unlockCost} 🧠`);
      unlock.disabled = this.game.meta.points < def.unlockCost;
      unlock.addEventListener('click', () => {
        if (this.game.meta.unlockTower(id)) this.show('charDetail', id);
      });
      body.appendChild(unlock);
    }

    if (def.ability) {
      const ab = el('div', 'cd-ability');
      ab.appendChild(el('div', 'cd-ability-name', `⚡ Ability: ${def.ability.name}`));
      ab.appendChild(el('div', 'cd-ability-desc', `${def.ability.desc} · ${def.ability.cd}s cooldown`));
      body.appendChild(ab);
    }

    body.appendChild(el('div', 'section-label', 'Upgrade Paths'));
    const paths = el('div', 'cd-paths');
    def.paths.forEach((path) => {
      const col = el('div', 'cd-path');
      col.appendChild(el('div', 'cd-path-name', path.name));
      path.tiers.forEach((tier, i) => {
        const t = el('div', 'cd-tier');
        t.appendChild(el('div', 'cd-tier-num', `Tier ${i + 1} · $${fmt(tier.cost)}`));
        t.appendChild(el('div', 'cd-tier-label', tier.label));
        col.appendChild(t);
      });
      paths.appendChild(col);
    });
    body.appendChild(paths);

    screen.appendChild(body);
    this._nav(screen, 'characters');
  }

  // -------------------------------------------------------------- shop ----

  _shop(screen) {
    this._header(screen, { title: 'Shop' });
    const body = el('div', 'screen-body');

    const bal = el('div', 'shop-balance');
    bal.appendChild(el('div', 'shop-balance-num', `🧠 ${fmt(this.game.meta.points)}`));
    bal.appendChild(el('div', 'shop-balance-label', 'Brainrot Points — earn them by popping bloons!'));
    body.appendChild(bal);

    body.appendChild(el('div', 'section-label', 'Permanent Perks'));
    const grid = el('div', 'perk-grid app-perks');
    for (const key of Object.keys(PERKS)) {
      const def = PERKS[key];
      const lvl = this.game.meta.perks[key];
      const cost = this.game.meta.perkCost(key);
      const card = el('div', 'perk-card');
      card.appendChild(el('div', 'perk-name', def.name));
      card.appendChild(el('div', 'perk-desc', def.desc));
      card.appendChild(el('div', 'perk-lvl', `Level ${lvl}/${def.max}`));
      const btn = el('button', 'unlock-btn');
      if (cost === null) {
        btn.textContent = 'Maxed ✓';
        btn.disabled = true;
      } else {
        btn.textContent = `Buy — ${cost} 🧠`;
        btn.disabled = this.game.meta.points < cost;
        btn.addEventListener('click', () => {
          if (this.game.meta.buyPerk(key)) this.show('shop');
        });
      }
      card.appendChild(btn);
      grid.appendChild(card);
    }
    body.appendChild(grid);

    const hint = el('div', 'shop-hint', '🎭 Looking for new characters? Unlock them in the Brainrots tab!');
    hint.addEventListener('click', () => this.show('characters'));
    body.appendChild(hint);

    screen.appendChild(body);
    this._nav(screen, 'shop');
  }

  // ------------------------------------------------------------ profile ----

  _profile(screen) {
    this._header(screen, { title: 'Profile' });
    const body = el('div', 'screen-body');
    const meta = this.game.meta;

    const head = el('div', 'cd-head profile-head');
    const p = this._portrait(meta.profile.avatar || 'sahur', 88);
    head.appendChild(p);
    const info = el('div', 'cd-info');
    info.appendChild(el('div', 'profile-name', meta.profile.name || 'Player'));
    const edit = el('button', 'unlock-btn', '✏️ Edit profile');
    edit.addEventListener('click', () => this.show('login'));
    info.appendChild(edit);
    head.appendChild(info);
    body.appendChild(head);

    body.appendChild(el('div', 'section-label', 'Statistics'));
    const stats = el('div', 'stats-grid');
    const rows = [
      ['🎮 Games played', meta.stats.games],
      ['🏆 Victories', meta.stats.victories],
      ['🌊 Best round', meta.stats.bestRound],
      ['🎈 Total pops', fmt(meta.stats.totalPops)],
      ['🧠 Points earned', fmt(meta.stats.totalPoints)],
    ];
    for (const [label, val] of rows) {
      const row = el('div', 'stat-row');
      row.appendChild(el('span', 'stat-label', label));
      row.appendChild(el('span', 'stat-val', String(val)));
      stats.appendChild(row);
    }
    body.appendChild(stats);

    body.appendChild(el('div', 'section-label', 'Settings'));
    const settings = el('div', 'settings-row');
    const sfxBtn = el('button', 'unlock-btn', this.game.sfx.muted ? '🔇 Sound: OFF' : '🔊 Sound: ON');
    sfxBtn.addEventListener('click', () => {
      this.game.sfx.toggleMuted();
      this.show('profile');
    });
    const musBtn = el('button', 'unlock-btn', this.game.music.muted ? '🔕 Music: OFF' : '🎵 Music: ON');
    musBtn.addEventListener('click', () => {
      this.game.music.toggleMuted();
      this.show('profile');
    });
    settings.append(sfxBtn, musBtn);
    body.appendChild(settings);

    const reset = el('button', 'reset-btn', 'Reset all progress');
    reset.addEventListener('click', () => {
      if (confirm('Erase all Brainrot Points, unlocks, perks, stats and the saved run?')) {
        meta.reset();
        this.game.clearRun();
        this.show('profile');
      }
    });
    body.appendChild(reset);

    screen.appendChild(body);
    this._nav(screen, 'profile');
  }
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

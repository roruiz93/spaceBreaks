// Persistencia local — wrappea localStorage con fallback seguro

const PREFIX = 'spacebreaks_';

export const Storage = {
  get(key, defaultVal = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw !== null ? JSON.parse(raw) : defaultVal;
    } catch { return defaultVal; }
  },

  set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); }
    catch { /* storage lleno o modo privado */ }
  },

  // ── Scores ─────────────────────────────────────────────────
  getBestScore()           { return this.get('best_score', 0); },
  setBestScore(score)      { this.set('best_score', score); },

  // ── Coins ──────────────────────────────────────────────────
  getCoins()               { return this.get('coins', 0); },
  addCoins(n)              { this.set('coins', this.getCoins() + n); },
  spendCoins(n) {
    const c = this.getCoins();
    if (c < n) return false;
    this.set('coins', c - n);
    return true;
  },

  // ── Premium / suscripción ──────────────────────────────────
  isPremium()              { return this.get('is_premium', false); },
  setPremium(val)          { this.set('is_premium', val); },

  // ── Skins desbloqueadas ────────────────────────────────────
  getUnlockedSkins()       { return this.get('unlocked_skins', ['default']); },
  unlockSkin(id) {
    const skins = this.getUnlockedSkins();
    if (!skins.includes(id)) { skins.push(id); this.set('unlocked_skins', skins); }
  },
  getActiveSkin()          { return this.get('active_skin', 'default'); },
  setActiveSkin(id)        { this.set('active_skin', id); },

  // ── Partidas jugadas (para cadencia de interstitials) ─────
  getGamesPlayed()         { return this.get('games_played', 0); },
  incrementGamesPlayed()   { this.set('games_played', this.getGamesPlayed() + 1); },

  // ── Power-ups comprados ────────────────────────────────────
  getPowerUps()            { return this.get('powerups', {}); },
  addPowerUp(id, qty = 1) {
    const p = this.getPowerUps();
    p[id] = (p[id] || 0) + qty;
    this.set('powerups', p);
  },
  usePowerUp(id) {
    const p = this.getPowerUps();
    if (!p[id] || p[id] <= 0) return false;
    p[id]--;
    this.set('powerups', p);
    return true;
  }
};

import { Storage } from '../utils/Storage.js';

/**
 * CoinManager — economía interna del juego
 *
 * Skins disponibles y sus costos
 * Power-ups disponibles y sus costos
 */

export const SKINS = [
  { id: 'default',  name: 'Nave Clásica', cost: 0,    color: 0x00ffff },
  { id: 'fire',     name: 'Nave Fuego',   cost: 200,  color: 0xff4400 },
  { id: 'ice',      name: 'Nave Hielo',   cost: 200,  color: 0x44aaff },
  { id: 'gold',     name: 'Nave Dorada',  cost: 500,  color: 0xffcc00 },
  { id: 'phantom',  name: 'Phantom',      cost: 1000, color: 0x8800ff },
];

export const POWERUPS = [
  { id: 'shield',    name: 'Escudo',           cost: 50,  desc: 'Absorbe 1 impacto' },
  { id: 'rapidfire', name: 'Disparo Rápido',   cost: 40,  desc: '10 seg de disparo x3' },
  { id: 'bomb',      name: 'Bomba',            cost: 80,  desc: 'Destruye todo en pantalla' },
  { id: 'magnet',    name: 'Imán de Monedas',  cost: 30,  desc: '15 seg atrae monedas' },
];

// Monedas ganadas por partida según el score
export function coinsForScore(score) {
  if (score >= 5000) return 50;
  if (score >= 2000) return 25;
  if (score >= 1000) return 15;
  if (score >= 500)  return 8;
  return 3;
}

export const CoinManager = {

  getCoins()       { return Storage.getCoins(); },

  addCoins(n)      { Storage.addCoins(n); },

  // ── Skins ────────────────────────────────────────────────────
  getAllSkins()     { return SKINS; },

  getActiveSkin()  {
    const id = Storage.getActiveSkin();
    return SKINS.find(s => s.id === id) ?? SKINS[0];
  },

  isSkinUnlocked(id) {
    return Storage.getUnlockedSkins().includes(id);
  },

  buySkin(id) {
    if (this.isSkinUnlocked(id)) return { ok: true, msg: 'Ya desbloqueada' };
    const skin = SKINS.find(s => s.id === id);
    if (!skin) return { ok: false, msg: 'Skin no encontrada' };
    if (!Storage.spendCoins(skin.cost)) return { ok: false, msg: 'Monedas insuficientes' };
    Storage.unlockSkin(id);
    return { ok: true, msg: `¡${skin.name} desbloqueada!` };
  },

  equipSkin(id) {
    if (!this.isSkinUnlocked(id)) return false;
    Storage.setActiveSkin(id);
    return true;
  },

  // ── Power-ups ────────────────────────────────────────────────
  getAllPowerUps()  { return POWERUPS; },

  getPowerUpStock(id) {
    return Storage.getPowerUps()[id] ?? 0;
  },

  buyPowerUp(id) {
    const pu = POWERUPS.find(p => p.id === id);
    if (!pu) return { ok: false, msg: 'Power-up no encontrado' };
    if (!Storage.spendCoins(pu.cost)) return { ok: false, msg: 'Monedas insuficientes' };
    Storage.addPowerUp(id, 1);
    return { ok: true, msg: `¡${pu.name} comprado!` };
  },

  usePowerUp(id) { return Storage.usePowerUp(id); },
};

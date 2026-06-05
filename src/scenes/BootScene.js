import { AdMobManager }   from '../managers/AdMobManager.js';
import { BillingManager } from '../managers/BillingManager.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    this._createLoadingBar();
  }

  create() {
    this._generateTextures();
    AdMobManager.initialize();
    BillingManager.initialize();
    this.scene.start('MenuScene');
  }

  _createLoadingBar() {
    const { width, height } = this.scale;
    const cx = width / 2, cy = height / 2;

    this.add.text(cx, cy - 40, 'SPACE BREAKS', {
      fontSize: '32px', fill: '#00ffff',
      fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    const bar = this.add.graphics();
    const bg  = this.add.graphics();
    bg.fillStyle(0x333333).fillRect(cx - 120, cy, 240, 20);

    this.load.on('progress', v => {
      bar.clear().fillStyle(0x00ffff).fillRect(cx - 120, cy, 240 * v, 20);
    });
  }

  _generateTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // ── Nave (triángulo) ─────────────────────────────────────
    g.clear();
    g.fillStyle(0xffffff);
    g.beginPath();
    g.moveTo(20, 0);
    g.lineTo(0, 40);
    g.lineTo(8, 32);
    g.lineTo(20, 36);
    g.lineTo(32, 32);
    g.lineTo(40, 40);
    g.closePath();
    g.fillPath();
    g.generateTexture('ship', 40, 40);

    // ── Bala ─────────────────────────────────────────────────
    g.clear();
    g.fillStyle(0xffff00);
    g.fillRect(0, 0, 4, 10);
    g.generateTexture('bullet', 4, 10);

    // ── Asteroide grande ─────────────────────────────────────
    g.clear();
    g.lineStyle(2, 0xaaaaaa);
    g.beginPath();
    const pts = [[0,-40],[14,-34],[30,-22],[38,-8],[30,14],[18,30],[0,38],[-18,30],[-30,14],[-38,-8],[-30,-22],[-14,-34]];
    pts.forEach(([x, y], i) => i === 0 ? g.moveTo(x + 42, y + 42) : g.lineTo(x + 42, y + 42));
    g.closePath();
    g.strokePath();
    g.fillStyle(0x444444);
    g.fillPath();
    g.generateTexture('asteroid_large', 84, 84);

    // ── Asteroide mediano ────────────────────────────────────
    g.clear();
    g.lineStyle(2, 0x999999);
    g.beginPath();
    const pts2 = [[0,-22],[8,-18],[18,-10],[22,-4],[16,8],[8,18],[0,20],[-8,18],[-16,8],[-22,-4],[-18,-10],[-8,-18]];
    pts2.forEach(([x, y], i) => i === 0 ? g.moveTo(x + 24, y + 24) : g.lineTo(x + 24, y + 24));
    g.closePath();
    g.strokePath();
    g.fillStyle(0x555555);
    g.fillPath();
    g.generateTexture('asteroid_medium', 48, 48);

    // ── Asteroide pequeño ────────────────────────────────────
    g.clear();
    g.lineStyle(1.5, 0x888888);
    g.beginPath();
    const pts3 = [[0,-11],[4,-8],[9,-5],[11,-2],[8,4],[4,9],[0,10],[-4,9],[-8,4],[-11,-2],[-9,-5],[-4,-8]];
    pts3.forEach(([x, y], i) => i === 0 ? g.moveTo(x + 12, y + 12) : g.lineTo(x + 12, y + 12));
    g.closePath();
    g.strokePath();
    g.fillStyle(0x666666);
    g.fillPath();
    g.generateTexture('asteroid_small', 24, 24);

    // ── Enemigo (OVNI) ───────────────────────────────────────
    g.clear();
    g.fillStyle(0xff4444);
    g.fillEllipse(20, 22, 40, 16);
    g.fillStyle(0xff8888);
    g.fillEllipse(20, 16, 24, 16);
    g.lineStyle(1, 0xff0000);
    g.strokeEllipse(20, 22, 40, 16);
    g.generateTexture('enemy', 40, 38);

    // ── Partícula ────────────────────────────────────────────
    g.clear();
    g.fillStyle(0xffffff);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);

    // ── Nave enemiga (caza rojo) ─────────────────────────────
    g.clear();
    g.fillStyle(0xcc1100);
    g.beginPath();
    g.moveTo(20, 2);   // morro
    g.lineTo(38, 38);  // ala derecha trasera
    g.lineTo(28, 30);  // escotadura motor derecho
    g.lineTo(20, 36);  // cola central
    g.lineTo(12, 30);  // escotadura motor izquierdo
    g.lineTo(2,  38);  // ala izquierda trasera
    g.closePath();
    g.fillPath();
    // Cabina
    g.fillStyle(0xff6644);
    g.fillEllipse(20, 14, 10, 14);
    // Motores
    g.fillStyle(0xff4400);
    g.fillRect(10, 29, 7, 7);
    g.fillRect(23, 29, 7, 7);
    g.generateTexture('enemy_ship', 40, 40);

    // ── Moneda ───────────────────────────────────────────────
    g.clear();
    g.fillStyle(0xffcc00);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0xffee88);
    g.fillCircle(6, 6, 4);
    g.generateTexture('coin', 16, 16);

    // ── Corazón (vida) ───────────────────────────────────────
    g.clear();
    g.fillStyle(0xff4444);
    g.fillCircle(6, 6, 6);
    g.fillCircle(14, 6, 6);
    g.fillTriangle(0, 8, 20, 8, 10, 18);
    g.generateTexture('heart', 20, 18);

    g.destroy();
  }
}

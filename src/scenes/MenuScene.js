import { Storage }        from '../utils/Storage.js';
import { BillingManager } from '../managers/BillingManager.js';
import { CoinManager, SKINS, POWERUPS } from '../managers/CoinManager.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    // Fondo estrellado
    this._createStars();

    // Título
    this.add.text(cx, 100, 'SPACE BREAKS', {
      fontSize: '42px', fill: '#00ffff',
      fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#006688', strokeThickness: 4
    }).setOrigin(0.5);

    // Best score
    const best = Storage.getBestScore();
    this.add.text(cx, 155, `Mejor puntaje: ${best}`, {
      fontSize: '16px', fill: '#aaaaaa', fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Monedas
    const coins = CoinManager.getCoins();
    this.add.text(cx, 180, `🪙 ${coins} monedas`, {
      fontSize: '14px', fill: '#ffcc00', fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Premium badge
    if (BillingManager.isPremium()) {
      this.add.text(cx, 204, '⭐ PREMIUM', {
        fontSize: '13px', fill: '#ffcc00', fontFamily: 'monospace'
      }).setOrigin(0.5);
    }

    // ── Botones ─────────────────────────────────────────────
    this._makeButton(cx, 280, '▶  JUGAR', '#00ffff', () => this._startGame());
    this._makeButton(cx, 350, '🎨  TIENDA', '#ffcc00', () => this._openShop());
    this._makeButton(cx, 420, '⭐  PREMIUM', '#ff88ff', () => this._openPremium());

    // ── Animación asteroides de fondo ───────────────────────
    this._spawnDecoAsteroids();
  }

  _makeButton(x, y, label, color, callback) {
    const btn = this.add.text(x, y, label, {
      fontSize: '22px', fill: color,
      fontFamily: 'monospace', fontStyle: 'bold',
      backgroundColor: '#111122', padding: { x: 24, y: 12 },
      stroke: color, strokeThickness: 1
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover',  () => btn.setScale(1.08));
    btn.on('pointerout',   () => btn.setScale(1));
    btn.on('pointerdown',  () => { btn.setScale(0.95); callback(); });

    this.tweens.add({ targets: btn, scaleX: 1.03, scaleY: 1.03, yoyo: true, repeat: -1, duration: 900 });
    return btn;
  }

  _startGame() {
    this.cameras.main.fade(400, 0, 0, 0);
    this.time.delayedCall(400, () => this.scene.start('GameScene'));
  }

  _openShop() {
    const { width, height } = this.scale;
    const cx = width / 2;

    // Panel de tienda
    const panel = this.add.rectangle(cx, height / 2, width - 40, height - 120, 0x111133, 0.97)
      .setStrokeStyle(2, 0x00ffff).setDepth(20);

    this.add.text(cx, 90, '🎨 TIENDA', {
      fontSize: '26px', fill: '#00ffff', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(21);

    // Skins
    let y = 140;
    this.add.text(cx, y, '— SKINS —', { fontSize: '14px', fill: '#aaaaaa', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(21);
    y += 30;

    const coins = CoinManager.getCoins();
    SKINS.forEach(skin => {
      const unlocked  = CoinManager.isSkinUnlocked(skin.id);
      const isActive  = Storage.getActiveSkin() === skin.id;
      const label     = isActive ? `✓ ${skin.name}` : unlocked ? skin.name : `${skin.name} (🪙${skin.cost})`;
      const col       = isActive ? '#00ff88' : unlocked ? '#ffffff' : coins >= skin.cost ? '#ffcc00' : '#888888';

      const t = this.add.text(cx, y, label, { fontSize: '14px', fill: col, fontFamily: 'monospace' })
        .setOrigin(0.5).setDepth(21).setInteractive({ useHandCursor: true });

      t.on('pointerdown', () => {
        if (!unlocked) {
          const r = CoinManager.buySkin(skin.id);
          if (r.ok) { this._toast(r.msg); this.scene.restart(); }
          else        this._toast(r.msg);
        } else {
          CoinManager.equipSkin(skin.id);
          this._toast(`Skin ${skin.name} equipada`);
          this.scene.restart();
        }
      });
      y += 28;
    });

    // Power-ups
    y += 10;
    this.add.text(cx, y, '— POWER-UPS —', { fontSize: '14px', fill: '#aaaaaa', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(21);
    y += 28;

    POWERUPS.forEach(pu => {
      const stock = CoinManager.getPowerUpStock(pu.id);
      const col   = coins >= pu.cost ? '#ffcc00' : '#888888';
      const t = this.add.text(cx, y, `${pu.name} x${stock} — 🪙${pu.cost}  (+1)`, {
        fontSize: '13px', fill: col, fontFamily: 'monospace'
      }).setOrigin(0.5).setDepth(21).setInteractive({ useHandCursor: true });

      t.on('pointerdown', () => {
        const r = CoinManager.buyPowerUp(pu.id);
        this._toast(r.msg);
        if (r.ok) this.scene.restart();
      });
      y += 28;
    });

    // Cerrar
    const close = this.add.text(cx, y + 20, '✕ Cerrar', {
      fontSize: '16px', fill: '#ff4444', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(21).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => {
      panel.destroy(); this.children.list.filter(c => c.depth === 21).forEach(c => c.destroy());
    });
  }

  async _openPremium() {
    if (BillingManager.isPremium()) {
      this._toast('¡Ya eres Premium! ⭐');
      return;
    }
    this._toast('Iniciando compra…');
    const ok = await BillingManager.purchaseSubscription();
    this._toast(ok ? '¡Bienvenido a Premium! ⭐' : 'Compra cancelada');
    if (ok) this.scene.restart();
  }

  _toast(msg) {
    const { width } = this.scale;
    const t = this.add.text(width / 2, 60, msg, {
      fontSize: '15px', fill: '#ffffff', backgroundColor: '#000000aa',
      padding: { x: 14, y: 7 }, fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, alpha: 0, delay: 1800, duration: 400, onComplete: () => t.destroy() });
  }

  _createStars() {
    const { width, height } = this.scale;

    // Estrellas estáticas en un solo Graphics (sin costo de GameObject por estrella)
    const g = this.add.graphics().setDepth(0);
    for (let i = 0; i < 80; i++) {
      g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.2, 0.7));
      g.fillCircle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.FloatBetween(0.5, 1.4)
      );
    }

    // Pocas estrellas grandes con tween de parpadeo
    for (let i = 0; i < 30; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.FloatBetween(1, 2),
        0xffffff,
        Phaser.Math.FloatBetween(0.5, 1)
      ).setDepth(0);
      this.tweens.add({
        targets:  star,
        alpha:    0.1,
        yoyo:     true,
        repeat:   -1,
        duration: Phaser.Math.Between(1200, 3000),
        delay:    Phaser.Math.Between(0, 1500),  // escalonar para no arrancar todos juntos
      });
    }
  }

  _spawnDecoAsteroids() {
    const { width, height } = this.scale;
    for (let i = 0; i < 4; i++) {
      const img = this.add.image(
        Phaser.Math.Between(50, width - 50),
        Phaser.Math.Between(200, height - 50),
        'asteroid_large'
      ).setAlpha(0.15).setDepth(0).setScale(0.6);

      this.tweens.add({
        targets: img,
        x: img.x + Phaser.Math.Between(-60, 60),
        y: img.y + Phaser.Math.Between(-60, 60),
        angle: 360,
        duration: Phaser.Math.Between(8000, 14000),
        repeat: -1,
        yoyo: true,
      });
    }
  }
}

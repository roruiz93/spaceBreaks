import { Storage }        from '../utils/Storage.js';
import { AdMobManager }   from '../managers/AdMobManager.js';
import { BillingManager } from '../managers/BillingManager.js';
import { CoinManager }    from '../managers/CoinManager.js';

const COIN_REVIVE_COST = 50;
const PREMIUM_MAX_REVIVES = 2;

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }

  init(data) {
    this.finalScore  = data.score       ?? 0;
    this.bestScore   = data.best        ?? 0;
    this.coinsEarned = data.coins       ?? 0;
    this.wave        = data.wave        ?? 1;
    this.isPremium   = data.premium     ?? false;
    this.reviveCount = data.reviveCount ?? 0;
    this.gamesPlayed = Storage.getGamesPlayed();
    this._revived    = false;
  }

  async create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    this._createStars();

    // ── Título ────────────────────────────────────────────────
    this.add.text(cx, 80, 'GAME OVER', {
      fontSize: '40px', fill: '#ff4444',
      fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#880000', strokeThickness: 4
    }).setOrigin(0.5);

    // ── Stats ─────────────────────────────────────────────────
    const isNew = this.finalScore >= this.bestScore && this.finalScore > 0;

    this.add.text(cx, 160, `Puntaje: ${this.finalScore}`, {
      fontSize: '26px', fill: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5);

    if (isNew) {
      this.add.text(cx, 198, '🏆 ¡NUEVO RÉCORD!', {
        fontSize: '18px', fill: '#ffcc00', fontFamily: 'monospace'
      }).setOrigin(0.5);
    } else {
      this.add.text(cx, 198, `Récord: ${this.bestScore}`, {
        fontSize: '16px', fill: '#aaaaaa', fontFamily: 'monospace'
      }).setOrigin(0.5);
    }

    this.add.text(cx, 230, `Oleada: ${this.wave}`, {
      fontSize: '15px', fill: '#aaaaaa', fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.add.text(cx, 256, `🪙 +${this.coinsEarned} monedas`, {
      fontSize: '16px', fill: '#ffcc00', fontFamily: 'monospace'
    }).setOrigin(0.5);

    // ── Botones de revivir ────────────────────────────────────
    let btnY = 316;

    // Premium: hasta 2 revividas gratis
    if (this.isPremium && this.reviveCount < PREMIUM_MAX_REVIVES) {
      const left = PREMIUM_MAX_REVIVES - this.reviveCount;
      this._makeButton(
        cx, btnY,
        `⭐  REVIVIR GRATIS  (${left}/${PREMIUM_MAX_REVIVES})`,
        '#ffcc00',
        () => this._doRevive('premium')
      );
      btnY += 66;
    }

    // No premium y primera muerte: revivir con anuncio
    if (!this.isPremium && this.reviveCount === 0) {
      this._makeButton(
        cx, btnY,
        '📺  REVIVIR  (Ver anuncio)',
        '#00ff88',
        () => this._handleAdRevive()
      );
      btnY += 66;
    }

    // Ambos: gastar 50 monedas por una vida
    if (CoinManager.getCoins() >= COIN_REVIVE_COST) {
      this._makeButton(
        cx, btnY,
        `🪙  VIDA  (-${COIN_REVIVE_COST} monedas)`,
        '#ffaa44',
        () => this._handleCoinRevive()
      );
      btnY += 66;
    }

    // ── Navegación ────────────────────────────────────────────
    this._makeButton(cx, btnY,      '▶  JUGAR DE NUEVO', '#00ffff', () => this._restart());
    this._makeButton(cx, btnY + 64, '🏠  MENÚ',           '#aaaaaa', () => this._goMenu());

    // ── Interstitial cada 3 partidas ─────────────────────────
    if (!this.isPremium && this.gamesPlayed % 3 === 0) {
      await this._showInterstitial();
    }
  }

  // ── Revivir: acción central ────────────────────────────────
  _doRevive(source = '') {
    if (this._revived) return;
    this._revived = true;

    const msgs = { premium: '¡Revivida premium! ⭐', ad: '¡Reviviendo! 🎬', coins: `🪙 -${COIN_REVIVE_COST}  ¡Reviviendo!` };
    this._toast(msgs[source] ?? '¡Reviviendo!');

    this.time.delayedCall(900, () => {
      this.scene.start('GameScene', {
        reviveScore: this.finalScore,
        reviveWave:  this.wave,
        reviving:    true,
        reviveCount: this.reviveCount + 1,
      });
    });
  }

  // ── Revivir con anuncio ────────────────────────────────────
  async _handleAdRevive() {
    if (this._revived) return;
    this._toast('Cargando anuncio…');
    const ok = await AdMobManager.showRewarded(() => this._doRevive('ad'));
    if (!ok) this._toast('Anuncio cancelado');
  }

  // ── Revivir con monedas ────────────────────────────────────
  _handleCoinRevive() {
    if (this._revived) return;
    if (!Storage.spendCoins(COIN_REVIVE_COST)) {
      this._toast('Monedas insuficientes');
      return;
    }
    this._doRevive('coins');
  }

  // ── Interstitial ───────────────────────────────────────────
  async _showInterstitial() {
    return new Promise(resolve => {
      this.time.delayedCall(800, async () => {
        await AdMobManager.showInterstitial();
        resolve();
      });
    });
  }

  // ── Navegación ─────────────────────────────────────────────
  _restart() {
    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => this.scene.start('GameScene'));
  }

  _goMenu() {
    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => this.scene.start('MenuScene'));
  }

  // ── UI helpers ─────────────────────────────────────────────
  _makeButton(x, y, label, color, callback) {
    const btn = this.add.text(x, y, label, {
      fontSize: '18px', fill: color, fontFamily: 'monospace', fontStyle: 'bold',
      backgroundColor: '#111122', padding: { x: 20, y: 11 },
      stroke: color, strokeThickness: 1
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover',  () => btn.setScale(1.06));
    btn.on('pointerout',   () => btn.setScale(1));
    btn.on('pointerdown',  () => { btn.setScale(0.96); callback(); });
    return btn;
  }

  _toast(msg) {
    const { width } = this.scale;
    const t = this.add.text(width / 2, 50, msg, {
      fontSize: '15px', fill: '#ffffff', backgroundColor: '#000000cc',
      padding: { x: 14, y: 7 }, fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 400, onComplete: () => t.destroy() });
  }

  _createStars() {
    const { width, height } = this.scale;
    const g = this.add.graphics().setDepth(0);
    for (let i = 0; i < 80; i++) {
      g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.1, 0.7));
      g.fillCircle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.FloatBetween(0.5, 1.8)
      );
    }
  }
}

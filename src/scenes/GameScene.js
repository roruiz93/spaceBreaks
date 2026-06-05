import { Player }       from '../objects/Player.js';
import { Asteroid }     from '../objects/Asteroid.js';
import { Enemy }        from '../objects/Enemy.js';
import { EnemyShip }   from '../objects/EnemyShip.js';
import { Storage }      from '../utils/Storage.js';
import { AdMobManager } from '../managers/AdMobManager.js';
import { BillingManager } from '../managers/BillingManager.js';
import { CoinManager, coinsForScore } from '../managers/CoinManager.js';

// ── Constantes de dificultad ──────────────────────────────────
const DIFF = [
  { score: 0,    asteroids: 4,  speedMult: 1.0,  enemyChance: 0,   shipChance: 0    },
  { score: 500,  asteroids: 5,  speedMult: 1.1,  enemyChance: 0,   shipChance: 0.25 },
  { score: 1000, asteroids: 6,  speedMult: 1.2,  enemyChance: 0.2, shipChance: 0.35 },
  { score: 2000, asteroids: 7,  speedMult: 1.35, enemyChance: 0.3, shipChance: 0.45 },
  { score: 3500, asteroids: 8,  speedMult: 1.5,  enemyChance: 0.4, shipChance: 0.55 },
  { score: 5000, asteroids: 10, speedMult: 1.7,  enemyChance: 0.5, shipChance: 0.65 },
  { score: 8000, asteroids: 12, speedMult: 2.0,  enemyChance: 0.6, shipChance: 0.75 },
];

function getDiff(score) {
  let d = DIFF[0];
  for (const lvl of DIFF) { if (score >= lvl.score) d = lvl; }
  return d;
}

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  init(data) {
    this._reviveData = data ?? {};
  }

  create() {
    const { width, height } = this.scale;

    // Estado
    this.score       = this._reviveData.reviveScore  ?? 0;
    this.reviveCount = this._reviveData.reviveCount ?? 0;
    this.combo      = 0;
    this.comboClock = 0;
    this.comboMult  = 1;
    this.wave       = this._reviveData.reviveWave  ?? 0;
    this.paused     = false;
    this.gameOver   = false;

    this.isPremium  = BillingManager.isPremium();
    this.scoreBonus = this.isPremium ? 1.2 : 1.0;

    // Fondo estrellado
    this._createStars();

    // ── Grupos ───────────────────────────────────────────────
    this.asteroids    = this.add.group();
    this.enemies      = this.add.group();
    this.coins        = this.physics.add.group();
    this.magnetActive = false;
    this.magnetTimer  = 0;

    // ── Player ───────────────────────────────────────────────
    const skinId    = Storage.getActiveSkin();
    const startLives = this._reviveData.reviving ? 1 : 3;
    this.player      = new Player(this, width / 2, height / 2, skinId, startLives);

    // ── Power-ups activos al inicio de partida ───────────────
    this._applyStartPowerUps();

    // ── Controles ────────────────────────────────────────────
    this._setupKeyboard();
    this._setupTouchControls();

    // ── HUD ──────────────────────────────────────────────────
    this._createHUD();

    // ── Primer oleada ────────────────────────────────────────
    this._spawnWave();

    // ── Timers ───────────────────────────────────────────────
    this.waveTimer = this.time.addEvent({
      delay: 100, loop: true, callback: this._checkWave, callbackScope: this
    });

    // ── Colisiones ───────────────────────────────────────────
    this._setupCollisions();

    // ── AdMob: banner para no premium ───────────────────────
    if (!this.isPremium) AdMobManager.showBanner();
  }

  // ═══════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════
  update(time, delta) {
    if (this.paused || this.gameOver) return;

    const player = this.player;

    if (player.isAlive) {
      // Controles teclado
      if (this.cursors.left.isDown  || this.keys.A.isDown) player.rotateLeft(delta);
      if (this.cursors.right.isDown || this.keys.D.isDown) player.rotateRight(delta);

      if (this.cursors.up.isDown || this.keys.W.isDown || this._touchThrust) {
        player.thrust(delta);
      } else {
        player.stopThrust();
      }

      if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || this.touchFire) {
        player.fire(time);
      }

      // Disparo continuo si se mantiene presionado
      if (this.keys.SPACE.isDown) player.fire(time);

      player.wrapAround();
      player.updateShieldPos();
    }

    // Combo timeout
    if (this.combo > 0) {
      this.comboClock -= delta;
      if (this.comboClock <= 0) this._resetCombo();
    }

    // Magnet: atraer monedas hacia el jugador
    if (this.magnetActive) {
      this.magnetTimer -= delta;
      if (this.magnetTimer <= 0) {
        this.magnetActive = false;
        if (this._magnetLabel) { this._magnetLabel.destroy(); this._magnetLabel = null; }
      } else {
        this.coins.getChildren().forEach(coin => {
          if (!coin.active) return;
          const angle = Phaser.Math.Angle.Between(coin.x, coin.y, player.x, player.y);
          coin.body.setVelocity(Math.cos(angle) * 240, Math.sin(angle) * 240);
        });
      }
    }

    this._updateHUD();
  }

  // ═══════════════════════════════════════════════════════════
  // COLISIONES
  // ═══════════════════════════════════════════════════════════
  // Helpers para identificar objetos sin importar el orden que Phaser los pase
  _isBullet(obj)   { return typeof obj.kill === 'function' && obj.lifespan !== undefined; }
  _isAsteroid(obj) { return typeof obj.explode === 'function'; }
  _isEnemy(obj)    { return typeof obj.hit === 'function' && typeof obj.die === 'function'; }

  _setupCollisions() {
    const player = this.player;

    // Bala del jugador vs Asteroide
    this.physics.add.overlap(
      player.bullets, this.asteroids,
      (a, b) => {
        const bullet   = this._isBullet(a) ? a : b;
        const asteroid = this._isAsteroid(a) ? a : b;
        if (!bullet.active || !asteroid.active) return;
        bullet.kill();
        this._hitAsteroid(asteroid);
      }
    );

    // Bala del jugador vs Enemigo
    this.physics.add.overlap(
      player.bullets, this.enemies,
      (a, b) => {
        const bullet = this._isBullet(a) ? a : b;
        const enemy  = this._isEnemy(a)  ? a : b;
        if (!bullet.active || !enemy.active) return;
        bullet.kill();
        if (enemy.hit()) {
          const { x, y } = enemy;
          this._addScore(enemy.scoreVal, x, y);
          this._spawnCoin(x + Phaser.Math.Between(-12, 12), y + Phaser.Math.Between(-12, 12));
          this._spawnCoin(x + Phaser.Math.Between(-12, 12), y + Phaser.Math.Between(-12, 12));
          enemy.die(this);
          this.enemies.remove(enemy, false, false);
          this._incrementCombo();
        }
      }
    );

    // Asteroide vs Player
    this.physics.add.overlap(
      player, this.asteroids,
      (a, b) => {
        const asteroid = this._isAsteroid(a) ? a : b;
        if (!asteroid.active || player.invincible) return;
        const died = player.hit(this);
        this._hitAsteroid(asteroid);
        if (died) this._onPlayerDied();
      }
    );

    // Enemigo vs Player
    this.physics.add.overlap(
      player, this.enemies,
      () => {
        if (player.invincible) return;
        const died = player.hit(this);
        if (died) this._onPlayerDied();
      }
    );

    // Monedas vs Player
    this.physics.add.overlap(
      player, this.coins,
      (p, coin) => {
        if (!coin.active) return;
        const cx = coin.x, cy = coin.y;
        this.tweens.killTweensOf(coin);
        coin.destroy();
        CoinManager.addCoins(1);
        const t = this.add.text(cx, cy - 10, '+1🪙', {
          fontSize: '13px', fill: '#ffcc00', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(20);
        this.tweens.add({ targets: t, y: cy - 40, alpha: 0, duration: 700, onComplete: () => t.destroy() });
      }
    );
  }

  _hitAsteroid(asteroid) {
    if (!asteroid.active) return;
    const speedMult = getDiff(this.score).speedMult;
    const { x, y }  = asteroid;
    const children  = asteroid.explode(this, speedMult);
    this._addScore(asteroid.scoreVal, x, y);
    this._incrementCombo();
    this._spawnCoin(x, y);

    children.forEach(child => {
      this.asteroids.add(child);   // el overlap de grupo lo cubre automáticamente
    });
    this.asteroids.remove(asteroid, false, false);
  }

  // ═══════════════════════════════════════════════════════════
  // SCORE Y COMBO
  // ═══════════════════════════════════════════════════════════
  _addScore(base, x, y) {
    const pts = Math.round(base * this.comboMult * this.scoreBonus);
    this.score += pts;

    // Floating text
    const ft = this.add.text(x, y - 20, `+${pts}`, {
      fontSize: '16px',
      fill:     this.comboMult > 1 ? '#ffcc00' : '#ffffff',
      fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: ft, y: y - 70, alpha: 0, duration: 900,
      ease: 'Power1', onComplete: () => ft.destroy()
    });
  }

  _incrementCombo() {
    this.combo++;
    this.comboClock = 3000; // 3s para seguir el combo
    this.comboMult  = this.combo >= 8 ? 4 : this.combo >= 4 ? 3 : this.combo >= 2 ? 2 : 1;
    if (this.combo >= 2) this._showComboLabel();
  }

  _resetCombo() {
    this.combo     = 0;
    this.comboMult = 1;
    if (this.comboLabel) { this.comboLabel.setVisible(false); }
  }

  _showComboLabel() {
    this.comboLabel.setText(`COMBO x${this.comboMult}!`).setVisible(true);
    this.tweens.killTweensOf(this.comboLabel);
    this.tweens.add({ targets: this.comboLabel, scaleX: 1.3, scaleY: 1.3, yoyo: true, duration: 150 });
  }

  // ═══════════════════════════════════════════════════════════
  // WAVES
  // ═══════════════════════════════════════════════════════════
  _checkWave() {
    const remaining = this.asteroids.getLength() + this.enemies.getLength();
    if (remaining === 0) this._spawnWave();
  }

  _spawnWave() {
    this.wave++;
    const diff = getDiff(this.score);
    const { width, height } = this.scale;

    // Asteroides — los overlaps de grupo en _setupCollisions() cubren todos los miembros
    const count = diff.asteroids + Math.floor(this.wave / 3);
    for (let i = 0; i < count; i++) {
      const pos = this._safeSpawnPos(width, height);
      const ast = new Asteroid(this, pos.x, pos.y, 'large', diff.speedMult);
      this.asteroids.add(ast);
    }

    // Enemigo (probabilidad progresiva)
    if (this.wave >= 3 && Math.random() < diff.enemyChance) {
      const side = Phaser.Math.Between(0, 3);
      let ex, ey;
      if (side === 0) { ex = -30;         ey = Phaser.Math.Between(0, height); }
      else if (side === 1) { ex = width + 30; ey = Phaser.Math.Between(0, height); }
      else if (side === 2) { ex = Phaser.Math.Between(0, width); ey = -30; }
      else               { ex = Phaser.Math.Between(0, width); ey = height + 30; }

      const enemy = new Enemy(this, ex, ey, diff.speedMult);
      this.enemies.add(enemy);

      // Bala enemiga vs jugador
      this.physics.add.overlap(this.player, enemy.bullets, () => {
        if (!this.player.invincible) {
          const died = this.player.hit(this);
          if (died) this._onPlayerDied();
        }
      });
    }

    // Caza enemigo rojo (desde wave 2, probabilidad shipChance)
    if (this.wave >= 2 && Math.random() < diff.shipChance) {
      const side2 = Phaser.Math.Between(0, 3);
      let sx, sy;
      if (side2 === 0)      { sx = -30;         sy = Phaser.Math.Between(0, height); }
      else if (side2 === 1) { sx = width + 30;  sy = Phaser.Math.Between(0, height); }
      else if (side2 === 2) { sx = Phaser.Math.Between(0, width); sy = -30; }
      else                  { sx = Phaser.Math.Between(0, width); sy = height + 30; }

      const ship = new EnemyShip(this, sx, sy, diff.speedMult);
      this.enemies.add(ship);

      this.physics.add.overlap(this.player, ship.bullets, () => {
        if (!this.player.invincible) {
          const died = this.player.hit(this);
          if (died) this._onPlayerDied();
        }
      });
    }

    // Indicador de oleada
    const wt = this.add.text(this.scale.width / 2, this.scale.height / 2, `OLEADA ${this.wave}`, {
      fontSize: '28px', fill: '#ffffff', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setAlpha(0).setDepth(30);
    this.tweens.add({ targets: wt, alpha: 1, yoyo: true, duration: 600, delay: 100, onComplete: () => wt.destroy() });
  }

  /** Posición fuera del centro para que no aparezca encima del jugador */
  _safeSpawnPos(width, height) {
    const margin = 60;
    const side   = Phaser.Math.Between(0, 3);
    if (side === 0) return { x: Phaser.Math.Between(margin, width - margin), y: margin };
    if (side === 1) return { x: Phaser.Math.Between(margin, width - margin), y: height - margin };
    if (side === 2) return { x: margin,         y: Phaser.Math.Between(margin, height - margin) };
    return             { x: width - margin, y: Phaser.Math.Between(margin, height - margin) };
  }

  // ═══════════════════════════════════════════════════════════
  // GAME OVER
  // ═══════════════════════════════════════════════════════════
  _onPlayerDied() {
    if (this.gameOver) return;
    this.gameOver = true;

    AdMobManager.removeBanner();

    // Ocultar joystick táctil
    if (this.touchUI) this.touchUI.forEach(c => c.setVisible(false));

    this.time.delayedCall(1200, () => {
      Storage.incrementGamesPlayed();
      const earned = coinsForScore(this.score);
      CoinManager.addCoins(earned);

      // Guardar best score
      if (this.score > Storage.getBestScore()) Storage.setBestScore(this.score);

      this.scene.start('GameOverScene', {
        score:        this.score,
        best:         Storage.getBestScore(),
        coins:        earned,
        wave:         this.wave,
        premium:      this.isPremium,
        reviveCount:  this.reviveCount,
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // HUD
  // ═══════════════════════════════════════════════════════════
  _createHUD() {
    const pad = 16;

    this.hudScore = this.add.text(pad, pad, 'Score: 0', {
      fontSize: '18px', fill: '#ffffff', fontFamily: 'monospace'
    }).setDepth(50).setScrollFactor(0);

    this.hudWave = this.add.text(pad, pad + 24, 'Oleada: 1', {
      fontSize: '14px', fill: '#aaaaaa', fontFamily: 'monospace'
    }).setDepth(50).setScrollFactor(0);

    // Vidas
    this.hudLives = [];
    for (let i = 0; i < 3; i++) {
      const h = this.add.image(this.scale.width - pad - i * 26, pad + 10, 'heart')
        .setOrigin(1, 0).setDepth(50).setScrollFactor(0).setScale(0.9);
      this.hudLives.push(h);
    }

    // Multiplicador (pequeño, en HUD superior)
    this.hudMult = this.add.text(this.scale.width / 2, pad, 'x1', {
      fontSize: '16px', fill: '#ffcc00', fontFamily: 'monospace'
    }).setOrigin(0.5, 0).setDepth(50).setScrollFactor(0).setVisible(false);

    // Etiqueta de combo grande (centro pantalla)
    this.comboLabel = this.add.text(this.scale.width / 2, 80, 'COMBO x2!', {
      fontSize: '22px', fill: '#ffcc00', fontFamily: 'monospace',
      stroke: '#884400', strokeThickness: 3
    }).setOrigin(0.5).setDepth(25).setVisible(false);

    // Premium badge
    if (this.isPremium) {
      this.add.text(this.scale.width - pad, pad + 30, '⭐+20%', {
        fontSize: '11px', fill: '#ffcc00', fontFamily: 'monospace'
      }).setOrigin(1, 0).setDepth(50).setScrollFactor(0);
    }
  }

  _updateHUD() {
    this.hudScore.setText(`Score: ${this.score}`);
    this.hudWave.setText(`Oleada: ${this.wave}`);
    this.hudMult.setVisible(this.comboMult > 1).setText(`x${this.comboMult}`);

    // Vidas
    const lives = this.player.lives;
    this.hudLives.forEach((h, i) => h.setVisible(i < lives));
  }

  // ═══════════════════════════════════════════════════════════
  // CONTROLES
  // ═══════════════════════════════════════════════════════════
  _setupKeyboard() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys    = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });
  }

  _setupTouchControls() {
    const { width, height } = this.scale;
    const bSize = 70, margin = 20, alpha = 0.35;
    this.touchFire = false;
    this.touchUI   = [];

    // Botón IZQUIERDA
    const btnL = this._touchBtn(margin + bSize / 2, height - margin - bSize / 2, '◀', bSize, alpha);
    btnL.on('pointerdown', () => { this._touchLeft = true; });
    btnL.on('pointerup',   () => { this._touchLeft = false; });
    btnL.on('pointerout',  () => { this._touchLeft = false; });

    // Botón DERECHA
    const btnR = this._touchBtn(margin + bSize * 1.5 + 10, height - margin - bSize / 2, '▶', bSize, alpha);
    btnR.on('pointerdown', () => { this._touchRight = true; });
    btnR.on('pointerup',   () => { this._touchRight = false; });
    btnR.on('pointerout',  () => { this._touchRight = false; });

    // Botón THRUST (arriba)
    const btnT = this._touchBtn(margin + bSize, height - margin - bSize * 1.6, '▲', bSize, alpha);
    btnT.on('pointerdown', () => { this._touchThrust = true; });
    btnT.on('pointerup',   () => { this._touchThrust = false; });
    btnT.on('pointerout',  () => { this._touchThrust = false; });

    // Botón FUEGO (derecha)
    const btnF = this._touchBtn(width - margin - bSize / 2, height - margin - bSize / 2, '🔥', bSize, alpha);
    btnF.on('pointerdown', () => { this.touchFire = true; });
    btnF.on('pointerup',   () => { this.touchFire = false; });
    btnF.on('pointerout',  () => { this.touchFire = false; });

    // Rotación y disparo táctil — thrust se maneja en update() para evitar conflicto
    this.events.on('update', (time, delta) => {
      if (this.paused || this.gameOver || !this.player.isAlive) return;
      if (this._touchLeft)  this.player.rotateLeft(delta);
      if (this._touchRight) this.player.rotateRight(delta);
      if (this.touchFire)   this.player.fire(time);
    });

    this.touchUI = [btnL, btnR, btnT, btnF];
  }

  _touchBtn(x, y, label, size, alpha) {
    const btn = this.add.text(x, y, label, {
      fontSize: `${size * 0.45}px`, fill: '#ffffff',
      backgroundColor: '#ffffff22',
      padding: { x: size * 0.2, y: size * 0.15 }
    }).setOrigin(0.5).setAlpha(alpha).setDepth(60).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    return btn;
  }

  // ═══════════════════════════════════════════════════════════
  // POWER-UPS AL INICIO
  // ═══════════════════════════════════════════════════════════
  _applyStartPowerUps() {
    if (this._reviveData.reviving) return;
    if (CoinManager.usePowerUp('shield'))    this.player.activateShield(this);
    if (CoinManager.usePowerUp('rapidfire')) this.player.activateRapidFire(10000);
    if (CoinManager.usePowerUp('bomb'))      this._activateBomb();
    if (CoinManager.usePowerUp('magnet'))    this._activateMagnet(15000);
  }

  // ═══════════════════════════════════════════════════════════
  // POWER-UPS ESPECIALES
  // ═══════════════════════════════════════════════════════════
  _activateBomb() {
    // Se ejecuta 300ms después para que la primera oleada ya haya spawneado
    this.time.delayedCall(300, () => {
      const targets = [...this.asteroids.getChildren()];
      targets.forEach(ast => {
        if (!ast.active) return;
        const emitter = this.add.particles(ast.x, ast.y, 'particle', {
          speed: { min: 60, max: 200 }, scale: { start: 0.5, end: 0 },
          lifespan: 500, quantity: 10, tint: [0xff8800, 0xffff00, 0xffffff], emitting: false,
        });
        emitter.explode(10);
        this.time.delayedCall(600, () => emitter.destroy());
        this._addScore(ast.scoreVal, ast.x, ast.y);
        this._spawnCoin(ast.x, ast.y);
        ast.destroy();
      });
      this.asteroids.clear(false, false);
      this.cameras.main.shake(250, 0.012);
    });
  }

  _activateMagnet(duration = 15000) {
    this.magnetActive = true;
    this.magnetTimer  = duration;
    this._magnetLabel = this.add.text(this.scale.width / 2, 110, '🧲 IMÁN', {
      fontSize: '15px', fill: '#aaffff', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(50).setScrollFactor(0);
  }

  // ═══════════════════════════════════════════════════════════
  // MONEDAS
  // ═══════════════════════════════════════════════════════════
  _spawnCoin(x, y) {
    const coin = this.coins.create(x, y, 'coin');
    if (!coin) return;
    coin.setDepth(6).setScale(0.85);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const speed = Phaser.Math.Between(40, 90);
    coin.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    coin.body.setDrag(80);
    // Fade out y destruir tras 5s (fade en los últimos 1.5s)
    this.tweens.add({
      targets: coin, alpha: 0,
      delay: 3500, duration: 1500,
      onComplete: () => { if (coin.active) coin.destroy(); }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // ESTRELLAS DE FONDO
  // ═══════════════════════════════════════════════════════════
  _createStars() {
    // Un solo Graphics en lugar de 100 GameObjects individuales
    const { width, height } = this.scale;
    const g = this.add.graphics().setDepth(0);
    for (let i = 0; i < 100; i++) {
      const alpha = Phaser.Math.FloatBetween(0.2, 0.9);
      const r     = Phaser.Math.FloatBetween(0.5, 1.8);
      g.fillStyle(0xffffff, alpha);
      g.fillCircle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        r
      );
    }
  }
}

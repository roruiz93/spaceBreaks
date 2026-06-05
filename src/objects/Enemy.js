import { Bullet } from './Bullet.js';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  /**
   * OVNI enemigo:
   * - Sigue al jugador con movimiento sinusoidal
   * - Dispara hacia el jugador cada X ms
   * - Score: +50
   */
  constructor(scene, x, y, speedMult = 1) {
    super(scene, x, y, 'enemy');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.scoreVal  = 50;
    this.speedMult = speedMult;
    this.speed     = 100 * speedMult;
    this.hp        = 2;

    this.body.setCircle(18);
    this.setDepth(8);
    this.setTint(0xff4444);

    // Disparo
    this.bullets      = scene.physics.add.group({ classType: Bullet, maxSize: 10, runChildUpdate: true });
    this.fireInterval = 2200 / speedMult;
    this.lastFired    = scene.time.now + 2000; // no dispara los primeros 2s

    // Movimiento sinusoidal
    this.sineT       = 0;
    this.sineMag     = 60;
    this.sineSpeed   = 0.04;

    this.setDepth(8);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.scene || !this.active) return;

    const player = this.scene.player;
    if (!player || !player.isAlive) return;

    // Mover hacia el jugador
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.sineT += this.sineSpeed;
    const perpX = Math.cos(angle + Math.PI / 2) * Math.sin(this.sineT) * this.sineMag;
    const perpY = Math.sin(angle + Math.PI / 2) * Math.sin(this.sineT) * this.sineMag;

    this.body.setVelocity(
      Math.cos(angle) * this.speed + perpX,
      Math.sin(angle) * this.speed + perpY
    );

    // Rotar hacia el jugador
    this.setRotation(angle + Math.PI / 2);

    // Disparo
    if (time - this.lastFired > this.fireInterval) {
      this._fireAt(player, time);
      this.lastFired = time;
    }

    // Wrap
    this._wrap();
  }

  _fireAt(target, time) {
    const bullet = this.bullets.get();
    if (!bullet) return;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const deg   = Phaser.Math.RadToDeg(angle) + 90;
    bullet.fire(this.x, this.y, deg, 280, true);
  }

  hit() {
    this.hp--;
    this.scene.tweens.add({
      targets: this, alpha: 0.3, yoyo: true, duration: 80, repeat: 2,
      onComplete: () => this.setAlpha(1)
    });
    return this.hp <= 0;
  }

  die(scene) {
    const emitter = scene.add.particles(this.x, this.y, 'particle', {
      speed:    { min: 80, max: 280 },
      scale:    { start: 0.8, end: 0 },
      lifespan: 700,
      quantity: 30,
      tint:     [0xff4444, 0xff8800, 0xffff00],
      emitting: false,
    });
    emitter.explode(30);
    scene.time.delayedCall(800, () => emitter.destroy());
    scene.cameras.main.shake(200, 0.01);
    this.destroy();
  }

  _wrap() {
    const { width, height } = this.scene.scale;
    if (this.x < -30)         this.x = width  + 30;
    if (this.x > width  + 30) this.x = -30;
    if (this.y < -30)         this.y = height + 30;
    if (this.y > height + 30) this.y = -30;
  }
}

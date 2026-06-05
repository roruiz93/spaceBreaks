import { Bullet } from './Bullet.js';

export class EnemyShip extends Phaser.Physics.Arcade.Sprite {
  /**
   * Caza enemigo rojo:
   * - Persecución directa y agresiva al jugador
   * - 1 HP (muere de un disparo)
   * - Más rápido que el OVNI
   * - Dispara en ráfaga corta cada ~1.4s
   * - Score: 40 pts
   */
  constructor(scene, x, y, speedMult = 1) {
    super(scene, x, y, 'enemy_ship');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.scoreVal     = 40;
    this.speedMult    = speedMult;
    this.speed        = 145 * speedMult;
    this.hp           = 1;

    this.body.setSize(28, 28);
    this.setDepth(8);
    this.setTint(0xff2200);

    // Disparo
    this.bullets      = scene.physics.add.group({ classType: Bullet, maxSize: 12, runChildUpdate: true });
    this.fireInterval = 1400 / speedMult;
    this.lastFired    = scene.time.now + 1500; // pausa inicial
    this._burstCount  = 0;
    this._burstTimer  = 0;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.scene || !this.active) return;

    const player = this.scene.player;
    if (!player || !player.isAlive) return;

    // Persecución directa
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.body.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
    this.setRotation(angle + Math.PI / 2);

    // Ráfaga: 2 disparos con 120ms de separación
    if (this._burstCount > 0) {
      this._burstTimer -= delta;
      if (this._burstTimer <= 0) {
        this._fireAt(player);
        this._burstCount--;
        this._burstTimer = 120;
      }
    } else if (time - this.lastFired > this.fireInterval) {
      this._fireAt(player);
      this._burstCount = 1;   // un disparo adicional vendrá 120ms después
      this._burstTimer = 120;
      this.lastFired   = time;
    }

    this._wrap();
  }

  _fireAt(target) {
    const bullet = this.bullets.get();
    if (!bullet) return;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    bullet.fire(this.x, this.y, Phaser.Math.RadToDeg(angle) + 90, 320, true);
    bullet.setTint(0xff4400);
  }

  hit() {
    this.hp--;
    this.scene.tweens.add({
      targets: this, alpha: 0.2, yoyo: true, duration: 60, repeat: 2,
      onComplete: () => this.setAlpha(1),
    });
    return this.hp <= 0;
  }

  die(scene) {
    const emitter = scene.add.particles(this.x, this.y, 'particle', {
      speed:    { min: 100, max: 300 },
      scale:    { start: 0.9, end: 0 },
      lifespan: 650,
      quantity: 25,
      tint:     [0xff2200, 0xff6600, 0xffaa00, 0xffffff],
      emitting: false,
    });
    emitter.explode(25);
    scene.time.delayedCall(750, () => emitter.destroy());
    scene.cameras.main.shake(180, 0.009);
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

import { Bullet } from './Bullet.js';

const SHIP_COLORS = {
  default: 0x00ffff, fire: 0xff4400, ice: 0x44aaff,
  gold: 0xffcc00, phantom: 0x8800ff
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, skinId = 'default', lives = 3) {
    super(scene, x, y, 'ship');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.skinId     = skinId;
    this.lives      = lives;
    this.isAlive    = true;
    this.invincible = false;
    this.hasShield  = false;

    // Física
    this.setDamping(true);
    this.setDrag(0.98);
    this.setMaxVelocity(400);
    this.body.setSize(28, 28);
    this.setDepth(10);

    // Disparo
    this.bullets       = scene.physics.add.group({ classType: Bullet, maxSize: 30, runChildUpdate: true });
    this.fireRate      = 250; // ms entre disparos
    this.lastFired     = 0;
    this.rapidFire     = false;
    this.rapidFireTime = 0;

    // Thruster particles
    this._createThrusterFX(scene);

    // Tint según skin
    this.setTint(SHIP_COLORS[skinId] ?? 0x00ffff);
  }

  _createThrusterFX(scene) {
    this.thruster = scene.add.particles(0, 0, 'particle', {
      speed:     { min: 80, max: 140 },
      angle:     { min: -10, max: 10 },
      scale:     { start: 0.6, end: 0 },
      alpha:     { start: 1,   end: 0 },
      lifespan:  220,
      quantity:  2,
      tint:      [0xff6600, 0xffaa00, 0xffffff],
      emitting:  false,
      follow:    this,
      followOffset: { x: 0, y: 20 },
    });
    this.thruster.setDepth(9);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.rapidFire) {
      this.rapidFireTime -= delta;
      if (this.rapidFireTime <= 0) { this.rapidFire = false; this.fireRate = 250; }
    }
  }

  rotateLeft(delta)  { this.angle -= 4 * (delta / 16); }
  rotateRight(delta) { this.angle += 4 * (delta / 16); }

  thrust(delta) {
    const rad = Phaser.Math.DegToRad(this.angle - 90);
    const accel = 320;
    this.body.velocity.x += Math.cos(rad) * accel * (delta / 1000);
    this.body.velocity.y += Math.sin(rad) * accel * (delta / 1000);

    // Activar thruster FX
    if (this.thruster) {
      this.thruster.setAngle({ min: this.angle + 170, max: this.angle + 190 });
      if (!this.thruster.emitting) this.thruster.start();
    }
  }

  stopThrust() {
    if (this.thruster && this.thruster.emitting) this.thruster.stop();
  }

  fire(time) {
    if (!this.isAlive) return null;
    const rate = this.rapidFire ? 80 : this.fireRate;
    if (time - this.lastFired < rate) return null;
    this.lastFired = time;

    const bullet = this.bullets.get();
    if (!bullet) return null;
    bullet.fire(this.x, this.y, this.angle);
    return bullet;
  }

  activateRapidFire(duration = 10000) {
    this.rapidFire     = true;
    this.rapidFireTime = duration;
  }

  activateShield(scene) {
    if (this.hasShield) return;
    this.hasShield = true;
    this.shieldCircle = scene.add.circle(this.x, this.y, 28, 0x00aaff, 0.3)
      .setStrokeStyle(2, 0x00aaff).setDepth(11);
    scene.tweens.add({ targets: this.shieldCircle, alpha: { from: 0.3, to: 0.6 }, yoyo: true, repeat: -1, duration: 500 });
  }

  removeShield() {
    this.hasShield = false;
    if (this.shieldCircle) { this.shieldCircle.destroy(); this.shieldCircle = null; }
  }

  hit(scene) {
    if (this.invincible) return false;
    if (this.hasShield) { this.removeShield(); this._flash(scene); return false; }

    this.lives--;
    if (this.lives <= 0) { this.die(scene); return true; }

    this._flash(scene);
    this.invincible = true;
    scene.time.delayedCall(2500, () => { this.invincible = false; });
    return false;
  }

  die(scene) {
    this.isAlive = false;
    this.setActive(false).setVisible(false);
    if (this.thruster && this.thruster.emitting) this.thruster.stop();
    if (this.shieldCircle) { this.shieldCircle.destroy(); this.shieldCircle = null; }
    this._explode(scene);
  }

  revive(scene) {
    const { width, height } = scene.scale;
    this.setPosition(width / 2, height / 2);
    this.body.setVelocity(0, 0);
    this.setAngle(0);
    this.isAlive   = true;
    this.invincible = true;
    this.setActive(true).setVisible(true);
    this._flash(scene);
    scene.time.delayedCall(2500, () => { this.invincible = false; });
  }

  _flash(scene) {
    scene.tweens.add({
      targets: this, alpha: 0, yoyo: true, repeat: 5,
      duration: 150, ease: 'Linear',
      onComplete: () => { this.setAlpha(1); }
    });
  }

  _explode(scene) {
    const emitter = scene.add.particles(this.x, this.y, 'particle', {
      speed:    { min: 80, max: 250 },
      scale:    { start: 1, end: 0 },
      alpha:    { start: 1, end: 0 },
      lifespan: 800,
      quantity: 40,
      tint:     [0xff6600, 0xffaa00, 0xffffff, 0x00ffff],
      emitting: false,
    });
    emitter.explode(40);
    scene.time.delayedCall(900, () => emitter.destroy());

    scene.cameras.main.shake(300, 0.015);
  }

  wrapAround() {
    const { width, height } = this.scene.scale;
    if (this.x < -20)         this.x = width  + 20;
    if (this.x > width  + 20) this.x = -20;
    if (this.y < -20)         this.y = height + 20;
    if (this.y > height + 20) this.y = -20;
  }

  updateShieldPos() {
    if (this.shieldCircle) {
      this.shieldCircle.setPosition(this.x, this.y);
    }
  }
}

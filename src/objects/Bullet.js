export class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'bullet');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setActive(false).setVisible(false);
    this.lifespan = 0;
  }

  fire(x, y, angle, speed = 600, isEnemy = false) {
    this.setPosition(x, y);
    this.setActive(true).setVisible(true);
    this.isEnemy  = isEnemy;
    this.lifespan = 1800; // ms

    const rad = Phaser.Math.DegToRad(angle - 90);
    this.body.setVelocity(
      Math.cos(rad) * speed,
      Math.sin(rad) * speed
    );
    this.setRotation(Phaser.Math.DegToRad(angle));
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;          // no procesar balas inactivas del pool
    this.lifespan -= delta;
    if (this.lifespan <= 0) this.kill();

    // Wrap por los bordes
    const { width, height } = this.scene.scale;
    if (this.x < 0)       this.x = width;
    if (this.x > width)   this.x = 0;
    if (this.y < 0)       this.y = height;
    if (this.y > height)  this.y = 0;
  }

  kill() {
    this.setActive(false).setVisible(false);
    this.body.setVelocity(0, 0);
  }
}

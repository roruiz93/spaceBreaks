export const ASTEROID_SIZES = {
  large:  { radius: 40, hp: 1, score: 30, speed: [50,  100], nextSize: 'medium', children: 2 },
  medium: { radius: 22, hp: 1, score: 20, speed: [80,  160], nextSize: 'small',  children: 2 },
  small:  { radius: 11, hp: 1, score: 10, speed: [120, 220], nextSize: null,     children: 0 },
};

export class Asteroid extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {'large'|'medium'|'small'} size
   * @param {number} speedMult — multiplicador de dificultad (1.0 = normal)
   */
  constructor(scene, x, y, size = 'large', speedMult = 1) {
    super(scene, x, y, `asteroid_${size}`);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.size      = size;
    this.sizeDef   = ASTEROID_SIZES[size];
    this.scoreVal  = this.sizeDef.score;
    this.speedMult = speedMult;

    this.body.setCircle(this.sizeDef.radius);
    this.setDepth(5);

    // Velocidad aleatoria
    const [minS, maxS] = this.sizeDef.speed;
    const speed = Phaser.Math.Between(minS, maxS) * speedMult;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    // Rotación visual
    this.rotSpeed = Phaser.Math.FloatBetween(-1.5, 1.5);

    // Tint aleatorio sutil
    const tints = [0xbbbbbb, 0xccaaaa, 0xaabbcc, 0xbbccaa];
    this.setTint(Phaser.Utils.Array.GetRandom(tints));
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    this.angle += this.rotSpeed;
    this._wrap();
  }

  _wrap() {
    const { width, height } = this.scene.scale;
    const r = this.sizeDef.radius + 5;
    if (this.x < -r)         this.x = width  + r;
    if (this.x > width  + r) this.x = -r;
    if (this.y < -r)         this.y = height + r;
    if (this.y > height + r) this.y = -r;
  }

  /**
   * Destruye este asteroide y retorna los fragmentos hijos (si aplica).
   * @returns {Asteroid[]} nuevos asteroides
   */
  explode(scene, speedMult = 1) {
    const children = [];
    const def = this.sizeDef;

    if (def.nextSize && def.children > 0) {
      for (let i = 0; i < def.children; i++) {
        const offset = Phaser.Math.Between(-20, 20);
        const child  = new Asteroid(scene, this.x + offset, this.y + offset, def.nextSize, speedMult);
        children.push(child);
      }
    }

    // Partículas de explosión
    const emitter = scene.add.particles(this.x, this.y, 'particle', {
      speed:    { min: 30, max: 120 },
      scale:    { start: 0.5, end: 0 },
      lifespan: 500,
      quantity: 12,
      tint:     [0xbbbbbb, 0xffffff, 0x888888],
      emitting: false,
    });
    emitter.explode(12);
    scene.time.delayedCall(600, () => emitter.destroy());

    this.destroy();
    return children;
  }
}

// Simple particle system
export class Particles {
  constructor(max = 400) {
    this.max = max
    this.list = []
  }
  spawn(p) {
    if (this.list.length >= this.max) this.list.shift()
    this.list.push(p)
  }
  trail(x, y, color) {
    this.spawn({
      x, y,
      vx: -40 - Math.random() * 80,
      vy: -20 + Math.random() * 40,
      life: 0.5 + Math.random() * 0.3,
      age: 0,
      size: 3 + Math.random() * 3,
      color,
      kind: 'trail',
    })
  }
  burst(x, y, color, count = 40) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const s = 120 + Math.random() * 360
      this.spawn({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.6 + Math.random() * 0.7,
        age: 0,
        size: 3 + Math.random() * 5,
        color,
        kind: 'burst',
      })
    }
  }
  ambient(x, y, color) {
    this.spawn({
      x, y,
      vx: -20 - Math.random() * 30,
      vy: -10 + Math.random() * 20,
      life: 1.2 + Math.random() * 0.8,
      age: 0,
      size: 1.5 + Math.random() * 2,
      color,
      kind: 'ambient',
    })
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]
      p.age += dt
      if (p.age >= p.life) { this.list.splice(i, 1); continue }
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 200 * dt  // gravity-ish
      p.vx *= (1 - 0.6 * dt)
    }
  }
  draw(ctx, camX) {
    for (const p of this.list) {
      const t = 1 - p.age / p.life
      const a = t * t
      ctx.globalAlpha = a
      ctx.fillStyle = p.color
      ctx.shadowColor = p.color
      ctx.shadowBlur = 14 * a
      const sz = p.size * (0.5 + 0.5 * t)
      ctx.fillRect(p.x - camX - sz / 2, p.y - sz / 2, sz, sz)
    }
    ctx.globalAlpha = 1
    ctx.shadowBlur = 0
  }
  clear() { this.list.length = 0 }
}

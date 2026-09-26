import Matter from 'matter-js'
import { drawBall } from './ball'

const { Engine, World, Bodies, Body } = Matter

// The drum: a real Matter.js bowl full of balls, swirling on command. It has no opening
// used by physics at all — ejecting and returning a ball is just adding/removing a body
// from the pile; the actual flight between the drum and a pedestal is a scripted
// animation owned by index.ts, not physics. This class only ever decides how the pile
// looks; the result (which item is drawn) is always chosen beforehand by the shared
// engine's family-balanced random pick.

const BALL_COUNT = 38 // enough to pile in the bottom ~40% of the drum, with room above to swirl
const NUMBER_RANGE = 90 // classic bingo range — comfortably more than BALL_COUNT, so numbers never run out
const WALL_SEGMENTS = 30
const SUBSTEPS = 4 // more, smaller physics steps per frame so fast balls can't tunnel through walls
const SOLVER_ITERATIONS = 10

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Ball = { body: Matter.Body; colour: string; number: number }

/** Hands out unique numbers 1..NUMBER_RANGE, shuffled, so no two balls ever match. */
class NumberPool {
  private pool: number[]
  constructor(size: number) {
    this.pool = Array.from({ length: size }, (_, i) => i + 1)
    for (let i = this.pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.pool[i], this.pool[j]] = [this.pool[j], this.pool[i]]
    }
  }
  take(): number {
    return this.pool.pop() ?? 1 + Math.floor(Math.random() * NUMBER_RANGE) // pool exhausted: shouldn't happen at this scale
  }
  release(n: number) {
    this.pool.push(n)
  }
}

export class Drum {
  private engine = Engine.create({
    gravity: { x: 0, y: 1, scale: 0.0011 },
    positionIterations: SOLVER_ITERATIONS,
    velocityIterations: SOLVER_ITERATIONS,
  })
  private ctx: CanvasRenderingContext2D
  private balls: Ball[] = []
  private numbers = new NumberPool(NUMBER_RANGE)
  private raf = 0
  private agitating = false
  private reduced: boolean
  private colours: string[]

  private W: number
  private H: number
  center: { x: number; y: number }
  radius: number
  pileRadius: number
  /** Where the neck opens at the top of the drum — the flight's starting/ending point. */
  openingPoint: { x: number; y: number }

  constructor(canvas: HTMLCanvasElement, colours: string[], reducedMotion: boolean) {
    this.ctx = canvas.getContext('2d')!
    this.colours = colours
    this.reduced = reducedMotion
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    this.ctx.scale(dpr, dpr)
    this.W = rect.width
    this.H = rect.height

    this.radius = Math.min(this.W, this.H) / 2 - this.H * 0.06
    this.center = { x: this.W / 2, y: this.H / 2 + this.H * 0.04 }
    this.pileRadius = 2 * this.radius * 0.06
    this.openingPoint = { x: this.center.x, y: this.center.y - this.radius - this.H * 0.05 }

    this.buildWalls()
    for (let i = 0; i < BALL_COUNT; i++) this.spawn(i % colours.length, true)
  }

  private buildWalls() {
    const { cx, cy, r } = { cx: this.center.x, cy: this.center.y, r: this.radius }
    const thickness = Math.max(14, this.pileRadius * 1.3)
    const segments: Matter.Body[] = []
    for (let k = 0; k < WALL_SEGMENTS; k++) {
      const angle = (k / WALL_SEGMENTS) * Math.PI * 2
      const sx = cx + Math.cos(angle) * r
      const sy = cy + Math.sin(angle) * r
      const length = 2 * r * Math.sin(Math.PI / WALL_SEGMENTS) * 1.2 // slight overlap: no gaps in the ring
      segments.push(Bodies.rectangle(sx, sy, length, thickness, {
        isStatic: true, angle: angle + Math.PI / 2, friction: 0.05, restitution: 0.5,
      }))
    }
    World.add(this.engine.world, segments)
  }

  private spawn(colourIndex: number, insidePile: boolean) {
    const { cx, cy, r } = { cx: this.center.x, cy: this.center.y, r: this.radius }
    const angle = Math.random() * Math.PI * 2
    const dist = Math.random() * (r - this.pileRadius * 1.5)
    const x = insidePile ? cx + Math.cos(angle) * dist : cx + (Math.random() - 0.5) * r
    const y = insidePile ? cy + Math.sin(angle) * dist : cy - r - 20
    const body = Bodies.circle(x, y, this.pileRadius, { restitution: 0.78, friction: 0.06, frictionAir: 0.012, density: 0.0016 })
    World.add(this.engine.world, body)
    this.balls.push({ body, colour: this.colours[colourIndex], number: this.numbers.take() })
  }

  /** Removes the nearest ball of `colour` from the pile — called when a flight begins. */
  ejectOne(colourIndex: number): string {
    const colour = this.colours[colourIndex]
    const { x, y } = this.openingPoint
    const candidates = this.balls.filter((b) => b.colour === colour)
    const chosen = candidates.reduce((best, b) => {
      const d = Math.hypot(b.body.position.x - x, b.body.position.y - y)
      const bd = Math.hypot(best.body.position.x - x, best.body.position.y - y)
      return d < bd ? b : best
    }, candidates[0])
    if (chosen) {
      World.remove(this.engine.world, chosen.body)
      this.balls = this.balls.filter((b) => b !== chosen)
      this.numbers.release(chosen.number) // free for reuse by the ball that backfills the pile
    }
    this.spawn(colourIndex, true) // keep the pile topped back up straight away
    return colour
  }

  /** Drops a ball of a lane's colour back into the pile — used at start and by "throw back". */
  addBall(colourIndex: number) {
    this.spawn(colourIndex, false)
  }

  start() {
    if (this.reduced) {
      for (let i = 0; i < 120; i++) Engine.update(this.engine, 1000 / 60 / SUBSTEPS)
      this.draw()
      return
    }
    const step = () => {
      for (let i = 0; i < SUBSTEPS; i++) Engine.update(this.engine, 1000 / 60 / SUBSTEPS)
      this.draw()
      this.raf = requestAnimationFrame(step)
    }
    this.raf = requestAnimationFrame(step)
  }

  stop() {
    cancelAnimationFrame(this.raf)
  }

  private draw() {
    const { ctx } = this
    ctx.clearRect(0, 0, this.W, this.H)
    const { cx, cy, r } = { cx: this.center.x, cy: this.center.y, r: this.radius }

    // The neck's geometry: a gap in the rim, with two straight walls rising from its
    // edges to the opening — the ball emerges through the gap between them.
    const neckHalfW = r * 0.17
    const gapHalfAngle = Math.asin(Math.min(0.9, neckHalfW / r))
    const top = -Math.PI / 2
    const angleRight = top + gapHalfAngle
    const angleLeft = top - gapHalfAngle
    const rimRight = { x: cx + Math.cos(angleRight) * r, y: cy + Math.sin(angleRight) * r }
    const rimLeft = { x: cx + Math.cos(angleLeft) * r, y: cy + Math.sin(angleLeft) * r }
    const topRight = { x: rimRight.x, y: this.openingPoint.y }
    const topLeft = { x: rimLeft.x, y: this.openingPoint.y }

    // The drum's glass sphere, drawn behind the pile so the balls read as being inside it.
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    const glass = ctx.createRadialGradient(cx - r * 0.32, cy - r * 0.36, r * 0.1, cx, cy, r)
    glass.addColorStop(0, 'rgb(255 255 255 / 0.55)')
    glass.addColorStop(0.45, 'rgb(255 255 255 / 0.12)')
    glass.addColorStop(1, 'rgb(255 255 255 / 0.02)')
    ctx.fillStyle = glass
    ctx.fill()
    ctx.restore()

    // The neck's own glassy interior, matching the sphere's material.
    ctx.beginPath()
    ctx.moveTo(topLeft.x, topLeft.y)
    ctx.lineTo(topRight.x, topRight.y)
    ctx.lineTo(rimRight.x, rimRight.y)
    ctx.lineTo(rimLeft.x, rimLeft.y)
    ctx.closePath()
    ctx.fillStyle = 'rgb(255 255 255 / 0.14)'
    ctx.fill()

    // One continuous outline: up the neck's right wall, the long way round the rim, and
    // back up the left wall — the same stroke throughout, with the gap at the top left
    // open as the opening the ball emerges through.
    ctx.beginPath()
    ctx.moveTo(topRight.x, topRight.y)
    ctx.lineTo(rimRight.x, rimRight.y)
    ctx.arc(cx, cy, r, angleRight, angleLeft + Math.PI * 2, false)
    ctx.lineTo(topLeft.x, topLeft.y)
    ctx.lineWidth = 4
    ctx.strokeStyle = 'rgb(255 255 255 / 0.7)'
    ctx.lineJoin = 'round'
    ctx.stroke()

    for (const b of this.balls) {
      const rad = (b.body as unknown as { circleRadius: number }).circleRadius
      drawBall(ctx, { x: b.body.position.x, y: b.body.position.y, r: rad, colour: b.colour, number: b.number })
    }
  }

  /** Applies swirling, upward "air jet" forces to every ball for `ms`. */
  async agitate(ms: number) {
    if (this.reduced) return
    this.agitating = true
    const start = performance.now()
    const { x: cx, y: cy } = this.center
    const tick = () => {
      if (!this.agitating) return
      for (const b of this.balls) {
        const dx = b.body.position.x - cx
        const dy = b.body.position.y - cy
        const dist = Math.hypot(dx, dy) || 1
        const tangent = { x: -dy / dist, y: dx / dist }
        Body.applyForce(b.body, b.body.position, {
          x: tangent.x * 0.0009 + (Math.random() - 0.5) * 0.0004,
          y: tangent.y * 0.0009 - Math.random() * 0.0007,
        })
      }
      if (performance.now() - start < ms) requestAnimationFrame(tick)
      else this.agitating = false
    }
    tick()
    await wait(ms)
    this.agitating = false
  }

  destroy() {
    this.stop()
    World.clear(this.engine.world, false)
    Engine.clear(this.engine)
  }
}

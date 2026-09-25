import type { Item, Reel } from './types'
import { cryptoRng, pickDifferent, type Rng } from './random'

export type BriefWriter = (results: Item[], held: boolean[], rng: Rng) => string

export type MachineEvents = {
  /** Unheld reels were given new results; themes animate them, then call `settle()`. */
  spin: { spinning: number[]; results: Item[]; brief: string }
  /** All reels have stopped and the machine accepts input again. */
  ready: { results: Item[]; brief: string }
  hold: { index: number; held: boolean }
}

type Listener<K extends keyof MachineEvents> = (e: MachineEvents[K]) => void

/**
 * The game's rules, with no knowledge of how anything looks.
 * Themes render state and animate events; they never decide outcomes.
 */
export class Machine {
  readonly reels: Reel[]
  results: Item[]
  held: boolean[]
  spinning = false
  /** The art director's line describing the current results. */
  brief: string
  private rng: Rng
  private writer: BriefWriter
  private listeners = new Map<keyof MachineEvents, Set<(e: never) => void>>()

  constructor(reels: Reel[], writer: BriefWriter = () => '', rng: Rng = cryptoRng) {
    this.reels = reels
    this.rng = rng
    this.writer = writer
    this.results = reels.map((r) => pickDifferent(r.items, undefined, rng))
    this.held = reels.map(() => false)
    this.brief = writer(this.results, this.held, rng)
  }

  on<K extends keyof MachineEvents>(type: K, fn: Listener<K>): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    const set = this.listeners.get(type)!
    set.add(fn)
    return () => { set.delete(fn) }
  }

  private emit<K extends keyof MachineEvents>(type: K, e: MachineEvents[K]) {
    this.listeners.get(type)?.forEach((fn) => (fn as Listener<K>)(e))
  }

  get canSpin() {
    return !this.spinning && this.held.some((h) => !h)
  }

  toggleHold(index: number) {
    if (this.spinning || !this.reels[index]) return
    this.held[index] = !this.held[index]
    this.emit('hold', { index, held: this.held[index] })
  }

  spin(): boolean {
    if (!this.canSpin) return false
    const spinning = this.reels.flatMap((_, i) => (this.held[i] ? [] : [i]))
    for (const i of spinning) this.results[i] = pickDifferent(this.reels[i].items, this.results[i], this.rng)
    this.brief = this.writer(this.results, this.held, this.rng)
    this.spinning = true
    this.emit('spin', { spinning, results: [...this.results], brief: this.brief })
    return true
  }

  /** Called by the theme when its spin animation has finished. */
  settle() {
    if (!this.spinning) return
    this.spinning = false
    this.emit('ready', { results: [...this.results], brief: this.brief })
  }
}

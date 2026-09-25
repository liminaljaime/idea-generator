import './style.css'
import type { Theme } from '../types'
import type { Machine } from '../../engine/machine'
import type { Item } from '../../engine/types'
import { prefersReducedMotion } from '../../shell/controls'
import voice from '../../data/lotto-host.csv?raw'
import { Drum } from './drum'
import { drawBall } from './ball'

// Lucky Ideas: a bright, garish game-show lotto draw. Physics (Matter.js) runs only
// inside the drum, which swirls its pile on command. The journey from the drum to a
// pedestal is a scripted arc — grow, arc, bounce, fade the text in — never physics.
// "Throw back" reverses that arc, drops the ball back into the pile, and rolls a fresh
// one. The engine always decides the result first; the drum and the flight only decide
// how it looks — see drum.ts.
let cleanup: (() => void)[] = []

const lanes = ['teal', 'pink', 'gold'] as const // left-to-right: blue, pink, yellow
type Lane = (typeof lanes)[number]
const IDLE = "It's anyone's game! Press DRAW to find out."
const MIXING = 'Mixing it up, folks…'
const laneColours: Record<Lane, string> = { gold: '#ffcf3f', pink: '#ff4f9e', teal: '#2de0c7' }

const SWIRL_MS = 2000
const BETWEEN_SWIRL_MS = 650
const THROWBACK_SWIRL_MS = 1100
const FLIGHT_MS = 700
const BOUNCE_MS = 180
const RETURN_MS = 520

// Friendly labels for the "extra detail" line — every item's family is real metadata
// that isn't shown anywhere else on the machine.
const familyDetail = (item: Item): string => {
  const constraintLabels: Record<string, string> = {
    Mechanism: 'Psychological bias',
    'Technical constraint': 'Technical constraint',
    'Visual reference': 'Visual style reference',
    Behaviour: 'Behaviour quirk',
  }
  return constraintLabels[item.family] ?? item.family ?? ''
}

// A big, chunky, glossy plastic arcade button: dark moulded base, a domed red top
// with a thick highlight and a bright specular glint, like a real coin-op buzzer.
const drawBuzzer = `
  <svg viewBox="0 0 140 140" aria-hidden="true">
    <defs>
      <radialGradient id="buzzerBase" cx="35%" cy="28%" r="85%">
        <stop offset="0" stop-color="#4a4a4a"/><stop offset="0.55" stop-color="#222"/><stop offset="1" stop-color="#000"/>
      </radialGradient>
      <radialGradient id="buzzerRim" cx="35%" cy="30%" r="80%">
        <stop offset="0" stop-color="#ff9d9d"/><stop offset="0.4" stop-color="#e21f1f"/>
        <stop offset="0.8" stop-color="#8f0a0a"/><stop offset="1" stop-color="#5c0404"/>
      </radialGradient>
      <radialGradient id="buzzerTop" cx="34%" cy="24%" r="80%">
        <stop offset="0" stop-color="#ffd6d6"/><stop offset="0.18" stop-color="#ff6b6b"/>
        <stop offset="0.55" stop-color="#ff2626"/><stop offset="0.85" stop-color="#c50d0d"/><stop offset="1" stop-color="#8f0707"/>
      </radialGradient>
    </defs>
    <circle cx="70" cy="72" r="68" fill="url(#buzzerBase)"/>
    <circle cx="70" cy="64" r="58" fill="url(#buzzerRim)"/>
    <circle cx="70" cy="60" r="50" fill="url(#buzzerTop)"/>
    <ellipse cx="48" cy="36" rx="20" ry="11" fill="#fff" opacity="0.55" transform="rotate(-24 48 36)"/>
    <ellipse cx="88" cy="82" rx="30" ry="10" fill="#3a0000" opacity="0.25"/>
  </svg>`

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

type Point = { x: number; y: number }
type PedestalBall = { colour: string; text: string } | null
type FlightKind = 'out' | 'back'
type Flight = { kind: FlightKind; from: Point; to: Point; colour: string; text: string; pileR: number; fullR: number; start: number; duration: number }

const theme: Theme = {
  voice,
  mount(root: HTMLElement, machine: Machine) {
    document.documentElement.dataset.theme = 'lotto'
    document.title = 'Lucky Ideas'
    root.innerHTML = `
      <div class="showroom">
        <div class="rays" aria-hidden="true"></div>
        <main class="stage">
          <div class="layout" data-layout>
            <div class="drum-wrap"><canvas data-drum-canvas></canvas></div>
            <canvas class="overlay" data-overlay-canvas></canvas>
            <div class="right-side">
              <header class="marquee">
                <h1><span class="bubble">Lucky</span> <span class="bubble accent">Ideas</span></h1>
                <p class="tagline">Tonight's Big Draw!</p>
              </header>
              <div class="pedestals">
                ${machine.reels.map((r, i) => `
                  <div class="pedestal-col">
                    <div class="pedestal-slot">
                      <div class="stand">
                        <div class="stand-cup" data-cup="${i}"></div>
                        <div class="stand-base"><span class="stand-label">${r.label}</span></div>
                      </div>
                    </div>
                    <button type="button" class="throwback" data-throwback="${i}" aria-label="Throw back the ${r.label.toLowerCase()} ball">Throw back</button>
                    <p class="detail-line" data-detail="${i}"></p>
                  </div>`).join('')}
              </div>
              <div class="bottom-row">
                <div class="commentary">
                  <p class="status" data-status>${IDLE}</p>
                  <p class="brief" aria-hidden="true"></p>
                </div>
                <button type="button" class="draw"><span class="visually-hidden">Draw</span>${drawBuzzer}<span class="draw-label">DRAW</span></button>
              </div>
            </div>
          </div>
        </main>
      </div>`

    const layout = root.querySelector<HTMLElement>('[data-layout]')!
    const drumCanvas = root.querySelector<HTMLCanvasElement>('[data-drum-canvas]')!
    const overlay = root.querySelector<HTMLCanvasElement>('[data-overlay-canvas]')!
    const overlayCtx = overlay.getContext('2d')!
    const cups = [...root.querySelectorAll<HTMLElement>('[data-cup]')]
    const details = [...root.querySelectorAll<HTMLElement>('[data-detail]')]
    const throwbacks = [...root.querySelectorAll<HTMLButtonElement>('[data-throwback]')]
    const drawBtn = root.querySelector<HTMLButtonElement>('.draw')!
    const status = root.querySelector<HTMLElement>('[data-status]')!
    const brief = root.querySelector<HTMLElement>('.brief')!

    const reduced = prefersReducedMotion()
    const drum = new Drum(drumCanvas, lanes.map((l) => laneColours[l]), reduced)
    drum.start()

    // Size the overlay to the whole layout (drum + pedestals) so one coordinate space
    // covers the entire flight; work out each fixed point once layout has settled.
    const layoutRect = layout.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    overlay.width = layoutRect.width * dpr
    overlay.height = layoutRect.height * dpr
    overlayCtx.scale(dpr, dpr)
    const drumRect = drumCanvas.getBoundingClientRect()
    const openingPoint: Point = {
      x: drumRect.left - layoutRect.left + drum.openingPoint.x,
      y: drumRect.top - layoutRect.top + drum.openingPoint.y,
    }
    // Sized and positioned from the cup's own rendered box, so the ball sits neatly in
    // it — slightly overflowing the rim, like a real ball in an egg cup — rather than
    // swallowing the base and its printed label below.
    // A slightly smaller ball-to-cup ratio on narrow layouts keeps it clear of the label
    // on the base below, where there's much less room to spare than on desktop.
    const fullRadius = () => cups[0].getBoundingClientRect().width * (layoutRect.width < 500 ? 0.42 : 0.62)
    const pedestalPoint = (i: number): Point => {
      const r = cups[i].getBoundingClientRect()
      return { x: r.left - layoutRect.left + r.width / 2, y: r.top - layoutRect.top + r.height * 0.2 }
    }

    const pedestals: PedestalBall[] = [null, null, null]
    let flight: Flight | null = null

    const overlayFrame = () => {
      overlayCtx.clearRect(0, 0, layoutRect.width, layoutRect.height)
      pedestals.forEach((p, i) => {
        if (!p) return
        const pt = pedestalPoint(i)
        drawBall(overlayCtx, { x: pt.x, y: pt.y, r: fullRadius(), colour: p.colour, text: p.text, textOpacity: 1 })
      })
      if (flight) {
        const t = clamp((performance.now() - flight.start) / flight.duration, 0, 1)
        const e = easeInOutQuad(t)
        const arcHeight = Math.abs(flight.to.x - flight.from.x) * 0.35 + layoutRect.height * 0.12
        const mx = (flight.from.x + flight.to.x) / 2
        const my = (flight.from.y + flight.to.y) / 2 - arcHeight
        const u = 1 - e
        const x = u * u * flight.from.x + 2 * u * e * mx + e * e * flight.to.x
        const y = u * u * flight.from.y + 2 * u * e * my + e * e * flight.to.y
        const rt = clamp(t / 0.8, 0, 1)
        const r = flight.kind === 'out'
          ? lerp(flight.pileR, flight.fullR, easeOutCubic(rt))
          : lerp(flight.fullR, flight.pileR, easeOutCubic(rt))
        const textOpacity = flight.kind === 'out' ? clamp((t - 0.7) / 0.3, 0, 1) : clamp(1 - t / 0.3, 0, 1)
        drawBall(overlayCtx, { x, y, r, colour: flight.colour, text: flight.text, textOpacity })
      }
      requestAnimationFrame(overlayFrame)
    }
    requestAnimationFrame(overlayFrame)

    // A scripted arc from the drum's opening to a pedestal: grows to full size, the text
    // fades in near the end, then a small squash-bounce as it settles. No physics at all.
    const flyOut = async (i: number, colour: string, text: string) => {
      if (reduced) { pedestals[i] = { colour, text }; return }
      flight = { kind: 'out', from: openingPoint, to: pedestalPoint(i), colour, text, pileR: drum.pileRadius, fullR: fullRadius(), start: performance.now(), duration: FLIGHT_MS }
      await wait(FLIGHT_MS)
      flight = null
      pedestals[i] = { colour, text }
      await bounce(i, colour, text)
    }

    // A quick vertical squash-and-recover once the ball has arrived.
    const bounce = async (i: number, colour: string, text: string) => {
      const pt = pedestalPoint(i)
      const start = performance.now()
      await new Promise<void>((resolve) => {
        const frame = () => {
          const t = clamp((performance.now() - start) / BOUNCE_MS, 0, 1)
          const squash = 1 - Math.sin(t * Math.PI) * 0.16
          // Draw one extra bounce frame on top of the settled ball each tick.
          overlayCtx.save()
          drawBall(overlayCtx, { x: pt.x, y: pt.y, r: fullRadius(), colour, text, textOpacity: 1, squash })
          overlayCtx.restore()
          if (t < 1) requestAnimationFrame(frame)
          else resolve()
        }
        frame()
      })
    }

    // The reverse journey for "throw back": shrinks and arcs back into the drum's neck.
    const flyBack = async (i: number) => {
      const p = pedestals[i]
      pedestals[i] = null
      if (!p || reduced) return
      flight = { kind: 'back', from: pedestalPoint(i), to: openingPoint, colour: p.colour, text: p.text, pileR: drum.pileRadius, fullR: fullRadius(), start: performance.now(), duration: RETURN_MS }
      await wait(RETURN_MS)
      flight = null
    }

    const show = (i: number, item: Item) => {
      details[i].textContent = familyDetail(item)
      landed[i] = true
      updateThrowbacks()
    }

    const landed = [true, true, true]
    let busy = false
    const updateThrowbacks = () => {
      throwbacks.forEach((b, i) => (b.disabled = busy || !landed[i]))
    }

    machine.reels.forEach((_, i) => {
      pedestals[i] = { colour: laneColours[lanes[i]], text: machine.results[i].item }
      show(i, machine.results[i])
    })
    brief.textContent = machine.brief // every ball is already landed at the very start

    const setBusy = (v: boolean) => {
      busy = v
      drawBtn.disabled = v
      updateThrowbacks()
    }

    drawBtn.addEventListener('click', () => machine.spin())

    let pendingRelease: number[] | null = null
    let throwbackActive = false

    // "Throw back" is a one-shot action, not a persistent lock: it silently holds the
    // other two reels just long enough for spin() to redraw only this one, then
    // releases them again once the new ball has settled.
    throwbacks.forEach((b, i) => {
      b.addEventListener('click', async () => {
        if (busy || machine.spinning || !landed[i]) return
        setBusy(true)
        landed[i] = false
        details[i].textContent = ''
        await flyBack(i)
        drum.addBall(i) // each reel always draws from its own dedicated lane/colour
        throwbackActive = true
        const others = [0, 1, 2].filter((j) => j !== i)
        others.forEach((j) => machine.toggleHold(j))
        pendingRelease = others
        machine.spin()
      })
    })

    cleanup.push(machine.on('spin', async ({ spinning, results }) => {
      setBusy(true)
      status.textContent = MIXING
      brief.textContent = '' // never mention a result before its ball has actually landed
      spinning.forEach((i) => { landed[i] = false; details[i].textContent = '' })
      await drum.agitate(throwbackActive ? THROWBACK_SWIRL_MS : SWIRL_MS)
      for (let k = 0; k < spinning.length; k++) {
        if (k > 0) {
          await wait(200)
          await drum.agitate(BETWEEN_SWIRL_MS)
        }
        const i = spinning[k]
        const colour = drum.ejectOne(i)
        await flyOut(i, colour, results[i].item)
        show(i, results[i])
        await wait(160)
      }
      throwbackActive = false
      machine.settle()
    }))

    cleanup.push(machine.on('ready', (e) => {
      setBusy(false)
      status.textContent = 'AND THE RESULTS ARE IN!'
      brief.textContent = e.brief
      if (pendingRelease) {
        pendingRelease.forEach((j) => machine.toggleHold(j))
        pendingRelease = null
      }
    }))

    cleanup.push(() => drum.destroy())
  },
  unmount() {
    cleanup.forEach((f) => f())
    cleanup = []
    delete document.documentElement.dataset.theme
  },
}

export default theme

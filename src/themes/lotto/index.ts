import './style.css'
import type { Theme } from '../types'
import type { Machine } from '../../engine/machine'
import type { Item } from '../../engine/types'
import { prefersReducedMotion } from '../../shell/controls'
import voice from '../../data/lotto-host.csv?raw'

// Lucky Ideas: a bright, garish game-show lotto draw. One big plastic globe holds all
// the balls, sitting still until DRAW is pressed — then they shuffle, and three balls
// roll out through their own tubes into numbered slots below.
let cleanup: (() => void)[] = []

const lanes = ['gold', 'pink', 'teal'] as const
type Lane = (typeof lanes)[number]
const IDLE = "It's anyone's game! Press DRAW to find out."

// How many decorative filler balls sit in the shared globe.
const FILLER_BALLS = 26
const laneColours: Record<Lane, string> = { gold: '#ffcf3f', pink: '#ff4f9e', teal: '#2de0c7' }
const allColours = Object.values(laneColours)

function rand(seed: () => number, min: number, max: number) {
  return min + seed() * (max - min)
}

// A tiny seeded generator so the globe's ball layout is stable within a session.
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const globeBalls = () => {
  const rng = mulberry32(42)
  return Array.from({ length: FILLER_BALLS }, (_, i) => {
    const size = rand(rng, 30, 46)
    const x = rand(rng, 6, 94)
    const y = rand(rng, 6, 92)
    const colour = allColours[i % allColours.length]
    const dur = rand(rng, 2.2, 3.8).toFixed(2)
    const delay = rand(rng, 0, 2.4).toFixed(2)
    const num = Math.floor(rand(rng, 1, 99))
    return `<span class="ball" style="--sz:${size}px;--x:${x}%;--y:${y}%;--dur:${dur}s;--delay:${delay}s;--c:${colour}">${num}</span>`
  }).join('')
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

const theme: Theme = {
  voice,
  mount(root: HTMLElement, machine: Machine) {
    document.documentElement.dataset.theme = 'lotto'
    document.title = 'Lucky Ideas'
    root.innerHTML = `
      <div class="showroom">
        <div class="rays" aria-hidden="true"></div>
        <header class="marquee">
          <h1><span class="bubble">Lucky</span> <span class="bubble accent">Ideas</span></h1>
          <p class="tagline">Tonight's Big Draw!</p>
        </header>
        <main class="stage">
          <div class="machine">
            <div class="globe-wrap">
              <div class="glass" data-globe>
                <div class="balls">${globeBalls()}</div>
              </div>
              <div class="stand" aria-hidden="true"></div>
            </div>
            <div class="manifold" aria-hidden="true"></div>
            <div class="lanes">
              ${machine.reels.map((r, i) => `
                <section class="lane" aria-label="${r.label}">
                  <div class="tube" data-tube="${i}" style="--lc:${laneColours[lanes[i]]}">
                    <span class="travelling" data-travel="${i}"></span>
                  </div>
                  <div class="slot" data-slot="${i}" style="--lc:${laneColours[lanes[i]]}">
                    <div class="ball-drop" data-drop="${i}"><span class="ball-text" data-drop-text="${i}"></span></div>
                  </div>
                  <p class="lane-name">${r.label}</p>
                  <button type="button" class="lock" data-lock="${i}" aria-pressed="false" aria-label="Lock ${r.label.toLowerCase()}">Lock</button>
                </section>`).join('')}
            </div>
          </div>
          <button type="button" class="draw"><span class="visually-hidden">Draw</span>${drawBuzzer}<span class="draw-label">DRAW</span></button>
          <div class="commentary">
            <p class="status" data-status>${IDLE}</p>
            <p class="brief" aria-hidden="true"></p>
          </div>
        </main>
      </div>`

    const globe = root.querySelector<HTMLElement>('[data-globe]')!
    const travellers = [...root.querySelectorAll<HTMLElement>('[data-travel]')]
    const drops = [...root.querySelectorAll<HTMLElement>('[data-drop]')]
    const dropTexts = [...root.querySelectorAll<HTMLElement>('[data-drop-text]')]
    const locks = [...root.querySelectorAll<HTMLButtonElement>('[data-lock]')]
    const draw = root.querySelector<HTMLButtonElement>('.draw')!
    const status = root.querySelector<HTMLElement>('[data-status]')!
    const brief = root.querySelector<HTMLElement>('.brief')!

    const show = (i: number, item: Item) => {
      dropTexts[i].textContent = item.item
      drops[i].classList.add('settled')
    }
    machine.reels.forEach((_, i) => show(i, machine.results[i]))
    brief.textContent = machine.brief

    locks.forEach((b, i) => b.addEventListener('click', () => machine.toggleHold(i)))
    draw.addEventListener('click', () => machine.spin())

    const setBusy = (busy: boolean) => {
      draw.disabled = busy || !machine.canSpin
      locks.forEach((b) => (b.disabled = busy))
    }

    cleanup.push(machine.on('hold', ({ index, held }) => {
      locks[index].setAttribute('aria-pressed', String(held))
      locks[index].textContent = held ? 'Locked' : 'Lock'
      draw.disabled = !machine.canSpin
      status.textContent = machine.canSpin ? IDLE : 'All locked in! Release one to draw again.'
    }))

    cleanup.push(machine.on('spin', async ({ spinning, results }) => {
      setBusy(true)
      status.textContent = 'Mixing it up, folks…'
      brief.classList.add('waiting')
      if (prefersReducedMotion()) {
        spinning.forEach((i) => show(i, results[i]))
        return machine.settle()
      }
      // The whole globe shuffles for everyone to see, even lanes that are locked.
      spinning.forEach((i) => drops[i].classList.remove('settled'))
      globe.classList.add('churning')
      await wait(1000)
      globe.classList.remove('churning')
      // One ball per unlocked lane travels down its own tube, left to right.
      for (const i of spinning) {
        travellers[i].classList.add('rolling')
        await wait(340)
        travellers[i].classList.remove('rolling')
        show(i, results[i])
        await wait(280)
      }
      machine.settle()
    }))

    cleanup.push(machine.on('ready', (e) => {
      setBusy(false)
      status.textContent = 'AND THE RESULTS ARE IN!'
      brief.textContent = e.brief
      brief.classList.remove('waiting')
    }))
  },
  unmount() {
    cleanup.forEach((f) => f())
    cleanup = []
    delete document.documentElement.dataset.theme
  },
}

export default theme

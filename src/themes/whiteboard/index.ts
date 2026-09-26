import './style.css'
import type { Theme } from '../types'
import type { Machine } from '../../engine/machine'
import type { Item } from '../../engine/types'
import { prefersReducedMotion } from '../../shell/controls'
import voice from '../../data/workshop-facilitator.csv?raw'

// The Idea Workshop: a whiteboard with a hand-drawn marker box round each category.
// Redrawn notes peel off the board and fall away; the new idea gets stuck straight up.
let cleanup: (() => void)[] = []

const categories = ['pink', 'yellow', 'green'] as const
const boxSeeds = [6, 17, 29, 41] as const

// Real dry-erase marker isn't fine uniform grain (that reads as paper fibre) — it's
// bigger, streaky dry patches where the felt tip skipped, with fairly sharp ink/no-ink
// transitions rather than a smooth gradient, plus a soft bled edge. Low, asymmetric
// turbulence frequency gives elongated streaks instead of isotropic speckle; a steep
// alpha curve turns the smooth noise into more binary patches instead of grain.
const inkFilter = `
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <filter id="marker-ink" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.045 0.22" numOctaves="2" seed="5" result="noise"/>
      <feColorMatrix in="noise" type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 1.6 0 0 -0.35" result="inkMaskRaw"/>
      <feComponentTransfer in="inkMaskRaw" result="inkMask">
        <feFuncA type="gamma" amplitude="1" exponent="0.5" offset="0"/>
      </feComponentTransfer>
      <feComposite in="SourceGraphic" in2="inkMask" operator="in" result="inked"/>
      <feGaussianBlur in="inked" stdDeviation="0.45"/>
    </filter>
  </svg>`

const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// A tiny deterministic PRNG so each box's wobble is fixed for the session (not
// re-randomised on every re-render) but different from its neighbours.
function mulberry32(seed: number) {
  let s = seed
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// One imperfect rectangle stroke in a 0-100 viewBox: corners are nudged independently,
// slightly rounded rather than sharp, and the path overshoots its start instead of
// closing neatly — the way a hand actually draws a box (no two sides are quite
// parallel or square; see the reference sketches).
function handDrawnRect(rng: () => number, inset: number, radius = 2): string {
  const j = (n: number) => (rng() - 0.5) * n
  const corners: [number, number][] = [
    [inset + j(3), inset + j(3)],
    [100 - inset + j(3), inset + j(3)],
    [100 - inset + j(3), 100 - inset + j(3)],
    [inset + j(3), 100 - inset + j(3)],
  ]
  const along = (a: [number, number], b: [number, number], d: number): [number, number] => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy) || 1
    return [a[0] + (dx / len) * d, a[1] + (dy / len) * d]
  }
  const n = corners.length
  const inPt = corners.map((c, i) => along(c, corners[(i + n - 1) % n], radius))
  const outPt = corners.map((c, i) => along(c, corners[(i + 1) % n], radius))
  const [sx, sy] = outPt[0]
  let d = `M ${sx + j(2)} ${sy + j(2)}`
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n
    const a = outPt[i]
    const b = inPt[next]
    d += ` Q ${(a[0] + b[0]) / 2 + j(5)} ${(a[1] + b[1]) / 2 + j(5)} ${b[0] + j(1)} ${b[1] + j(1)}` // edge
    const c = corners[next]
    d += ` Q ${c[0]} ${c[1]} ${outPt[next][0] + j(1)} ${outPt[next][1] + j(1)}` // rounded corner
  }
  d += ` L ${sx + j(4)} ${sy + j(4)}` // overshoot the start rather than closing on it
  return d
}

// Two overlapping passes, like a box drawn a little too fast and retraced once.
const handDrawnBox = (seed: number) => {
  const rng = mulberry32(seed)
  return `<path d="${handDrawnRect(rng, 3)}"/><path d="${handDrawnRect(rng, 4)}"/>`
}

// Same idea for the circle round "Run with it"/"Ideate": real overlapping ellipses,
// not a jittered polygon — a hand-drawn circle has no corners anywhere on it, just
// two or three slightly mismatched passes (different centre, radius and tilt).
const handDrawnRing = (seed: number) => {
  const rng = mulberry32(seed)
  const j = (n: number) => (rng() - 0.5) * n
  const passes = [0, 1].map(() => {
    const cx = 50 + j(5)
    const cy = 23 + j(5)
    const rx = 46 + j(7)
    const ry = 19 + j(5)
    const rot = j(8)
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})"/>`
  })
  return passes.join('')
}

// Size the note's text to fill most of the note — a one-word result gets to be huge,
// a long one shrinks just enough to still fit, rather than every note using one fixed size.
function fitNoteText(note: HTMLElement) {
  const text = note.querySelector<HTMLElement>('.note-text')!
  const cs = getComputedStyle(note)
  const availH = note.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
  let lo = 14
  let hi = 110
  let best = lo
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    text.style.fontSize = `${mid}px`
    // scrollWidth vs. the element's own (already width-constrained) clientWidth catches
    // a genuinely unbreakable word; comparing against a separately-computed float would
    // fail on sub-pixel rounding alone every time.
    const overflowsWidth = text.scrollWidth > text.clientWidth + 1
    const fits = text.scrollHeight <= availH + 1 && !overflowsWidth
    if (fits) { best = mid; lo = mid + 1 } else { hi = mid - 1 }
  }
  text.style.fontSize = `${best}px`
}

const theme: Theme = {
  voice,
  mount(root: HTMLElement, machine: Machine) {
    document.documentElement.dataset.theme = 'whiteboard'
    document.title = 'Concept Jam'
    root.innerHTML = `
      ${inkFilter}
      <div class="board">
        <div class="wall">
          <header class="board-head">
            <h1>Concept Jam</h1>
            <p class="board-sub">How might we align perspectives and unlock synergistic possibilities?</p>
          </header>
          <main class="slots">
            ${machine.reels.map((r, i) => `
              <section class="slot cat-${categories[i]}" aria-label="${r.label}">
                <div class="frame">
                  <svg class="frame-border" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${handDrawnBox(boxSeeds[i])}</svg>
                  <p class="frame-label">${sentence(r.label)}</p>
                  <div class="note-well">
                    <div class="note" data-note="${i}"><p class="note-text" data-text="${i}"></p></div>
                  </div>
                  <button type="button" class="keep" data-keep="${i}" aria-pressed="false" aria-label="Run with the ${r.label.toLowerCase()}">
                    <span class="keep-word" data-keep-word="${i}">Run with it</span>
                    <svg class="keep-ring" viewBox="0 0 100 46" preserveAspectRatio="none" aria-hidden="true">${handDrawnRing(boxSeeds[i])}</svg>
                  </button>
                </div>
              </section>`).join('')}
          </main>
          <div class="bottom-row">
            <button type="button" class="reroll">
              <span class="reroll-box"><svg class="reroll-border" viewBox="0 0 100 46" preserveAspectRatio="none" aria-hidden="true">${handDrawnRing(boxSeeds[3])}</svg><span class="reroll-text">Ideate</span></span>
            </button>
            <div class="reading">
              <h2 class="reading-title">Where did we land?</h2>
              <p class="brief" aria-hidden="true"></p>
            </div>
          </div>
        </div>
      </div>`

    const notes = [...root.querySelectorAll<HTMLElement>('[data-note]')]
    const texts = [...root.querySelectorAll<HTMLElement>('[data-text]')]
    const slots = [...root.querySelectorAll<HTMLElement>('.slot')]
    const keeps = [...root.querySelectorAll<HTMLButtonElement>('[data-keep]')]
    const reroll = root.querySelector<HTMLButtonElement>('.reroll')!
    const brief = root.querySelector<HTMLElement>('.brief')!

    // Two words read better stacked one-per-line than squeezed onto one wide line —
    // it lets the text grow bigger and fill the note the way handwriting actually would.
    const layoutText = (s: string) => {
      const words = s.split(' ')
      return words.length === 2 ? words.join('\n') : s
    }

    const show = (i: number, item: Item) => {
      texts[i].textContent = layoutText(item.item)
      fitNoteText(notes[i])
    }
    machine.reels.forEach((_, i) => show(i, machine.results[i]))

    // The board's own size (and so each note's) can change on resize; refit in place.
    let resizeFrame = 0
    const onResize = () => {
      cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(() => notes.forEach((note) => fitNoteText(note)))
    }
    window.addEventListener('resize', onResize)
    cleanup.push(() => { window.removeEventListener('resize', onResize); cancelAnimationFrame(resizeFrame) })

    keeps.forEach((b, i) => b.addEventListener('click', () => machine.toggleHold(i)))
    reroll.addEventListener('click', () => machine.spin())

    const setBusy = (busy: boolean) => {
      reroll.disabled = busy || !machine.canSpin
      keeps.forEach((b) => (b.disabled = busy))
    }

    const keepWords = [...root.querySelectorAll<HTMLElement>('[data-keep-word]')]
    cleanup.push(machine.on('hold', ({ index, held }) => {
      keeps[index].setAttribute('aria-pressed', String(held))
      keepWords[index].textContent = held ? "This one's got legs!" : 'Run with it'
      slots[index].classList.toggle('kept', held)
      reroll.disabled = !machine.canSpin
    }))

    // A note peels off, tumbles off the bottom of the board, then the new one gets
    // stuck straight up in its place with a little overshoot, like it's just been slapped on.
    const fallAndReplace = (i: number, item: Item) => new Promise<void>((resolve) => {
      const note = notes[i]
      note.style.animationDelay = `${i * 90}ms`
      const onFallEnd = () => {
        note.removeEventListener('animationend', onFallEnd)
        show(i, item)
        note.classList.remove('falling')
        note.style.animationDelay = ''
        void note.offsetWidth
        note.classList.add('landing')
        const onLandEnd = () => {
          note.removeEventListener('animationend', onLandEnd)
          note.classList.remove('landing')
          resolve()
        }
        note.addEventListener('animationend', onLandEnd)
      }
      note.addEventListener('animationend', onFallEnd)
      note.classList.add('falling')
    })

    cleanup.push(machine.on('spin', async ({ spinning, results }) => {
      setBusy(true)
      brief.classList.add('waiting')
      if (prefersReducedMotion()) {
        spinning.forEach((i) => show(i, results[i]))
        return machine.settle()
      }
      await wait(60)
      await Promise.all(spinning.map((i) => fallAndReplace(i, results[i])))
      machine.settle()
    }))

    cleanup.push(machine.on('ready', (e) => {
      setBusy(false)
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

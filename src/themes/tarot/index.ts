import './style.css'
import type { Theme } from '../types'
import type { Machine } from '../../engine/machine'
import type { Item } from '../../engine/types'
import { prefersReducedMotion } from '../../shell/controls'
import { badgeSvg } from '../embroidered/badges'
import voice from '../../data/tarot-reader.csv?raw'

// The Creative Oracle: a pier-end fortune-teller's booth. Three decks, shuffled and dealt
// like a game of patience; the cross-stitch badges become the cards' pictures.
let cleanup: (() => void)[] = []

const suits = ['sun', 'moon', 'star'] as const
const IDLE = 'Cross my palm with curiosity'

// A burgundy wax seal stamped with a star, pressed onto the end of the parchment scroll.
const waxSeal = `
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <radialGradient id="wax" cx="38%" cy="32%" r="75%">
        <stop offset="0" stop-color="#b3283f"/><stop offset="0.6" stop-color="#7d1424"/><stop offset="1" stop-color="#4e0a16"/>
      </radialGradient>
    </defs>
    <path fill="url(#wax)" d="M32 3c4 0 6 3 9 4s7 0 9 3 1 6 3 9 5 5 5 9-3 6-4 9 0 7-3 9-6 1-9 3-5 5-9 5-6-3-9-4-7 0-9-3-1-6-3-9-5-5-5-9 3-6 4-9 0-7 3-9 6-1 9-3 5-5 9-5z"/>
    <circle cx="32" cy="32" r="17" fill="none" stroke="#4e0a16" stroke-width="1.5" opacity="0.7"/>
    <circle cx="32" cy="32" r="17" fill="none" stroke="#d45a6c" stroke-width="0.8" opacity="0.5" transform="translate(-0.8 -0.8)"/>
    <path fill="#e2b34a" d="M32 21l3 7.5 8 .6-6.1 5.1 1.9 7.8L32 37.7 25.2 42l1.9-7.8-6.1-5.1 8-.6z"/>
  </svg>`

const suitMark: Record<(typeof suits)[number], string> = {
  sun: '<circle cx="30" cy="45" r="9"/><g stroke-width="2.4" stroke-linecap="round"><path d="M30 28v-6M30 68v-6M13 45h-6M53 45h-6M18 33l-4-4M46 61l-4-4M42 33l4-4M14 61l4-4"/></g>',
  moon: '<path d="M36 28a17 17 0 1 0 0 34a13 13 0 1 1 0-34z"/>',
  star: '<path d="M30 25l5.6 12.2 13.4 1.4-10 9 2.9 13.1L30 54l-11.9 6.7L21 47.6l-10-9 13.4-1.4z"/>',
}

const cardBack = (suit: (typeof suits)[number]) => `
  <svg viewBox="0 0 60 90" aria-hidden="true">
    <rect x="4" y="4" width="52" height="82" rx="4" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
    <rect x="8" y="8" width="44" height="74" rx="2" fill="none" stroke="currentColor" stroke-width="0.6" stroke-dasharray="2 2" opacity="0.6"/>
    <g fill="currentColor" stroke="currentColor">${suitMark[suit]}</g>
    <g fill="currentColor" opacity="0.7"><circle cx="14" cy="14" r="1.4"/><circle cx="46" cy="14" r="1.4"/><circle cx="14" cy="76" r="1.4"/><circle cx="46" cy="76" r="1.4"/></g>
  </svg>`

function roman(n: number): string {
  const map: [number, string][] = [[100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  return map.reduce((out, [v, s]) => { while (n >= v) { out += s; n -= v } return out }, '')
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

const theme: Theme = {
  voice,
  mount(root: HTMLElement, machine: Machine) {
    document.documentElement.dataset.theme = 'tarot'
    document.title = 'The Creative Oracle'
    root.innerHTML = `
      <div class="booth">
        <div class="awning" aria-hidden="true"></div>
        <header class="sign">
          <p class="sign-top">Pier End · Est. 1887</p>
          <h1>The Creative Oracle</h1>
          <p class="sign-sub">Visions curated · Futures pitched</p>
        </header>
        <main class="table">
          <div class="spread">
            ${machine.reels.map((r, i) => `
              <section class="slot suit-${suits[i]}" aria-label="${r.label}">
                <p class="suit-name">${r.label}</p>
                <div class="deck" data-deck="${i}" aria-hidden="true">${cardBack(suits[i])}</div>
                <div class="card up" data-card="${i}">
                  <div class="inner">
                    <div class="face back">${cardBack(suits[i])}</div>
                    <div class="face front">
                      <span class="numeral" data-numeral="${i}"></span>
                      <div class="art" data-art="${i}"></div>
                      <p class="name" data-name="${i}"></p>
                    </div>
                  </div>
                </div>
                <button type="button" class="keep" data-keep="${i}" aria-pressed="false" aria-label="Hold the ${r.label.toLowerCase()} card">Hold</button>
              </section>`).join('')}
          </div>
          <button type="button" class="shuffle"><span class="seal">${waxSeal}</span><span class="scroll">Shuffle &amp; Deal</span></button>
          <div class="reading">
            <p class="status" data-status>${IDLE}</p>
            <p class="brief" aria-hidden="true"></p>
          </div>
        </main>
      </div>`

    const cards = [...root.querySelectorAll<HTMLElement>('[data-card]')]
    const decks = [...root.querySelectorAll<HTMLElement>('[data-deck]')]
    const keeps = [...root.querySelectorAll<HTMLButtonElement>('[data-keep]')]
    const shuffle = root.querySelector<HTMLButtonElement>('.shuffle')!
    const status = root.querySelector<HTMLElement>('[data-status]')!
    const brief = root.querySelector<HTMLElement>('.brief')!

    const show = (i: number, item: Item) => {
      root.querySelector(`[data-numeral="${i}"]`)!.textContent = roman(machine.reels[i].items.indexOf(item) + 1)
      root.querySelector(`[data-art="${i}"]`)!.innerHTML = badgeSvg(item)
      root.querySelector(`[data-name="${i}"]`)!.textContent = item.item
    }
    machine.reels.forEach((_, i) => show(i, machine.results[i]))
    brief.textContent = machine.brief

    keeps.forEach((b, i) => b.addEventListener('click', () => machine.toggleHold(i)))
    shuffle.addEventListener('click', () => machine.spin())

    const setBusy = (busy: boolean) => {
      shuffle.disabled = busy || !machine.canSpin
      keeps.forEach((b) => (b.disabled = busy))
    }

    cleanup.push(machine.on('hold', ({ index, held }) => {
      keeps[index].setAttribute('aria-pressed', String(held))
      keeps[index].textContent = held ? 'Held' : 'Hold'
      cards[index].classList.toggle('kept', held)
      shuffle.disabled = !machine.canSpin
      status.textContent = machine.canSpin ? IDLE : 'All held · release one to deal again'
    }))

    cleanup.push(machine.on('spin', async ({ spinning, results }) => {
      setBusy(true)
      status.textContent = 'The cards are shuffling…'
      brief.classList.add('waiting')
      if (prefersReducedMotion()) {
        spinning.forEach((i) => show(i, results[i]))
        return machine.settle()
      }
      // Turn the old cards over and sweep them back to their decks, then shuffle.
      spinning.forEach((i) => cards[i].classList.remove('up'))
      await wait(350)
      spinning.forEach((i) => { cards[i].classList.add('away'); decks[i].classList.add('shuffling') })
      await wait(650)
      spinning.forEach((i) => decks[i].classList.remove('shuffling'))
      // Deal one at a time, then flip, left to right.
      for (const i of spinning) {
        show(i, results[i])
        cards[i].classList.remove('away')
        await wait(320)
      }
      for (const i of spinning) {
        cards[i].classList.add('up')
        await wait(420)
      }
      machine.settle()
    }))

    cleanup.push(machine.on('ready', (e) => {
      setBusy(false)
      status.textContent = 'The Oracle sees…'
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

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
const IDLE = 'Ready when you are'

// Three seeds so the three boxes don't all wobble in exactly the same pattern.
const wobble = `
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    ${[6, 17, 29, 41].map((seed) => `
      <filter id="board-wobble-${seed}" x="-8%" y="-8%" width="116%" height="116%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.045" numOctaves="2" seed="${seed}"/>
        <feDisplacementMap in="SourceGraphic" scale="6"/>
      </filter>`).join('')}
  </svg>`
const boxSeeds = [6, 17, 29] as const

const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

const theme: Theme = {
  voice,
  mount(root: HTMLElement, machine: Machine) {
    document.documentElement.dataset.theme = 'whiteboard'
    document.title = 'Idea Workshop'
    root.innerHTML = `
      ${wobble}
      <div class="board">
        <div class="wall">
          <header class="board-head">
            <h1>Idea Workshop</h1>
            <p class="board-sub">let's riff on something</p>
          </header>
          <main class="slots">
            ${machine.reels.map((r, i) => `
              <section class="slot cat-${categories[i]}" aria-label="${r.label}">
                <div class="frame">
                  <div class="frame-border" aria-hidden="true" style="filter:url(#board-wobble-${boxSeeds[i]})"></div>
                  <p class="frame-label">${sentence(r.label)}</p>
                  <div class="note-well">
                    <div class="note" data-note="${i}"><p class="note-text" data-text="${i}"></p></div>
                  </div>
                  <button type="button" class="keep" data-keep="${i}" aria-pressed="false" aria-label="Keep the ${r.label.toLowerCase()}">
                    <span class="keep-word">keep</span>
                    <svg class="keep-ring" viewBox="0 0 100 46" aria-hidden="true" style="filter:url(#board-wobble-${boxSeeds[i]})"><ellipse cx="50" cy="23" rx="46" ry="19"/></svg>
                  </button>
                </div>
              </section>`).join('')}
          </main>
          <button type="button" class="reroll">
            <span class="reroll-box"><span class="reroll-border" aria-hidden="true" style="filter:url(#board-wobble-41)"></span><span class="reroll-text">Reroll</span></span>
          </button>
          <div class="reading">
            <p class="status" data-status>${IDLE}</p>
            <p class="brief" aria-hidden="true"></p>
          </div>
        </div>
      </div>`

    const notes = [...root.querySelectorAll<HTMLElement>('[data-note]')]
    const texts = [...root.querySelectorAll<HTMLElement>('[data-text]')]
    const slots = [...root.querySelectorAll<HTMLElement>('.slot')]
    const keeps = [...root.querySelectorAll<HTMLButtonElement>('[data-keep]')]
    const reroll = root.querySelector<HTMLButtonElement>('.reroll')!
    const status = root.querySelector<HTMLElement>('[data-status]')!
    const brief = root.querySelector<HTMLElement>('.brief')!

    const show = (i: number, item: Item) => { texts[i].textContent = item.item }
    machine.reels.forEach((_, i) => show(i, machine.results[i]))

    keeps.forEach((b, i) => b.addEventListener('click', () => machine.toggleHold(i)))
    reroll.addEventListener('click', () => machine.spin())

    const setBusy = (busy: boolean) => {
      reroll.disabled = busy || !machine.canSpin
      keeps.forEach((b) => (b.disabled = busy))
    }

    cleanup.push(machine.on('hold', ({ index, held }) => {
      keeps[index].setAttribute('aria-pressed', String(held))
      slots[index].classList.toggle('kept', held)
      reroll.disabled = !machine.canSpin
      status.textContent = machine.canSpin ? IDLE : 'Everything is kept — let one go to reroll'
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
      status.textContent = 'Reworking the board…'
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
      status.textContent = IDLE
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

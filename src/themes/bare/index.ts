import './style.css'
import type { Theme } from '../types'
import type { Machine } from '../../engine/machine'
import { prefersReducedMotion } from '../../shell/controls'

// Unstyled reference theme: proves the contract and doubles as a debugging view.
let cleanup: (() => void)[] = []

const theme: Theme = {
  mount(root: HTMLElement, machine: Machine) {
    root.innerHTML = `
      <main class="bare">
        <div class="reels">
          ${machine.reels.map((r, i) => `
            <section class="reel">
              <h2>${r.label}</h2>
              <p class="result" data-reel="${i}"></p>
              <small class="family" data-family="${i}"></small>
              <button type="button" class="hold" data-hold="${i}" aria-pressed="false">HOLD</button>
            </section>`).join('')}
        </div>
        <button type="button" class="spin">SPIN IDEA</button>
        <p class="brief" aria-hidden="true"></p>
      </main>`
    const results = [...root.querySelectorAll<HTMLElement>('[data-reel]')]
    const families = [...root.querySelectorAll<HTMLElement>('[data-family]')]
    const holds = [...root.querySelectorAll<HTMLButtonElement>('[data-hold]')]
    const spin = root.querySelector<HTMLButtonElement>('.spin')!
    const brief = root.querySelector<HTMLElement>('.brief')!
    brief.textContent = machine.brief

    const show = (i: number, item = machine.results[i]) => {
      results[i].textContent = item.item
      families[i].textContent = item.family
    }
    machine.reels.forEach((_, i) => show(i))

    holds.forEach((b, i) => b.addEventListener('click', () => machine.toggleHold(i)))
    spin.addEventListener('click', () => machine.spin())

    cleanup.push(machine.on('hold', ({ index, held }) => {
      holds[index].setAttribute('aria-pressed', String(held))
      holds[index].textContent = held ? 'HELD' : 'HOLD'
    }))

    cleanup.push(machine.on('spin', ({ spinning, results: final }) => {
      spin.disabled = true
      brief.textContent = '…'
      holds.forEach((b) => (b.disabled = true))
      if (prefersReducedMotion()) {
        spinning.forEach((i) => show(i, final[i]))
        return machine.settle()
      }
      spinning.forEach((i, order) => {
        const items = machine.reels[i].items
        const t = setInterval(() => show(i, items[Math.floor(Math.random() * items.length)]), 60)
        setTimeout(() => {
          clearInterval(t)
          show(i, final[i])
          if (order === spinning.length - 1) machine.settle()
        }, 700 + order * 400)
      })
    }))

    cleanup.push(machine.on('ready', (e) => {
      brief.textContent = e.brief
      spin.disabled = false
      holds.forEach((b) => (b.disabled = false))
      spin.disabled = !machine.canSpin
    }))
    cleanup.push(machine.on('hold', () => (spin.disabled = !machine.canSpin)))
  },
  unmount() {
    cleanup.forEach((f) => f())
    cleanup = []
  },
}

export default theme

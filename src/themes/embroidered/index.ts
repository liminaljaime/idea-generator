import './style.css'
import type { Theme } from '../types'
import type { Machine } from '../../engine/machine'
import type { Item } from '../../engine/types'
import { prefersReducedMotion } from '../../shell/controls'
import { badgeSvg, motifSvg } from './badges'

// Embroidered arcade: a 90s fruit machine imagined by a textile artist.
let cleanup: (() => void)[] = []

const lock = `<svg viewBox="0 0 7 8" width="14" height="16" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M2 0h3v1H2zM1 1h1v3H1zM5 1h1v3H5zM0 3h7v5H0z"/><path fill="var(--raspberry)" d="M3 5h1v2H3z"/></svg>`
const stem = `<svg class="stem" viewBox="0 0 7 14" width="28" height="56" shape-rendering="crispEdges" aria-hidden="true"><path fill="var(--aubergine)" d="M3 6h1v8H3zM0 9h1v1H0zM1 10h1v1H1zM2 11h1v1H2zM6 9h1v1H6zM5 10h1v1H5zM4 11h1v1H4z"/><path fill="var(--raspberry)" d="M2 0h3v1H2zM1 1h5v3H1zM2 4h3v1H2z"/><path fill="var(--cream)" d="M3 2h1v1H3z"/></svg>`

function flicker(el: HTMLElement) {
  el.classList.remove('landed')
  void el.offsetWidth
  el.classList.add('landed')
}

const theme: Theme = {
  mount(root: HTMLElement, machine: Machine) {
    document.documentElement.dataset.theme = 'embroidered'
    root.innerHTML = `
      <div class="scene">
        <div class="deco deco-left" aria-hidden="true"><span class="plus">+</span><span class="thread"></span>${stem}</div>
        <main class="cabinet">
          <header class="marquee">
            <span class="sparkles" aria-hidden="true">+<sub>+</sub></span>
            ${motifSvg('flower')}
            <h1>Idea Machine</h1>
            ${motifSvg('flower')}
            <span class="sparkles" aria-hidden="true"><sub>+</sub>+</span>
          </header>
          <div class="reels">
            ${machine.reels.map((r, i) => `
              <section class="reel" aria-label="${r.label}">
                <div class="frame">
                  <h2>${r.label}</h2>
                  <div class="window" data-window="${i}">
                    <span class="tick" aria-hidden="true">+</span>
                    <div class="badge" data-badge="${i}"></div>
                    <p class="result" data-result="${i}"></p>
                    <span class="tick" aria-hidden="true">+</span>
                  </div>
                </div>
                <button type="button" class="hold" data-hold="${i}" aria-pressed="false">
                  <span class="lock">${lock}</span><span class="hold-text">HOLD</span>
                </button>
              </section>`).join('')}
          </div>
          <button type="button" class="spin">SPIN IDEA</button>
          <footer class="panel">
            <span class="dither" aria-hidden="true"></span>
            <span class="status" data-status>INSERT CURIOSITY ${motifSvg('flower')} NO COINS REQUIRED</span>
            <span class="dither" aria-hidden="true"></span>
          </footer>
        </main>
        <div class="deco deco-right" aria-hidden="true"><span class="plus">+</span><span class="thread"></span>${stem}</div>
        <figure class="director">
          <figcaption>THE ART DIRECTOR SAYS</figcaption>
          <blockquote class="brief" aria-hidden="true"></blockquote>
        </figure>
      </div>`

    const windows = [...root.querySelectorAll<HTMLElement>('[data-window]')]
    const badges = [...root.querySelectorAll<HTMLElement>('[data-badge]')]
    const results = [...root.querySelectorAll<HTMLElement>('[data-result]')]
    const holds = [...root.querySelectorAll<HTMLButtonElement>('[data-hold]')]
    const spin = root.querySelector<HTMLButtonElement>('.spin')!
    const status = root.querySelector<HTMLElement>('[data-status]')!
    const brief = root.querySelector<HTMLElement>('.brief')!
    const idle = status.innerHTML

    const show = (i: number, item: Item) => {
      results[i].textContent = item.item
      badges[i].innerHTML = badgeSvg(item)
    }
    machine.reels.forEach((_, i) => show(i, machine.results[i]))
    brief.textContent = machine.brief

    holds.forEach((b, i) => b.addEventListener('click', () => machine.toggleHold(i)))
    spin.addEventListener('click', () => machine.spin())

    const setBusy = (busy: boolean) => {
      spin.disabled = busy || !machine.canSpin
      holds.forEach((b) => (b.disabled = busy))
    }

    cleanup.push(machine.on('hold', ({ index, held }) => {
      holds[index].setAttribute('aria-pressed', String(held))
      holds[index].querySelector('.hold-text')!.textContent = held ? 'HELD' : 'HOLD'
      spin.disabled = !machine.canSpin
      status.innerHTML = machine.canSpin ? idle : 'ALL HELD · RELEASE ONE TO SPIN'
    }))

    cleanup.push(machine.on('spin', ({ spinning, results: final }) => {
      setBusy(true)
      status.textContent = 'SPINNING…'
      brief.classList.add('waiting')
      if (prefersReducedMotion()) {
        spinning.forEach((i) => show(i, final[i]))
        return machine.settle()
      }
      spinning.forEach((i, order) => {
        const items = machine.reels[i].items
        windows[i].classList.add('spinning')
        const t = setInterval(() => show(i, items[Math.floor(Math.random() * items.length)]), 70)
        setTimeout(() => {
          clearInterval(t)
          windows[i].classList.remove('spinning')
          show(i, final[i])
          flicker(windows[i])
          if (order === spinning.length - 1) machine.settle()
        }, 900 + order * 450)
      })
    }))

    cleanup.push(machine.on('ready', (e) => {
      setBusy(false)
      status.textContent = 'IDEA READY'
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

import './style.css'
import type { Theme } from '../types'
import type { Machine } from '../../engine/machine'
import type { Item } from '../../engine/types'
import { prefersReducedMotion } from '../../shell/controls'
import { badgeSvg, motifSvg } from './badges'
import { stitchLabel, stitchText } from './stitch'

// Embroidered arcade: a 90s pixel fruit machine that turns out, up close, to be hand-stitched.
let cleanup: (() => void)[] = []

// Hand-made wobble for outlines and fabric edges.
const filters = `
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <filter id="handmade" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7"/>
      <feDisplacementMap in="SourceGraphic" scale="1.3"/>
    </filter>
  </svg>`

const IDLE = 'Insert curiosity · no coins required'

function flicker(el: HTMLElement) {
  el.classList.remove('landed')
  void el.offsetWidth
  el.classList.add('landed')
}

const theme: Theme = {
  mount(root: HTMLElement, machine: Machine) {
    document.documentElement.dataset.theme = 'embroidered'
    const deco = (side: string) =>
      `<div class="deco deco-${side}" aria-hidden="true">${motifSvg('plus')}<span class="thread"></span>${motifSvg('flower')}</div>`
    root.innerHTML = `
      ${filters}
      <div class="scene">
        ${deco('left')}
        <main class="cabinet">
          <header class="marquee">
            ${motifSvg('plus')}${motifSvg('flower')}
            <h1>${stitchLabel('Idea Machine', 'title')}</h1>
            ${motifSvg('flower')}${motifSvg('plus')}
          </header>
          <div class="reels">
            ${machine.reels.map((r, i) => `
              <section class="reel" aria-label="${r.label}">
                <div class="frame">
                  <h2>${stitchText(r.label)}</h2>
                  <div class="window" data-window="${i}">
                    <div class="badge" data-badge="${i}"></div>
                    <p class="result" data-result="${i}"></p>
                  </div>
                </div>
                <button type="button" class="hold" data-hold="${i}" aria-pressed="false" aria-label="Hold ${r.label.toLowerCase()}">
                  <span class="face off">${stitchText('Hold')}</span>
                  <span class="face on">${motifSvg('lock')}${stitchText('Held')}</span>
                </button>
              </section>`).join('')}
          </div>
          <button type="button" class="spin">${motifSvg('plus')}${stitchLabel('Spin idea')}${motifSvg('plus')}</button>
          <footer class="panel">
            <p class="status" data-status></p>
            <p class="brief" aria-hidden="true"></p>
          </footer>
        </main>
        ${deco('right')}
      </div>`

    const windows = [...root.querySelectorAll<HTMLElement>('[data-window]')]
    const badges = [...root.querySelectorAll<HTMLElement>('[data-badge]')]
    const results = [...root.querySelectorAll<HTMLElement>('[data-result]')]
    const holds = [...root.querySelectorAll<HTMLButtonElement>('[data-hold]')]
    const spin = root.querySelector<HTMLButtonElement>('.spin')!
    const status = root.querySelector<HTMLElement>('[data-status]')!
    const brief = root.querySelector<HTMLElement>('.brief')!

    const setStatus = (text: string) => (status.innerHTML = stitchLabel(text))
    const show = (i: number, item: Item) => {
      results[i].textContent = item.item
      badges[i].innerHTML = badgeSvg(item)
    }
    machine.reels.forEach((_, i) => show(i, machine.results[i]))
    brief.textContent = machine.brief
    setStatus(IDLE)

    holds.forEach((b, i) => b.addEventListener('click', () => machine.toggleHold(i)))
    spin.addEventListener('click', () => machine.spin())

    const setBusy = (busy: boolean) => {
      spin.disabled = busy || !machine.canSpin
      holds.forEach((b) => (b.disabled = busy))
    }

    cleanup.push(machine.on('hold', ({ index, held }) => {
      holds[index].setAttribute('aria-pressed', String(held))
      spin.disabled = !machine.canSpin
      setStatus(machine.canSpin ? IDLE : 'All held · release one to spin')
    }))

    cleanup.push(machine.on('spin', ({ spinning, results: final }) => {
      setBusy(true)
      setStatus('Spinning…')
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
      setStatus("Idea ready · the art director says")
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

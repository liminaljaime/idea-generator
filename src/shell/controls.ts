import type { Machine } from '../engine/machine'

/**
 * Behaviour every theme gets for free: keyboard shortcuts and a screen-reader
 * announcement of each result. Themes only handle visuals and pointer input.
 */
export function attachShell(machine: Machine): () => void {
  const live = document.createElement('div')
  live.setAttribute('aria-live', 'polite')
  live.className = 'visually-hidden'
  document.body.append(live)

  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('button, input, textarea, select')) return
    if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); machine.spin() }
    const n = Number(e.key)
    if (n >= 1 && n <= machine.reels.length) machine.toggleHold(n - 1)
  }
  document.addEventListener('keydown', onKey)

  const offReady = machine.on('ready', ({ results, brief }) => {
    live.textContent = machine.reels.map((r, i) => `${r.label}: ${results[i].item}`).join('. ') + `. ${brief}`
  })
  const offHold = machine.on('hold', ({ index, held }) => {
    live.textContent = `${machine.reels[index].label} ${held ? 'held' : 'released'}`
  })

  return () => { document.removeEventListener('keydown', onKey); offReady(); offHold(); live.remove() }
}

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

import './style.css'
import './gallery.css'
import { reels } from '../../data/reels'
import { motifs } from '../../data/badges'
import { badgeSvg, isDrawn, motifFor } from './badges'
import { stitchLabel } from './stitch'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** Review page (?view=badges): every item, its intended motif, and whether it is drawn yet. */
export function mountGallery(root: HTMLElement) {
  document.documentElement.dataset.theme = 'embroidered'
  document.documentElement.classList.add('gallery-page')
  const all = reels.flatMap((r) => r.items)
  const drawn = all.filter((i) => isDrawn(i.badge)).length

  root.innerHTML = `
    <main class="gallery">
      <header class="gallery-head">
        <h1>${stitchLabel('Badge library', 'title')}</h1>
        <p><strong>${drawn}</strong> of ${all.length} badges stitched. Undrawn items show their family's stand-in badge.</p>
        <nav class="filters" aria-label="Filter badges">
          <button type="button" data-filter="all" aria-pressed="true">All</button>
          <button type="button" data-filter="todo" aria-pressed="false">To draw</button>
          <button type="button" data-filter="drawn" aria-pressed="false">Drawn</button>
          <button type="button" data-filter="witty" aria-pressed="false">Witty</button>
          <button type="button" data-filter="literal" aria-pressed="false">Literal</button>
        </nav>
      </header>
      ${reels.map((reel) => {
        const families = [...new Set(reel.items.map((i) => i.family))]
        return `
          <section class="reel-group">
            <h2>${stitchLabel(reel.label)}</h2>
            ${families.map((family) => `
              <h3>${esc(family)}</h3>
              <ul class="cards">
                ${reel.items.filter((i) => i.family === family).map((item) => {
                  const m = motifs.get(item.badge)
                  const done = isDrawn(item.badge)
                  return `
                    <li class="card" data-done="${done}" data-tone="${m?.tone ?? ''}">
                      <div class="card-badge">${badgeSvg(item)}</div>
                      <div class="card-text">
                        <p class="card-item">${esc(item.item)}</p>
                        <p class="card-motif"><code>${esc(item.badge || '—')}</code> ${m ? esc(m.description) : 'no motif yet'}</p>
                        <p class="card-meta">${m?.tone ?? ''}${done ? ' · stitched' : ` · stand-in: ${esc(motifFor(item))}`}</p>
                      </div>
                    </li>`
                }).join('')}
              </ul>`).join('')}
          </section>`
      }).join('')}
    </main>`

  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')]
  const apply = (filter: string) => {
    buttons.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.filter === filter)))
    root.querySelector('.gallery')!.setAttribute('data-filter', filter)
    // Hide family headings whose cards are all filtered out.
    root.querySelectorAll<HTMLElement>('.cards').forEach((list) => {
      const empty = [...list.children].every((c) => getComputedStyle(c).display === 'none')
      list.hidden = empty
      ;(list.previousElementSibling as HTMLElement).hidden = empty
    })
    const url = new URL(location.href)
    url.searchParams.set('filter', filter)
    history.replaceState(null, '', url)
  }
  buttons.forEach((b) => b.addEventListener('click', () => apply(b.dataset.filter!)))
  const initial = new URLSearchParams(location.search).get('filter')
  if (initial && buttons.some((b) => b.dataset.filter === initial)) apply(initial)
}

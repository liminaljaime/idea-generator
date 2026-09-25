/**
 * Renders a character grid as cross-stitch: every filled cell becomes an "×" of
 * two thread strokes, the under-stitch slightly paler than the over-stitch.
 * r raspberry · p violet · g aubergine · w cream · b cobalt · t turquoise · # current colour · . empty
 */
const colours: Record<string, string> = {
  r: 'var(--raspberry)', p: 'var(--violet)', g: 'var(--aubergine)',
  w: 'var(--cream)', b: 'var(--cobalt)', t: 'var(--turquoise)', '#': 'currentColor',
}

const inset = 0.1

export function stitchSvg(grid: string[], className = ''): string {
  const w = Math.max(...grid.map((r) => r.length))
  const under: Record<string, string[]> = {}
  const over: Record<string, string[]> = {}
  grid.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (!colours[c]) return
      const [x0, y0, x1, y1] = [x + inset, y + inset, x + 1 - inset, y + 1 - inset]
      ;(under[c] ??= []).push(`M${x0} ${y0}L${x1} ${y1}`)
      ;(over[c] ??= []).push(`M${x1} ${y0}L${x0} ${y1}`)
    }),
  )
  const paths = Object.keys(under).map((c) =>
    `<path d="${under[c].join('')}" stroke="${colours[c]}" opacity="0.72"/>` +
    `<path d="${over[c].join('')}" stroke="${colours[c]}"/>`,
  )
  return `<svg class="stitch ${className}" viewBox="-0.1 -0.1 ${w + 0.2} ${grid.length + 0.2}" fill="none" stroke-width="0.4" stroke-linecap="round" aria-hidden="true">${paths.join('')}</svg>`
}

/** Chunky 7-row stitch alphabet, only the letters the interface needs. */
const letters: Record<string, string[]> = {
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'],
  ' ': ['..', '..', '..', '..', '..', '..', '..'],
}

/** Doubles every stitch sideways, like a satin fill, for heavier display lettering. */
const embolden = (row: string) => row.replace(/#/g, '##').replace(/\./g, '..')

export function stitchText(text: string, className = '', bold = false): string {
  const rows = Array.from({ length: 7 }, () => '')
  ;[...text.toUpperCase()].forEach((ch, i) => {
    const glyph = letters[ch] ?? letters[' ']
    rows.forEach((_, r) => (rows[r] += (i ? (bold ? '..' : '.') : '') + (bold ? embolden(glyph[r]) : glyph[r])))
  })
  return stitchSvg(rows, className)
}

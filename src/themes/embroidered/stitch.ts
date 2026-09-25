/**
 * Renders a character grid as cross-stitch: every filled cell becomes an "×" of
 * two thread strokes, the under-stitch slightly paler than the over-stitch.
 * r raspberry · p violet · g aubergine · w cream · b cobalt · t turquoise
 * y gold · n leaf · s pink · e stone · # current colour · . empty
 *
 * Size comes from CSS: each SVG is `rows × var(--s)` tall, so one stitch is the same
 * size wherever --s is the same — as it would be on a real piece of embroidery.
 */
const colours: Record<string, string> = {
  r: 'var(--raspberry)', p: 'var(--violet)', g: 'var(--aubergine)',
  w: 'var(--cream)', b: 'var(--cobalt)', t: 'var(--turquoise)',
  y: 'var(--gold)', n: 'var(--leaf)', s: 'var(--pink)', e: 'var(--stone)', '#': 'currentColor',
}

const inset = 0.12

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
    `<path d="${under[c].join('')}" stroke="${colours[c]}" opacity="0.7"/>` +
    `<path d="${over[c].join('')}" stroke="${colours[c]}"/>`,
  )
  return `<svg class="stitch ${className}" style="height:calc(${grid.length} * var(--s))" viewBox="-0.1 -0.1 ${w + 0.2} ${grid.length + 0.2}" fill="none" stroke-width="0.38" stroke-linecap="round" aria-hidden="true">${paths.join('')}</svg>`
}

/** 5×7 stitch alphabet for short interface copy. */
const glyphs: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#..##', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
  '·': ['.', '.', '.', '#', '.', '.', '.'],
  '…': ['.....', '.....', '.....', '.....', '.....', '.....', '#.#.#'],
  "'": ['#', '#', '.', '.', '.', '.', '.'],
  '-': ['...', '...', '...', '###', '...', '...', '...'],
  ' ': ['..', '..', '..', '..', '..', '..', '..'],
}

export function stitchText(text: string, className = ''): string {
  const rows = Array.from({ length: 7 }, () => '')
  ;[...text.toUpperCase()].forEach((ch, i) => {
    const glyph = glyphs[ch] ?? glyphs[' ']
    rows.forEach((_, r) => (rows[r] += (i ? '.' : '') + glyph[r]))
  })
  return stitchSvg(rows, `text ${className}`)
}

/** Stitched label plus hidden real text, so screen readers and search still read it. */
export const stitchLabel = (text: string, className = '') =>
  `<span class="visually-hidden">${text}</span>${stitchText(text, className)}`

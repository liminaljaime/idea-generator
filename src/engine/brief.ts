import type { Item } from './types'
import { parseCsv } from './csv'
import type { Rng } from './random'

export type Kind = 'opener' | 'closer' | 'held-what' | 'held-premise' | 'held-direction'
export type Lines = Record<Kind, string[]>

export function parseLines(csv: string): Lines {
  const lines: Lines = { opener: [], closer: [], 'held-what': [], 'held-premise': [], 'held-direction': [] }
  for (const { kind, line } of parseCsv(csv)) if (kind in lines && line) lines[kind as Kind].push(line)
  return lines
}

// Keep capitals when the first word is an acronym or brand (e.g. "IKEA", "CSS").
const lowerFirst = (s: string) => (/^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1))
const article = (s: string) => (/^[aeiou]/i.test(s) ? 'an' : 'a')
const endWithStop = (s: string) => (/[.!?…]$/.test(s) ? s : `${s}.`)
const pick = <T>(xs: T[], rng: Rng) => xs[Math.floor(rng() * xs.length)]

/** The core brief, grammatical for any combination of reel results. */
export function describe([what, premise, direction]: Item[]): string {
  const thing = lowerFirst(what.item)
  let s = `${article(thing)} ${thing} about ${lowerFirst(premise.item)}`
  const d = direction.item
  switch (direction.family) {
    case 'Visual reference': s += `, ${lowerFirst(d)}.`; break
    case 'Mechanism': s += ` that ${lowerFirst(d)}.`; break
    case 'Behaviour': s += `, where ${lowerFirst(d)}.`; break
    default: s += `. ${endWithStop(d)}`
  }
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const heldKinds: Kind[] = ['held-what', 'held-premise', 'held-direction']

/**
 * The art director's full line: an optional opener (or a remark about what was
 * held), the brief, and a closer.
 */
export function writeBrief(results: Item[], held: boolean[], lines: Lines, rng: Rng): string {
  const heldIdx = held.flatMap((h, i) => (h ? [i] : []))
  let intro = ''
  if (heldIdx.length && rng() < 0.7) {
    const i = pick(heldIdx, rng)
    const pool = lines[heldKinds[i]]
    if (pool?.length) intro = pick(pool, rng).replace('{item}', lowerFirst(results[i].item))
  } else if (rng() < 0.5 && lines.opener.length) {
    intro = pick(lines.opener, rng)
  }
  const core = describe(results)
  const closer = lines.closer.length ? pick(lines.closer, rng) : ''
  return [intro, core, closer].filter(Boolean).join(' ')
}

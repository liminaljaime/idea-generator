import type { Item } from './types'
import { parseCsv } from './csv'
import type { Rng } from './random'

/**
 * The art director's line plays back the three results in agency-speak.
 * It only reacts to what the reels chose; it never adds new creative direction.
 */
export type Lines = Record<string, string[]>

export function parseLines(csv: string): Lines {
  const lines: Lines = {}
  for (const { kind, line } of parseCsv(csv)) if (kind && line) (lines[kind] ??= []).push(line)
  return lines
}

// Keep capitals when the first word is an acronym or brand (e.g. "IKEA", "CSS", "MS Paint").
const lowerFirst = (s: string) => (/^[A-Z]{2}|^MS |^Mac /.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1))
const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const article = (s: string) => (/^[aeiou]/i.test(s) ? 'an' : 'a')
const pick = <T>(xs: T[], rng: Rng) => xs[Math.floor(rng() * xs.length)]

const directionKind: Record<string, string> = {
  'Visual reference': 'direction-visual',
  Behaviour: 'direction-behaviour',
  Mechanism: 'direction-mechanism',
}

/** Values for every placeholder; `{Name}` is the capitalised form of `{name}`. */
export function slots([what, premise, direction]: Item[]): Record<string, string> {
  const thing = lowerFirst(what.item)
  const d = direction.item
  const base: Record<string, string> = {
    what: `${article(thing)} ${thing}`,
    thing,
    premise: lowerFirst(premise.item),
    direction: lowerFirst(d),
    style: d.replace(/^In the style of /, ''),
    behaviour: lowerFirst(d),
    mechanism: d.replace(/^Plays on /, ''),
    technical: lowerFirst(d),
  }
  const all: Record<string, string> = { ...base }
  for (const [k, v] of Object.entries(base)) all[upperFirst(k)] = upperFirst(v)
  return all
}

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m)

/**
 * "<what> <premise>. <direction>. <nod>" — exactly one slang nod per line,
 * as its own sentence, so it reads as a Nathan Barley type, not a slang generator.
 */
export function writeBrief(results: Item[], held: boolean[], lines: Lines, rng: Rng): string {
  const values = slots(results)
  const kinds = ['what', 'premise', directionKind[results[2].family] ?? 'direction-technical']
  const heldKinds = ['held-what', 'held-premise', 'held-direction']
  const [what, premise, direction] = kinds.map((kind, i) => {
    const pool = held[i] && lines[heldKinds[i]]?.length ? lines[heldKinds[i]] : lines[kind]
    return pool?.length ? fill(pick(pool, rng), values) : ''
  })
  const nod = lines.nod?.length ? pick(lines.nod, rng) : ''
  return `${what} ${premise} ${direction}. ${nod}`.replace(/,+ /g, ', ').replace(/\s+/g, ' ').trim()
}

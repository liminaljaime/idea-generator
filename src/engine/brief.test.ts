import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseLines, slots, writeBrief } from './brief'
import { parseCsv } from './csv'
import type { Item } from './types'

const item = (family: string, text: string): Item => ({ family, item: text, badge: '' })
const load = (name: string) => parseCsv(readFileSync(`src/data/${name}.csv`, 'utf8')) as Item[]
const lines = parseLines(readFileSync('src/data/art-director.csv', 'utf8'))

describe('slots', () => {
  it('shapes each result for use inside a sentence', () => {
    const s = slots([
      item('Creative studio', 'Writing space'),
      item('Social', 'Gossip'),
      item('Visual reference', 'In the style of MS Paint'),
    ])
    expect(s.what).toBe('a writing space')
    expect(s.What).toBe('A writing space')
    expect(s.premise).toBe('gossip')
    expect(s.style).toBe('MS Paint')
    const m = slots([item('Toy', 'Oracle'), item('Ritual', 'Queuing'), item('Mechanism', 'Plays on the sunk cost fallacy')])
    expect(m.what).toBe('an oracle')
    expect(m.mechanism).toBe('the sunk cost fallacy')
  })
})

describe('writeBrief', () => {
  it('has lines for every slot, direction family and held reel', () => {
    for (const k of ['what', 'premise', 'direction-visual', 'direction-behaviour', 'direction-mechanism',
      'direction-technical', 'held-what', 'held-premise', 'held-direction', 'nod']) {
      expect(lines[k]?.length, k).toBeGreaterThan(0)
    }
  })

  it('names all three results and leaves no placeholders, for every template and item', () => {
    const [w, p, d] = ['what-to-make', 'premises', 'constraints'].map(load)
    let n = 0
    const seq = () => ((n = (n * 9301 + 49297) % 233280) / 233280)
    for (const direction of d) for (let k = 0; k < 20; k++) {
      const results = [w[k % w.length], p[(k * 7) % p.length], direction]
      const s = writeBrief(results, [k % 3 === 0, k % 5 === 0, k % 7 === 0], lines, seq)
      expect(s).not.toMatch(/[{}]|\s{2}/)
      expect(s).not.toMatch(/\b(the|our|same|an?) (an?|the) /i)
      expect(s).not.toMatch(/,[,.]|\.,|\.\.|\S—|it's (is|only|uses|fits|loads|controlled|built|sound|two|keyboard|monospace|under|everything)\b/i)
      expect(s).toMatch(/^[A-Z].*[.]$/)
      expect(lines.nod.filter((nod) => s.includes(nod.trim().replace(/^[,—] ?/, ''))).length).toBeGreaterThanOrEqual(1)
      expect(s.toLowerCase()).toContain(results[0].item.toLowerCase())
      expect(s.toLowerCase()).toContain(results[1].item.toLowerCase())
    }
  })
})

import { describe as group, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { describe, parseLines, writeBrief } from './brief'
import { parseCsv } from './csv'
import type { Item } from './types'

const it_ = (family: string, item: string): Item => ({ family, item, badge: '' })
const load = (name: string) => parseCsv(readFileSync(`src/data/${name}.csv`, 'utf8')) as Item[]

group('describe', () => {
  it('joins each direction family grammatically', () => {
    const what = it_('Personal space', 'Digital garden')
    const premise = it_('Digital life', 'Endless consumption')
    expect(describe([what, premise, it_('Behaviour', 'It gets bored of you')]))
      .toBe('A digital garden about endless consumption, where it gets bored of you.')
    expect(describe([it_('Toy', 'Oracle'), it_('Ritual', 'Queuing'), it_('Mechanism', 'Plays on the sunk cost fallacy')]))
      .toBe('An oracle about queuing that plays on the sunk cost fallacy.')
    expect(describe([what, it_('State', 'The Sunday scaries'), it_('Visual reference', 'In the style of a lost cat poster')]))
      .toBe('A digital garden about the Sunday scaries, in the style of a lost cat poster.')
    expect(describe([what, premise, it_('Technical constraint', 'CSS only')]))
      .toBe('A digital garden about endless consumption. CSS only.')
  })

  it('produces a clean sentence for every combination family', () => {
    const [w, p, d] = ['what-to-make', 'premises', 'constraints'].map(load)
    for (const a of w) for (const c of d) {
      const s = describe([a, p[0], c])
      expect(s).toMatch(/^[A-Z].*[.!?…]$/)
      expect(s).not.toMatch(/\s{2}|\.\.| ,/)
    }
  })
})

group('writeBrief', () => {
  const lines = parseLines(readFileSync('src/data/art-director.csv', 'utf8'))
  const results = [it_('Toy', 'Oracle'), it_('Ritual', 'Queuing'), it_('Technical constraint', 'No JavaScript')]

  it('loads every kind of line', () => {
    for (const pool of Object.values(lines)) expect(pool.length).toBeGreaterThan(0)
  })

  it('mentions a held reel when the intro is a held remark', () => {
    const s = writeBrief(results, [true, false, false], lines, () => 0)
    expect(s).toContain('oracle')
    expect(s).not.toContain('{item}')
  })
})

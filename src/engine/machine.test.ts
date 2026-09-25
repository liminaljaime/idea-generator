import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { Machine } from './machine'
import { parseCsv } from './csv'
import type { Reel } from './types'

const reel = (id: string, n: number): Reel => ({
  id, label: id, items: Array.from({ length: n }, (_, i) => ({ family: 'F', item: `${id}${i}`, badge: '' })),
})
const make = () => new Machine([reel("a", 5), reel("b", 5), reel("c", 5)])

describe('Machine', () => {
  it('starts with a result on every reel', () => {
    expect(make().results.every(Boolean)).toBe(true)
  })

  it('spins only unheld reels and always changes them', () => {
    const m = make()
    m.toggleHold(1)
    for (let n = 0; n < 50; n++) {
      const before = [...m.results]
      m.spin(); m.settle()
      expect(m.results[1]).toBe(before[1])
      expect(m.results[0]).not.toBe(before[0])
      expect(m.results[2]).not.toBe(before[2])
    }
  })

  it('reports which reels are spinning', () => {
    const m = make()
    m.toggleHold(0)
    let spinning: number[] = []
    m.on('spin', (e) => (spinning = e.spinning))
    m.spin()
    expect(spinning).toEqual([1, 2])
  })

  it('ignores spins and holds until the theme settles', () => {
    const m = make()
    expect(m.spin()).toBe(true)
    expect(m.spin()).toBe(false)
    m.toggleHold(0)
    expect(m.held[0]).toBe(false)
    m.settle()
    expect(m.spin()).toBe(true)
  })

  it('cannot spin when every reel is held', () => {
    const m = make()
    m.toggleHold(0); m.toggleHold(1); m.toggleHold(2)
    expect(m.canSpin).toBe(false)
    expect(m.spin()).toBe(false)
  })
})

describe('parseCsv', () => {
  it('handles quoted commas, escaped quotes and CRLF', () => {
    expect(parseCsv('family,item,badge\r\nA,"x, ""y""",\r\n')).toEqual([{ family: 'A', item: 'x, "y"', badge: '' }])
  })

  it.each(['what-to-make', 'premises', 'constraints'])('parses every row of %s.csv', (name) => {
    const text = readFileSync(`src/data/${name}.csv`, 'utf8')
    const rows = parseCsv(text)
    expect(rows.length).toBe(text.trim().split('\n').length - 1)
    expect(rows.every((r) => r.family && r.item)).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseCsv } from '../engine/csv'

const csv = (name: string) => parseCsv(readFileSync(`src/data/${name}.csv`, 'utf8'))

describe('badge catalogue', () => {
  const catalogue = csv('badges')
  const names = new Set(catalogue.map((m) => m.motif))

  it('describes every motif once, as literal or witty', () => {
    expect(names.size).toBe(catalogue.length)
    for (const m of catalogue) {
      expect(m.motif).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(m.description).toBeTruthy()
      expect(['literal', 'witty']).toContain(m.tone)
    }
  })

  it.each(['what-to-make', 'premises', 'constraints'])('gives every item in %s a catalogued motif', (name) => {
    for (const row of csv(name)) expect(names.has(row.badge), row.item).toBe(true)
  })
})

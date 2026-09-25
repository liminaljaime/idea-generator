import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseCsv } from '../../engine/csv'

const text = readFileSync('src/themes/embroidered/motifs.txt', 'utf8')
const blocks = text.split(/\n\s*\n/)
  .map((b) => b.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')))
  .filter((l) => l.length > 1)
const catalogue = new Set(parseCsv(readFileSync('src/data/badges.csv', 'utf8')).map((m) => m.motif))

describe('motifs.txt', () => {
  it('names each motif once, and only motifs from the catalogue', () => {
    const names = blocks.map((b) => b[0])
    expect(new Set(names).size).toBe(names.length)
    for (const n of names) expect(catalogue.has(n), n).toBe(true)
  })

  it('keeps every motif within the 15×15 badge box, in palette threads', () => {
    for (const [name, ...rows] of blocks) {
      expect(rows.length, name).toBeLessThanOrEqual(15)
      for (const r of rows) {
        expect(r.length, name).toBeLessThanOrEqual(15)
        expect(r, name).toMatch(/^[rpgwbtynse.]+$/)
      }
    }
  })
})

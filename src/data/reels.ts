import { parseCsv } from '../engine/csv'
import type { Item, Reel } from '../engine/types'
import whatToMake from './what-to-make.csv?raw'
import premises from './premises.csv?raw'
import constraints from './constraints.csv?raw'

const items = (csv: string): Item[] =>
  parseCsv(csv).map(({ family, item, badge }) => ({ family, item, badge: badge ?? '' })).filter((x) => x.item)

export const reels: Reel[] = [
  { id: 'what', label: 'WHAT TO MAKE', items: items(whatToMake) },
  { id: 'premise', label: 'PREMISE', items: items(premises) },
  { id: 'constraint', label: 'CONSTRAINT', items: items(constraints) },
]

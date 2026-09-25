import { parseCsv } from '../engine/csv'
import type { Item, Reel } from '../engine/types'
import { parseLines, writeBrief } from '../engine/brief'
import type { BriefWriter } from '../engine/machine'
import whatToMake from './what-to-make.csv?raw'
import premises from './premises.csv?raw'
import constraints from './constraints.csv?raw'
import artDirector from './art-director.csv?raw'

const items = (csv: string): Item[] =>
  parseCsv(csv).map(({ family, item, badge }) => ({ family, item, badge: badge ?? '' })).filter((x) => x.item)

export const reels: Reel[] = [
  { id: 'what', label: 'WHAT TO MAKE', items: items(whatToMake) },
  { id: 'premise', label: 'PREMISE', items: items(premises) },
  { id: 'direction', label: 'DIRECTION', items: items(constraints) },
]

const lines = parseLines(artDirector)
export const artDirectorBrief: BriefWriter = (results, held, rng) => writeBrief(results, held, lines, rng)

import { parseCsv } from '../engine/csv'
import catalogue from './badges.csv?raw'

export type Motif = { motif: string; description: string; tone: 'literal' | 'witty' }

/** What each badge should show, independent of how any theme draws it. */
export const motifs: Map<string, Motif> = new Map(
  (parseCsv(catalogue) as Motif[]).map((m) => [m.motif, m]),
)

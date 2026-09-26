import type { Machine } from '../engine/machine'

/** A theme owns every pixel and animation, and nothing about the rules. */
export interface Theme {
  mount(root: HTMLElement, machine: Machine): void
  unmount(): void
  /** Optional voice for the spoken line (a CSV like art-director.csv); defaults to the art director. */
  voice?: string
}

export type ThemeEntry = { label: string; load: () => Promise<{ default: Theme }>; hidden?: boolean }

export const themes: Record<string, ThemeEntry> = {
  embroidered: { label: 'Homespun Ideas', load: () => import('./embroidered') },
  tarot: { label: 'The Creative Oracle', load: () => import('./tarot') },
  lotto: { label: 'Lucky Ideas', load: () => import('./lotto') },
  whiteboard: { label: 'Concept Jam', load: () => import('./whiteboard') },
  bare: { label: 'Bare', load: () => import('./bare'), hidden: true },
}
export const defaultTheme = 'embroidered'

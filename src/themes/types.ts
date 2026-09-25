import type { Machine } from '../engine/machine'

/** A theme owns every pixel and animation, and nothing about the rules. */
export interface Theme {
  mount(root: HTMLElement, machine: Machine): void
  unmount(): void
}

export const themes: Record<string, () => Promise<{ default: Theme }>> = {
  bare: () => import('./bare'),
  embroidered: () => import('./embroidered'),
}
export const defaultTheme = 'embroidered'

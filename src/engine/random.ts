export type Rng = () => number

export const cryptoRng: Rng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32

/** Picks a random item, never the one currently showing (when there is a choice). */
export function pickDifferent<T>(items: T[], current: T | undefined, rng: Rng): T {
  const pool = items.length > 1 && current !== undefined ? items.filter((x) => x !== current) : items
  return pool[Math.floor(rng() * pool.length)]
}

import type { Item } from '../../engine/types'
import { stitchSvg } from './stitch'

/**
 * Badge motifs as cross-stitch grids (colour key in stitch.ts).
 */
const motifs: Record<string, string[]> = {
  flower: [
    '..rr.rr..',
    '.rrrrrrr.',
    '.rrrwrrr.',
    '..rrrrr..',
    '..rr.rr..',
    '....g....',
    '.pp.g.pp.',
    '..ppgpp..',
    '....g....',
  ],
  infinity: [
    '.pppp...pppp.',
    'pp..pp.pp..pp',
    'p....ppp....p',
    'p....ppp....p',
    'pp..pp.pp..pp',
    '.pppp...pppp.',
  ],
  hourglass: [
    'ggggggggg',
    '.g.....g.',
    '.grrrrrg.',
    '..grrrg..',
    '...grg...',
    '....g....',
    '...g.g...',
    '..g.r.g..',
    '.g.rrr.g.',
    '.grrrrrg.',
    'ggggggggg',
  ],
  star: [
    '....b....',
    '....b....',
    '...bbb...',
    'bbbbbbbbb',
    '.bbbbbbb.',
    '..bbbbb..',
    '..bb.bb..',
    '.bb...bb.',
    '.b.....b.',
  ],
  heart: [
    '.rr...rr.',
    'rrrr.rrrr',
    'rrwrrrrrr',
    'rrrrrrrrr',
    '.rrrrrrr.',
    '..rrrrr..',
    '...rrr...',
    '....r....',
  ],
  cherries: [
    '......gg.',
    '.....g.g.',
    '....g..g.',
    '...g...g.',
    '..g....g.',
    '.rrr..rrr',
    'rwrrrrwrr',
    'rrrrrrrrr',
    '.rrr..rrr',
  ],
  lock: [
    '.###.',
    '#...#',
    '#...#',
    '#####',
    '##.##',
    '##.##',
    '#####',
  ],
  plus: ['.#.', '###', '.#.'], // current colour
  sparkle: [
    '....t....',
    '....t....',
    '...ttt...',
    'tttt.tttt',
    '...ttt...',
    '....t....',
    '....t....',
  ],
}

/** Until every item has its own motif, families borrow a shared one. */
const familyMotif: Record<string, string> = {
  Ambient: 'star', Collection: 'heart', Commerce: 'cherries', Community: 'heart', 'Creative studio': 'star',
  Game: 'cherries', Learning: 'star', 'Live experience': 'sparkle', 'Map & explorer': 'star',
  'Personal space': 'flower', Publication: 'heart', 'Self-discovery': 'sparkle', Simulator: 'infinity',
  Story: 'heart', Tool: 'hourglass', Toy: 'cherries',
  Abstract: 'infinity', 'Digital life': 'infinity', 'Everyday life': 'flower', Ritual: 'hourglass',
  Social: 'heart', State: 'sparkle', 'Time & attention': 'hourglass',
  Behaviour: 'heart', Mechanism: 'infinity', 'Technical constraint': 'hourglass', 'Visual reference': 'star',
}

export function motifFor(item: Item): string {
  return motifs[item.badge] ? item.badge : familyMotif[item.family] ?? 'sparkle'
}

export function motifSvg(name: string): string {
  return stitchSvg(motifs[name] ?? motifs.sparkle)
}

export const badgeSvg = (item: Item) => motifSvg(motifFor(item))

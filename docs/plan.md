# Homespun Ideas — plan

A slot machine for internet-project ideas. Three reels — WHAT TO MAKE, PREMISE,
DIRECTION — each with a HOLD, and one SPIN IDEA action that spins the unheld reels.

## Principles

- **Mechanics and visuals are separate.** The engine decides every outcome; themes
  only render and animate. A new look is a new folder in `src/themes/`.
- **The CSVs in `src/data/` are the source of truth** for reel contents. Edit them in
  Numbers, on GitHub, or ask Claude. Columns: `family, item, badge`.
- **Every item gets its own badge where possible.** `badge` names a concept
  (`flower`, `infinity-knot`); each theme draws that concept its own way.
- **Mobile gets a real layout at launch**, not just a squashed desktop one.

## Architecture

```
src/
  engine/     rules only — Machine (results, holds, spin/settle), random, CSV parser
  data/       the three CSVs + reels.ts (labels and loading)
  shell/      shared by all themes — keyboard (Space spins, 1–3 hold), aria-live results
  themes/     one folder per theme, each implementing { mount, unmount }
    bare/       unstyled reference theme
    embroidered/  theme 1 (to build)
  main.ts     creates the machine, attaches the shell, loads ?theme=<name>
```

Spin flow: `machine.spin()` picks new results for unheld reels immediately and emits
`spin`; the theme animates, then calls `machine.settle()`, which emits `ready`.
Spins and holds are ignored while spinning. A spin never lands on the item already showing.

## Reel roles

Each reel is a voice in a creative brief: WHAT TO MAKE is the client, PREMISE the
writer, DIRECTION the art director (visual style, behaviour, technical limits, and
psychological mechanisms). Themes may give each reel a small character or patch.

## Art director's line

Under the machine, the spin is played back by a Nathan Barley-ish art director:
self-important agency-speak that only reacts to what the reels chose, never adding
new creative direction, with exactly one Gen Z / Gen Alpha nod per line.

Shape: `<what> <premise>. <direction>. <nod>` — e.g. "It's essentially a shared
board that's basically a meditation on taste. Very Web 2.0 gloss, in a knowing way.
It's giving main character."

Templates live in `src/data/art-director.csv` (`kind, line`). Kinds: `what`,
`premise` (ends with a full stop), `direction-visual|behaviour|mechanism|technical`
(no end punctuation), `held-what|premise|direction` (used when that reel is held),
and `nod` (a short standalone sentence). Placeholders: `{what}` (with a/an),
`{thing}` (without), `{premise}`, `{style}`, `{behaviour}`, `{mechanism}`,
`{technical}`, `{direction}`; capitalise (`{What}`) at the start of a sentence.
Built in `engine/brief.ts`; tests check every item fits without broken grammar.

## Badges

- Every item has its own motif (367, a mix of literal and witty/knowing — e.g.
  *Unearned confidence* is a snail wearing a tiny crown). Items point to a motif in
  their CSV `badge` column; `src/data/badges.csv` describes each motif
  (`motif, description, tone`) independent of any theme.
- Each theme draws motifs its own way. Fallback chain: item motif → family motif →
  plain default, so undrawn badges never leave a gap.
- Embroidered motifs are cross-stitch grids (about 11×11), shared stitch size, two or
  three palette threads, no text. Concrete objects may start from Kenney's CC0
  1-Bit Pack converted to stitch grids; abstract ones are drawn by hand in batches.
- `?view=badges` is the review gallery: every item, its motif and description, tone,
  and whether it is stitched yet, with filters.

## Theme 1: Embroidered arcade

Layout reference: [docs/reference/arcade-layout.webp](reference/arcade-layout.webp) —
marquee title, violet reel frames with curved cream drums (badge + text), HOLD row,
wide SPIN IDEA, footer microcopy, stitched flowers either side. Built as pixel-art
first; the embroidered texture pass comes on top of this structure.

A 1990s arcade fruit machine imagined by a textile artist. Custard-yellow fabric
background, cream linen cabinet, violet felt appliqué reel frames, aubergine thread
instead of black outlines, raspberry stitched controls. HOLD buttons are sewn fabric
tabs (HELD = raspberry, stitched padlock). SPIN IDEA is a small padded stitched pill.
Title "HOMESPUN IDEAS" (formerly Idea Machine) drawn with the cross-stitch renderer; pixel-terminal font for UI
copy. Purple display panel: INSERT CURIOSITY / NO COINS REQUIRED / IDEA READY. Sparse
sewn flowers, stars, hearts, cherries, loose threads. No plastic, gradients, casino cues.

## Theme 2: Madame Idea (tarot)

A tongue-in-cheek pier-end fortune-teller's booth: striped awning, bulb-lit sign,
velvet table. Three decks (sun = what to make, moon = premise, star = direction).
SHUFFLE & DEAL sweeps unkept cards back, riffles the decks, deals and flips one at a
time; KEEP holds a card face up. Card faces reuse the cross-stitch badges, with a
Roman numeral (the item's position in its list). The reader's lines live in
`src/data/tarot-reader.csv` (same kinds as art-director.csv); a theme can supply its
own voice via `Theme.voice`. A shared theme switcher sits top-right on every theme.

## Build order

1. ~~Engine, CSV data, shell, bare theme~~ ✅
2. Embroidered theme: layout, fabric/stitch textures, title, controls, mobile layout
3. Badge system: gallery, fallbacks, 27 family motifs, first item badges
4. Suggest a motif name for all 367 items → review in CSV
5. Draw item badges in batches of 30–40 (ongoing)
6. Polish: reel animation, optional sound (muted by default)
7. Later: share links (`?i=…` reopens a result), copy idea, theme switcher, Notion sync

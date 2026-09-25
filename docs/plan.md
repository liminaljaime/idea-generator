# Idea Machine — plan

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

Under the machine, the spin is played back by an absurd agency art director who
speaks in Gen Z / Gen Alpha slang. It only reacts to what the reels chose and never
adds new creative direction. One remark per reel (a held reel gets a held remark),
then sometimes a closing reaction.

Templates live in `src/data/art-director.csv` (`kind, line`). Kinds: `what`,
`premise`, `direction-visual|behaviour|mechanism|technical`, `held-what|premise|direction`,
`closer`. Placeholders: `{what}` (with a/an), `{thing}` (without), `{premise}`,
`{style}`, `{behaviour}`, `{mechanism}`, `{technical}`, `{direction}`; capitalise the
first letter (`{What}`) for the start of a sentence. Built in `engine/brief.ts`.

## Badges

- Per-item motif names in the CSV `badge` column (expect ~250–300 distinct motifs;
  items may share one when the idea genuinely matches).
- Fallback chain per theme: item motif → family motif (27 families) → plain default.
- Each embroidered motif is a 16×16 stitch grid rendered as cross-stitch SVG, same
  thread palette, no text.
- `?view=badges` gallery shows every item with its badge and what is still undrawn.

## Theme 1: Embroidered arcade

A 1990s arcade fruit machine imagined by a textile artist. Custard-yellow fabric
background, cream linen cabinet, violet felt appliqué reel frames, aubergine thread
instead of black outlines, raspberry stitched controls. HOLD buttons are sewn fabric
tabs (HELD = raspberry, stitched padlock). SPIN IDEA is a small padded stitched pill.
Title "IDEA MACHINE" drawn with the cross-stitch renderer; pixel-terminal font for UI
copy. Purple display panel: INSERT CURIOSITY / NO COINS REQUIRED / IDEA READY. Sparse
sewn flowers, stars, hearts, cherries, loose threads. No plastic, gradients, casino cues.

## Build order

1. ~~Engine, CSV data, shell, bare theme~~ ✅
2. Embroidered theme: layout, fabric/stitch textures, title, controls, mobile layout
3. Badge system: gallery, fallbacks, 27 family motifs, first item badges
4. Suggest a motif name for all 367 items → review in CSV
5. Draw item badges in batches of 30–40 (ongoing)
6. Polish: reel animation, optional sound (muted by default)
7. Later: share links (`?i=…` reopens a result), copy idea, theme switcher, Notion sync

# Idea Generator

The slot machine of creativity. Each spin picks one item from each of three reels.

## Editing the reels

Reel contents live in three CSVs in [`src/data/`](src/data/): `what-to-make.csv`,
`premises.csv`, `constraints.csv`, with columns `family, item, badge`. Edit them in
Numbers, on GitHub, or locally; the site redeploys when `main` changes.

## Themes

Game rules live in `src/engine/`; each look lives in `src/themes/<name>/`. Pick one with
`?theme=<name>`. See [docs/plan.md](docs/plan.md).

## Development

```bash
npm install
npm run dev
npm test
```

`npm run build` outputs a static site to `dist/`.

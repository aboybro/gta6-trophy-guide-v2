# gta6-trophy-guide-v2

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/aboybro/gta6-trophy-guide-v2/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/aboybro/gta6-trophy-guide-v2/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

**Leonida Ledger — Atlas Edition** — an offline guide and tracker for all 55 trophies of Grand Theft Auto VI on PlayStation 5, built for make.fun's "Build the best GTA 6 trophy guide" bounty ($250, top 50 paid).

Every trophy is shown with its official name, description and grade as PlayStation publishes them. Each guide is numbered steps, and **every step carries its own citation** (source name + date, e.g. PowerPyx, Nov 2026) — 165 cited steps in total, written in this entry's own words. The app also gives 21 interactive counters for the trophies with a number (42 Shooting Range challenges, 250 stunts, 100 WAiNK It spots, and more), an audit strip that shows the provenance at a glance (55/55 names verified, 165 cited steps, 21 counters, 10 dated sources), a three-stage roadmap to the Platinum (about 180–200 hours), and flags the one missable trophy — Positive Mental Attitude, whose first meditation spot disappears after Chapter 1. Five trophies have no confirmed unlock method in any published guide yet, and their guides say so honestly instead of guessing. All 55 trophies are offline single-player; there are no online trophies. Unofficial fan guide, not affiliated with Rockstar Games, Sony or PlayStation; no Rockstar logo or artwork is used.

Progress is tracked in the browser (localStorage): a checklist, the counters, filters by kind (story, missable, collectibles, activities, online) and grade, search, a spoiler setting that hides story trophies' names and descriptions until they are earned, and export to a JSON file with import back. The data file is fetched at run time, so the first load stays small.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. The guide is plain static files under `app/` — no build step, no network at run time. `main.ts` hands it in: it copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json`.

## Layout

- `app/index.html` — the page: header with audit strip and progress, roadmap, counters, checklist, sources.
- `app/app.js` — bootstrap: loads the data, wires the controls, reads demo states from the URL.
- `app/state.js` — tracker state: localStorage, export/import of progress.
- `app/render.js` — rendering: audit strip, roadmap, counters, trophy list with cited steps, sources panel.
- `app/style.css` — the look, an original design.
- `app/data/trophies.json` — the 55 official trophies with cited steps, counters, roadmap stages, kinds and missable flags.
- `screenshots/` — 4 screenshots of the guide running (see `shots.json` for the views).
- `main.ts` — the hand-in program. `serve.ts` — a tiny static server for local use.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>

SPDX-License-Identifier: MIT

// Leonida Ledger — Platinum Edition, a gta6-trophy-guide-01 entry (Node 22,
// standard library only). The guide itself is plain static files under app/:
// app/index.html opens in desktop Chrome and works with the network off, its
// trophy list and cited guides are app/data/trophies.json, fetched at run
// time so the first load stays small. This program hands the guide in: it
// copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads (the screenshots, the
// first load's files and bytes, and the source), with the vendored make.fun
// library. Leave vendor/makefun-frontend.ts as it is: the scorer requires
// dossier.json to be byte for byte what its own copy writes. The hand-in is
// deterministic: two runs write the same bytes, because it only copies files
// and builds the dossier from them, with no clock, no random value and no
// network in the path.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files and directories
// in app/ or 48 MiB of app files: app/ counts beside /output's own
// 1000-entry cap, its screenshots/ and dossier.json).
const DOSSIER_OPTIONS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

function handInGuide() {
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
  // Screenshots are part of the entry the judge reads: a hand-in without
  // them is a broken entry, so refuse loudly instead of writing one.
  if (!existsSync(join(repoRoot, 'screenshots'))) {
    throw new Error('screenshots/ is missing: take the 4 screenshots before handing in');
  }
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
  // Guard the hand-in before writing the dossier: the trophy file must hold
  // all 55 official trophies with a non-blank guide each, or the gate's
  // trophies row fails and the entry is never judged. A bad hand-in fails
  // loudly here instead of silently shipping an invalid entry.
  const trophyFile = JSON.parse(readFileSync(join(outputDir, 'app', 'data', 'trophies.json'), 'utf8'));
  const trophies = trophyFile.trophies ?? trophyFile;
  if (!Array.isArray(trophies) || trophies.length !== 55) {
    throw new Error('app/data/trophies.json must hold exactly 55 trophies, found ' + (Array.isArray(trophies) ? trophies.length : 'none'));
  }
  for (const trophy of trophies) {
    if (typeof trophy.name !== 'string' || !trophy.name.trim()) throw new Error('a trophy has no name');
    if (typeof trophy.guide !== 'string' || !trophy.guide.trim()) throw new Error('trophy ' + trophy.name + ' has no guide');
    if (!Array.isArray(trophy.steps) || trophy.steps.length === 0) throw new Error('trophy ' + trophy.name + ' has no cited steps');
  }
  writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, DOSSIER_OPTIONS));
  // The dossier must parse back as JSON: a corrupt dossier fails the gate's
  // dossier_matches row, so check it now while the failure is still cheap.
  JSON.parse(readFileSync(join(outputDir, 'dossier.json'), 'utf8'));
}

handInGuide();

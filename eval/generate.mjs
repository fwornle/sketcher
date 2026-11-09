#!/usr/bin/env node
// Renders the synthetic cases (eval/cases.mjs) to eval/cases/<id>.png plus the
// ground truth <id>.json. Deterministic: rerunning reproduces the same files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildScenes } from './cases.mjs';

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cases');
fs.mkdirSync(outDir, { recursive: true });

for (const scene of buildScenes()) {
  fs.writeFileSync(path.join(outDir, `${scene.id}.png`), scene.canvas.toPng());
  fs.writeFileSync(path.join(outDir, `${scene.id}.json`), `${JSON.stringify(scene.expected(), null, 2)}\n`);
  process.stdout.write(`${scene.id.padEnd(20)} ${String(scene.elements.length).padStart(3)} elements\n`);
}

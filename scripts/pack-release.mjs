#!/usr/bin/env node
// Build the web app and pack it with the sketcher CLI into release/sketcher-<version>.tgz.
//   node scripts/pack-release.mjs [--out <dir>] [--skip-build]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, 'app');
const CLI = path.join(ROOT, 'cli');

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outDir = path.resolve(outIndex >= 0 ? args[outIndex + 1] : path.join(ROOT, 'release'));
const skipBuild = args.includes('--skip-build');

const version = dir => JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version;
const npm = (cmdArgs, cwd) => execFileSync('npm', cmdArgs, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });

// The app shows its version in the bottom bar and the CLI reports its own: keep them equal
if (version(APP) !== version(CLI)) {
  process.stderr.write(`Version mismatch: app ${version(APP)}, cli ${version(CLI)}. Set both to the same version.\n`);
  process.exit(1);
}

if (!skipBuild) npm(['run', 'build'], APP);

const dist = path.join(CLI, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(path.join(APP, 'dist'), dist, { recursive: true });

fs.mkdirSync(outDir, { recursive: true });
npm(['pack', '--pack-destination', outDir], CLI);

const tarball = path.join(outDir, `sketcher-${version(CLI)}.tgz`);
if (!fs.existsSync(tarball)) {
  process.stderr.write(`Expected ${tarball} was not produced.\n`);
  process.exit(1);
}
const shown = tarball.startsWith(ROOT + path.sep) ? path.relative(ROOT, tarball) : tarball;
process.stdout.write(`\nPacked ${shown}\n`);

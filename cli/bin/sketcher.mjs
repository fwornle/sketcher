#!/usr/bin/env node
// sketcher: serve the installed Sketcher web app on localhost, and keep it up to date.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { createServer, listen } from '../lib/server.mjs';
import {
  DEFAULT_PORT, DIST_DIR, REQUIRED_NODE, VERSION,
  checkHealth, clearServerState, dataDir, isProcessAlive, logFile, readServerState, writeServerState,
} from '../lib/state.mjs';
import {
  ASSET_PATTERN, REPO, compareVersions, downloadLatest, ghInstalled, ghLoggedIn, latestReleaseVersion, run,
} from '../lib/release.mjs';

const BIN = fileURLToPath(import.meta.url);
const RELEASES_URL = `https://github.com/${REPO}/releases/latest`;

// Terminal output: this is a CLI, its output is the user interface
const out = (msg = '') => process.stdout.write(`${msg}\n`);
const fail = msg => process.stderr.write(`${msg}\n`);

const HELP = `sketcher ${VERSION}: turn whiteboard sketches into draw.io diagrams

Usage: sketcher [command] [options]

Commands:
  start              Start the app in the background and open it (default)
  stop               Stop the background server
  status             Show whether the server is running, and where
  doctor             Check the setup: Node, data directory, gh, port, updates
  update             Install the latest release (needs the GitHub CLI, gh)
  update --check     Only report whether a newer release exists
  uninstall          Stop the server and delete ${dataDir()}
  serve              Run the server in the foreground (used by start)
  help, --version

Options:
  --port <n>         Port to serve on (default ${DEFAULT_PORT})
  --no-open          Do not open the browser
  --yes              Answer yes to the uninstall question`;

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function start({ port, open }) {
  const url = `http://localhost:${port}`;
  const running = await runningServer();

  if (running && running.port === port) {
    out(`Sketcher ${running.version} is already running at ${url}`);
    if (open) openBrowser(url);
    return 0;
  }
  if (running) {
    fail(`Sketcher is already running on port ${running.port}; stop it first (sketcher stop).`);
    return 1;
  }

  const answering = await checkHealth(port);
  if (answering) {
    // A Sketcher server we have no record of (state file deleted): use it as is
    out(`Sketcher ${answering.version} is already answering at ${url}`);
    if (open) openBrowser(url);
    return 0;
  }
  if (!(await portIsFree(port))) {
    fail(`Port ${port} is in use by another program. Pick another one: sketcher start --port <n>`);
    return 1;
  }
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    fail(`The web app is missing from ${DIST_DIR}; reinstall sketcher.`);
    return 1;
  }

  fs.mkdirSync(dataDir(), { recursive: true });
  const log = fs.openSync(logFile(), 'a');
  const child = spawn(process.execPath, [BIN, 'serve', '--port', String(port)], {
    detached: true,
    stdio: ['ignore', log, log],
    windowsHide: true,
  });
  child.unref();
  fs.closeSync(log);

  for (let i = 0; i < 50; i++) {
    const health = await checkHealth(port, 300);
    if (health) {
      writeServerState({ pid: child.pid, port, version: health.version });
      out(`Sketcher ${health.version} is running at ${url}`);
      if (open) openBrowser(url);
      return 0;
    }
    if (child.exitCode !== null) break;
    await sleep(100);
  }
  fail(`The server did not start; see ${logFile()}`);
  return 1;
}

async function serve({ port }) {
  const server = createServer({ distDir: DIST_DIR, version: VERSION });
  try {
    await listen(server, port);
  } catch (err) {
    fail(err.code === 'EADDRINUSE' ? `Port ${port} is already in use.` : err.message);
    return 1;
  }
  out(`${new Date().toISOString()} sketcher ${VERSION} serving ${DIST_DIR} at http://localhost:${port}`);
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  return new Promise(() => {}); // run until signalled
}

async function stop({ quiet = false } = {}) {
  const state = readServerState();
  if (!state || !isProcessAlive(state.pid)) {
    clearServerState();
    if (!quiet) out('Sketcher is not running.');
    return 0;
  }
  try {
    process.kill(state.pid, 'SIGTERM');
  } catch (err) {
    fail(`Could not stop process ${state.pid}: ${err.message}`);
    return 1;
  }
  for (let i = 0; i < 50 && isProcessAlive(state.pid); i++) await sleep(100);
  if (isProcessAlive(state.pid)) {
    fail(`Process ${state.pid} is still running.`);
    return 1;
  }
  clearServerState();
  if (!quiet) out(`Stopped Sketcher (pid ${state.pid}).`);
  return 0;
}

async function status() {
  const running = await runningServer();
  out(`Installed version: ${VERSION}`);
  if (!running) {
    out('Server:            not running (start it with: sketcher)');
    return 0;
  }
  out(`Server:            running, pid ${running.pid}`);
  out(`URL:               http://localhost:${running.port}`);
  out(`Serving version:   ${running.version}${running.version !== VERSION ? ' (restart to serve the installed version)' : ''}`);
  return 0;
}

async function doctor({ port }) {
  let problems = 0;
  const ok = msg => out(`✓ ${msg}`);
  const bad = msg => { problems++; out(`✗ ${msg}`); };
  const note = msg => out(`· ${msg}`);

  if (compareVersions(process.versions.node, REQUIRED_NODE) >= 0) ok(`Node ${process.versions.node}`);
  else bad(`Node ${process.versions.node}: ${REQUIRED_NODE} or newer is required`);

  ok(`sketcher ${VERSION}`);
  if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) ok(`Web app: ${DIST_DIR}`);
  else bad(`Web app missing from ${DIST_DIR}: reinstall sketcher`);

  try {
    fs.mkdirSync(dataDir(), { recursive: true });
    fs.accessSync(dataDir(), fs.constants.W_OK);
    ok(`Data directory: ${dataDir()}`);
  } catch {
    bad(`Data directory not writable: ${dataDir()}`);
  }

  const running = await runningServer();
  if (running) {
    ok(`Server running at http://localhost:${running.port} (pid ${running.pid}, version ${running.version})`);
  } else if (await portIsFree(port)) {
    ok(`Server not running; port ${port} is free`);
  } else if (await checkHealth(port)) {
    ok(`Port ${port} answers as Sketcher`);
  } else {
    bad(`Port ${port} is in use by another program: start with --port <n>`);
  }

  if (!ghInstalled()) {
    note(`GitHub CLI (gh) not found: install updates by hand from ${RELEASES_URL}`);
  } else if (!ghLoggedIn()) {
    note('GitHub CLI found but not logged in (gh auth login): needed for sketcher update');
  } else {
    ok('GitHub CLI logged in');
    try {
      const latest = latestReleaseVersion();
      if (compareVersions(latest, VERSION) > 0) note(`Update available: ${VERSION} → ${latest} (sketcher update)`);
      else ok(`Up to date (latest release ${latest})`);
    } catch (err) {
      note(`Could not read the latest release: ${err.message}`);
    }
  }

  out(problems ? `\n${problems} problem(s) found.` : '\nAll good.');
  return problems ? 1 : 0;
}

async function update({ check }) {
  if (!ghInstalled() || !ghLoggedIn()) {
    fail(
      `sketcher update needs the GitHub CLI (gh), logged in with gh auth login.\n` +
      `Without it, download ${ASSET_PATTERN} from ${RELEASES_URL}\n` +
      `and install it with: npm install -g ./sketcher-<version>.tgz`,
    );
    return 1;
  }

  let latest;
  try {
    latest = latestReleaseVersion();
  } catch (err) {
    fail(`Could not read the latest release: ${err.message}`);
    return 1;
  }
  if (compareVersions(latest, VERSION) <= 0) {
    out(`sketcher ${VERSION} is up to date.`);
    return 0;
  }
  if (check) {
    out(`Update available: ${VERSION} → ${latest}. Install it with: sketcher update`);
    return 0;
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sketcher-update-'));
  try {
    out(`Downloading sketcher ${latest}…`);
    const download = downloadLatest(dir);
    if (download.status !== 0) {
      fail(`Download failed: ${(download.stderr || download.stdout).trim()}`);
      return 1;
    }
    const tarball = fs.readdirSync(dir).find(f => f.endsWith('.tgz'));
    if (!tarball) {
      fail('The release has no sketcher-*.tgz asset.');
      return 1;
    }

    const wasRunning = await runningServer();
    if (wasRunning) await stop({ quiet: true });

    out(`Installing ${tarball}…`);
    const install = run('npm', ['install', '-g', path.join(dir, tarball)], { stdio: 'inherit' });
    if (install.status !== 0) {
      fail('npm install -g failed; the previous version is unchanged.');
      if (wasRunning) await start({ port: wasRunning.port, open: false });
      return 1;
    }
    out(`Installed sketcher ${latest}.`);

    if (wasRunning) {
      // Restart through the freshly installed command, not this process's (old) code
      run('sketcher', ['start', '--no-open', '--port', String(wasRunning.port)], { stdio: 'inherit' });
    }
    return 0;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function uninstall({ yes }) {
  await stop({ quiet: true });
  const dir = dataDir();
  if (fs.existsSync(dir)) {
    let confirmed = yes;
    if (!confirmed) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await rl.question(`Delete ${dir}? [y/N] `);
      rl.close();
      confirmed = /^y(es)?$/i.test(answer.trim());
    }
    if (confirmed) {
      fs.rmSync(dir, { recursive: true, force: true });
      out(`Deleted ${dir}.`);
    } else {
      out(`Kept ${dir}.`);
    }
  }
  out('API keys and settings live in your browser, per address; clear them in the app if you want them gone.');
  out('To remove the command itself: npm rm -g sketcher');
  return 0;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** The recorded server, if its process is alive and answers; clears stale state. */
async function runningServer() {
  const state = readServerState();
  if (!state) return null;
  if (isProcessAlive(state.pid)) {
    const health = await checkHealth(state.port);
    if (health) return { ...state, version: health.version };
  }
  clearServerState();
  return null;
}

function portIsFree(port) {
  return new Promise(resolve => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)));
  });
}

function openBrowser(url) {
  const [cmd, args] =
    process.platform === 'darwin' ? ['open', [url]]
    : process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]]
    : ['xdg-open', [url]];
  try {
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true });
    child.on('error', () => out(`Open ${url} in your browser.`));
    child.unref();
  } catch {
    out(`Open ${url} in your browser.`);
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function parseArgs(argv) {
  const opts = { command: 'start', port: DEFAULT_PORT, open: true, check: false, yes: false };
  const rest = [...argv];
  if (rest[0] && !rest[0].startsWith('-')) opts.command = rest.shift();
  while (rest.length) {
    const arg = rest.shift();
    if (arg === '--port') {
      const port = Number(rest.shift());
      if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('--port needs a number between 1 and 65535');
      opts.port = port;
    } else if (arg === '--no-open') opts.open = false;
    else if (arg === '--check') opts.check = true;
    else if (arg === '--yes' || arg === '-y') opts.yes = true;
    else if (arg === '--version' || arg === '-v') opts.command = 'version';
    else if (arg === '--help' || arg === '-h') opts.command = 'help';
    else throw new Error(`Unknown option: ${arg}`);
  }
  return opts;
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    fail(`${err.message}\n\n${HELP}`);
    return 2;
  }
  switch (opts.command) {
    case 'start': return start(opts);
    case 'serve': return serve(opts);
    case 'stop': return stop();
    case 'status': return status();
    case 'doctor': return doctor(opts);
    case 'update': return update(opts);
    case 'uninstall': return uninstall(opts);
    case 'version': out(VERSION); return 0;
    case 'help': out(HELP); return 0;
    default:
      fail(`Unknown command: ${opts.command}\n\n${HELP}`);
      return 2;
  }
}

process.exitCode = await main();

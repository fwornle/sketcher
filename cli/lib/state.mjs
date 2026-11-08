// Where sketcher keeps its runtime state, and what the background server left behind.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_PORT = 5180;
export const REQUIRED_NODE = '20.19.0';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The installed package's version, read from its own package.json. */
export const VERSION = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')).version;

/** The built web app shipped inside the package. */
export const DIST_DIR = path.join(PACKAGE_ROOT, 'dist');

/** Data directory: ~/.sketcher, or $SKETCHER_HOME (tests point it at a temp dir). */
export function dataDir() {
  return process.env.SKETCHER_HOME || path.join(os.homedir(), '.sketcher');
}

export const serverFile = () => path.join(dataDir(), 'server.json');
export const logFile = () => path.join(dataDir(), 'server.log');

/** @returns {{pid: number, port: number, version: string} | null} */
export function readServerState() {
  try {
    return JSON.parse(fs.readFileSync(serverFile(), 'utf8'));
  } catch {
    return null;
  }
}

export function writeServerState(state) {
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.writeFileSync(serverFile(), JSON.stringify(state, null, 2) + '\n');
}

export function clearServerState() {
  fs.rmSync(serverFile(), { force: true });
}

export function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM: the process exists but belongs to someone else
    return err.code === 'EPERM';
  }
}

/** GET /__sketcher/health; resolves to {version} or null when nothing (or something else) answers. */
export async function checkHealth(port, timeoutMs = 1000) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/__sketcher/health`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const body = await res.json();
    return typeof body?.version === 'string' ? body : null;
  } catch {
    return null;
  }
}

// GitHub releases via the gh CLI: the latest version and its tarball.
import { spawnSync } from 'node:child_process';

export const REPO = 'fwornle/sketcher';
export const ASSET_PATTERN = 'sketcher-*.tgz';

/** Compare two x.y.z versions (a leading "v" is ignored): -1, 0 or 1. */
export function compareVersions(a, b) {
  const parse = v => String(v).trim().replace(/^v/, '').split('-')[0].split('.').map(n => parseInt(n, 10) || 0);
  const [pa, pb] = [parse(a), parse(b)];
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

/** Run a command, capturing output; never throws (status is null when the command is missing). */
export function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32', ...options });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '', error: result.error };
}

export function ghInstalled() {
  return run('gh', ['--version']).status === 0;
}

export function ghLoggedIn() {
  // Only github.com matters: a failing enterprise host would fail a plain `gh auth status`
  return run('gh', ['auth', 'status', '--hostname', 'github.com']).status === 0;
}

/** The latest release's version (without "v"), or throws with gh's message. */
export function latestReleaseVersion() {
  const res = run('gh', ['release', 'view', '--repo', REPO, '--json', 'tagName', '--jq', '.tagName']);
  if (res.status !== 0) {
    throw new Error((res.stderr || res.stdout || 'gh release view failed').trim());
  }
  return res.stdout.trim().replace(/^v/, '');
}

/** Download the latest release's tarball into dir; returns gh's exit result. */
export function downloadLatest(dir) {
  return run('gh', ['release', 'download', '--repo', REPO, '--pattern', ASSET_PATTERN, '--dir', dir, '--clobber']);
}

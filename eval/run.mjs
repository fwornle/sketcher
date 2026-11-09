#!/usr/bin/env node
// Runs the eval set through the app's real VLM adapters and scores every answer.
//
//   node eval/run.mjs                         every model that has an API key
//   node eval/run.mjs --models gemini,claude --cases house,flowchart --repeat 3
//   node eval/run.mjs --rescore eval/results/<run>   rescore saved answers, no API calls
//   node eval/run.mjs --check                 validate the cases and the scorer, no API calls
//
// Keys come from the environment or a .env at the repo root: GEMINI_API_KEY,
// ANTHROPIC_API_KEY, OPENAI_API_KEY. Answers are saved under eval/results/<run>/
// so scoring changes never cost another model call.
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, parseEnv } from 'node:util';
import { aggregate, failedMetrics, scoreCase } from './score.mjs';

const EVAL_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(EVAL_DIR);
const CASES_DIR = path.join(EVAL_DIR, 'cases');

/** Provider keys as the app names them (vlmProviders.ts) → the env var holding their API key. */
const MODEL_KEYS = {
  gemini: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
  claude: ['ANTHROPIC_API_KEY'],
  'claude-opus': ['ANTHROPIC_API_KEY'],
  gpt4o: ['OPENAI_API_KEY'],
};

const out = (s = '') => process.stdout.write(`${s}\n`);

const { values: opts } = parseArgs({
  options: {
    models: { type: 'string' },
    cases: { type: 'string' },
    repeat: { type: 'string', default: '1' },
    concurrency: { type: 'string', default: '2' },
    timeout: { type: 'string', default: '300' },
    out: { type: 'string' },
    rescore: { type: 'string' },
    check: { type: 'boolean', default: false },
    verbose: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (opts.help) {
  out(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 12).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}

function loadCases(filter) {
  const ids = filter ? new Set(filter.split(',').map((s) => s.trim())) : null;
  const cases = fs.readdirSync(CASES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(CASES_DIR, f), 'utf8')))
    .filter((c) => !ids || ids.has(c.id));
  if (ids) for (const id of ids) if (!cases.some((c) => c.id === id)) throw new Error(`Unknown case '${id}'`);
  for (const c of cases) {
    if (!fs.existsSync(path.join(CASES_DIR, c.image))) throw new Error(`Case ${c.id}: image ${c.image} missing`);
    for (const e of c.elements) {
      if (!Array.isArray(e.accept) || !e.accept.length || !Array.isArray(e.bbox) || e.bbox.length !== 4) {
        throw new Error(`Case ${c.id}: element '${e.label}' needs accept[] and bbox[x1,y1,x2,y2]`);
      }
    }
  }
  return cases.sort((a, b) => a.id.localeCompare(b.id));
}

function loadDotEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const [k, v] of Object.entries(parseEnv(fs.readFileSync(file, 'utf8')))) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

const keyFor = (model) => MODEL_KEYS[model].map((k) => process.env[k]).find(Boolean);

function git(...args) {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; }
}

const pct = (v) => (v == null ? '   -' : `${Math.round(v * 100)}%`.padStart(4));
const num = (v) => (v == null ? '  -' : v.toFixed(1).padStart(5));

function summaryTable(agg) {
  const head = '| model | score | F1 | precision | recall | right type | text | arrow dir | colour | summary | box stand-ins | failed | median s |';
  const rows = agg.map((a) => `| ${a.model} | ${num(a.score)} | ${pct(a.f1)} | ${pct(a.precision)} | ${pct(a.recall)} | ${pct(a.typedRecall)} | ${pct(a.text)} | ${pct(a.arrowDirection)} | ${pct(a.colour)} | ${pct(a.keyword)} | ${a.rectangleStandIns} | ${a.failures}/${a.runs} | ${a.medianLatencyMs == null ? '-' : (a.medianLatencyMs / 1000).toFixed(1)} |`);
  return [head, `|${'---|'.repeat(13)}`, ...rows].join('\n');
}

function caseTable(results, models, cases) {
  const cell = (model, id) => {
    const rs = results.filter((r) => r.model === model && r.case === id);
    if (!rs.length) return '-';
    const s = rs.reduce((t, r) => t + r.metrics.score, 0) / rs.length;
    return `${s.toFixed(0)}${rs.some((r) => r.error) ? '!' : ''}`;
  };
  return [`| case | ${models.join(' | ')} |`, `|${'---|'.repeat(models.length + 1)}`,
    ...cases.map((c) => `| ${c.id} | ${models.map((m) => cell(m, c.id)).join(' | ')} |`)].join('\n');
}

function problems(results) {
  const lines = [];
  for (const r of results) {
    if (r.error) { lines.push(`- **${r.model} / ${r.case}** failed: ${r.error}`); continue; }
    const bits = [];
    if (r.missed.length) bits.push(`missed ${r.missed.join(', ')}`);
    if (r.wrongType.length) bits.push(`wrong type ${r.wrongType.join(', ')}`);
    if (r.extra.length) bits.push(`${r.extra.length} extra (${[...new Set(r.extra)].join(', ')})`);
    const er = r.metrics.extentRatio;
    if (er && (Math.abs(er.x - 1) > 0.35 || Math.abs(er.y - 1) > 0.35)) bits.push(`answer spans ${er.x.toFixed(2)}×/${er.y.toFixed(2)}× the drawing: another coordinate space?`);
    if (bits.length) lines.push(`- **${r.model} / ${r.case}${r.repeat ? ` #${r.repeat + 1}` : ''}** (${r.metrics.score.toFixed(0)}): ${bits.join('; ')}`);
  }
  return lines.join('\n');
}

function report(runDir, meta, results, cases) {
  const agg = aggregate(results);
  const models = agg.map((a) => a.model);
  const md = [
    `# Sketcher eval: ${meta.startedAt}`,
    '',
    `Commit \`${meta.commit ?? 'unknown'}\`${meta.dirty ? ' (uncommitted changes)' : ''} · prompt \`${meta.promptSha}\` · ${cases.length} cases × ${meta.repeat} run(s)`,
    '',
    summaryTable(agg),
    '',
    'Score is 0-100: F1 40%, elements found with the right type 30%, text 10%, arrow direction 10%, colour 5%, summary keyword 5%; parts a case does not test drop out. A failed call scores 0.',
    '',
    '## Score per case',
    '',
    caseTable(results, models, cases),
    '',
    '`!` marks a case with a failed call.',
    '',
    '## What went wrong',
    '',
    problems(results) || 'Nothing: every element found with the right type.',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(runDir, 'report.md'), md);
  fs.writeFileSync(path.join(runDir, 'scores.json'), `${JSON.stringify({ meta, aggregate: agg, results }, null, 2)}\n`);
  out(summaryTable(agg));
  out();
  out(caseTable(results, models, cases));
  out();
  out(`Report: ${path.relative(process.cwd(), path.join(runDir, 'report.md'))}`);
}

function scoreSaved(saved, caseById) {
  const expected = caseById.get(saved.case);
  if (!expected) return null;
  if (saved.error) return { ...saved, metrics: failedMetrics(), missed: [], extra: [], wrongType: [] };
  const { response, ...rest } = saved;
  return { ...rest, ...scoreCase(expected, response) };
}

/** Rescore a finished run with the current cases and scorer. */
function rescore(runDir) {
  const meta = JSON.parse(fs.readFileSync(path.join(runDir, 'meta.json'), 'utf8'));
  const cases = loadCases();
  const caseById = new Map(cases.map((c) => [c.id, c]));
  const respDir = path.join(runDir, 'responses');
  const results = fs.readdirSync(respDir).flatMap((model) => fs.readdirSync(path.join(respDir, model))
    .map((f) => scoreSaved(JSON.parse(fs.readFileSync(path.join(respDir, model, f), 'utf8')), caseById))
    .filter(Boolean));
  const scored = cases.filter((c) => results.some((r) => r.case === c.id));
  report(runDir, meta, results, scored);
}

/** No API calls: the ground truth must score 100 and a boxes-only answer must not. */
function check() {
  const cases = loadCases(opts.cases);
  let ok = true;
  for (const c of cases) {
    const perfect = {
      analysis_summary: { composition_interpretation: c.keywords.join(' ') },
      elements: c.elements.map((e) => ({
        type: e.accept[0],
        bounding_box: { x1: e.bbox[0], y1: e.bbox[1], x2: e.bbox[2], y2: e.bbox[3] },
        points: e.points?.map(([x, y]) => ({ x, y })) ?? null,
        text_content: e.text ?? null,
        style_info: { color: e.color ?? 'black' },
      })),
    };
    const boxes = { ...perfect, elements: perfect.elements.map((e) => ({ ...e, type: 'rectangle', points: null })) };
    const p = scoreCase(c, perfect).metrics.score, b = scoreCase(c, boxes).metrics.score;
    const pass = Math.abs(p - 100) < 1e-9 && b < p;
    ok &&= pass;
    out(`${pass ? 'ok  ' : 'FAIL'} ${c.id.padEnd(20)} ${String(c.elements.length).padStart(3)} elements · ground truth ${p.toFixed(0)} · boxes only ${b.toFixed(0)}`);
  }
  process.exit(ok ? 0 : 1);
}

async function withTimeout(promise, seconds) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`timed out after ${seconds}s`)), seconds * 1000); });
  try { return await Promise.race([promise, timeout]); } finally { clearTimeout(timer); }
}

async function run() {
  loadDotEnv();
  const cases = loadCases(opts.cases);
  const requested = opts.models ? opts.models.split(',').map((s) => s.trim()) : Object.keys(MODEL_KEYS).filter(keyFor);
  for (const m of requested) {
    if (!MODEL_KEYS[m]) throw new Error(`Unknown model '${m}'. Known: ${Object.keys(MODEL_KEYS).join(', ')}`);
    if (!keyFor(m)) throw new Error(`No API key for ${m}: set ${MODEL_KEYS[m].join(' or ')}`);
  }
  if (!requested.length) {
    throw new Error(`No API keys found. Set any of ${[...new Set(Object.values(MODEL_KEYS).flat())].join(', ')} (environment or .env).`);
  }
  const repeat = Math.max(1, Number(opts.repeat) || 1);
  const concurrency = Math.max(1, Number(opts.concurrency) || 1);

  const { loadVlmService } = await import('./lib/load-app.mjs');
  const vlm = await loadVlmService();
  // The adapters log every request and response; keep the eval output readable.
  if (!opts.verbose) for (const k of ['log', 'info', 'debug', 'warn', 'error']) console[k] = () => {};

  const startedAt = new Date().toISOString();
  const runDir = path.resolve(opts.out ?? path.join(EVAL_DIR, 'results', startedAt.replace(/[:.]/g, '-')));
  const meta = {
    startedAt,
    commit: git('rev-parse', '--short', 'HEAD'),
    dirty: Boolean(git('status', '--porcelain', '--', 'app/src')),
    promptSha: crypto.createHash('sha256').update(vlm.getGeminiPrompt()).digest('hex').slice(0, 12),
    models: requested,
    cases: cases.map((c) => c.id),
    repeat,
  };
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
  out(`${requested.length} model(s) × ${cases.length} cases × ${repeat} → ${path.relative(process.cwd(), runDir)}`);

  const caseById = new Map(cases.map((c) => [c.id, c]));
  const results = [];
  await Promise.all(requested.map(async (model) => {
    const jobs = cases.flatMap((c) => Array.from({ length: repeat }, (_, r) => ({ c, r })));
    const dir = path.join(runDir, 'responses', model);
    fs.mkdirSync(dir, { recursive: true });
    const worker = async () => {
      for (let job = jobs.shift(); job; job = jobs.shift()) {
        const { c, r } = job;
        const dataUrl = `data:image/png;base64,${fs.readFileSync(path.join(CASES_DIR, c.image)).toString('base64')}`;
        vlm.GEMINI_CACHE.clear(); // repeats must reach the model, not the adapter's cache
        const t0 = Date.now();
        const saved = { model, case: c.id, repeat: r };
        try {
          saved.response = await withTimeout(vlm.getVlmAdapter(model, keyFor(model)).analyzeImage(dataUrl, keyFor(model)), Number(opts.timeout));
        } catch (err) {
          saved.error = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
        }
        saved.latencyMs = Date.now() - t0;
        fs.writeFileSync(path.join(dir, `${c.id}.r${r}.json`), `${JSON.stringify(saved, null, 2)}\n`);
        const scored = scoreSaved(saved, caseById);
        results.push(scored);
        out(`${model.padEnd(12)} ${c.id.padEnd(20)}${repeat > 1 ? ` #${r + 1}` : ''} ${saved.error ? `FAILED ${saved.error}` : `${scored.metrics.score.toFixed(0).padStart(3)}  (${(saved.latencyMs / 1000).toFixed(1)}s)`}`);
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
  }));
  out();
  report(runDir, meta, results, cases);
}

try {
  if (opts.check) check();
  else if (opts.rescore) rescore(path.resolve(opts.rescore));
  else await run();
} catch (err) {
  process.stderr.write(`eval: ${err.message}\n`);
  process.exit(1);
}

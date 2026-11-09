// Scores one model answer (the app's VLMServiceResponse) against a case's ground
// truth. Pure functions only, so the scoring rules are unit-tested and a saved run
// can be rescored without calling any model.

/** IoU threshold for a predicted element to count as finding an expected one. */
export const MATCH_IOU = 0.3;

/** Weights of the composite score; components that do not apply to a case drop out. */
export const WEIGHTS = { f1: 0.4, typedRecall: 0.3, text: 0.1, arrowDirection: 0.1, colour: 0.05, keyword: 0.05 };

const RECTANGULAR = new Set(['rectangle', 'square']);

/** Boxes are padded before IoU so thin strokes (lines, arrows) can overlap at all. */
export function padFor(width, height) {
  return Math.max(6, 0.015 * Math.hypot(width, height));
}

export function toBox(bb) {
  if (Array.isArray(bb)) return bb;
  const x1 = Number(bb?.x1), y1 = Number(bb?.y1), x2 = Number(bb?.x2), y2 = Number(bb?.y2);
  if (![x1, y1, x2, y2].every(Number.isFinite)) return null;
  return [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)];
}

export function iou(a, b, pad = 0) {
  const [ax1, ay1, ax2, ay2] = [a[0] - pad, a[1] - pad, a[2] + pad, a[3] + pad];
  const [bx1, by1, bx2, by2] = [b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad];
  const iw = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
  const ih = Math.max(0, Math.min(ay2, by2) - Math.max(ay1, by1));
  const inter = iw * ih;
  const union = (ax2 - ax1) * (ay2 - ay1) + (bx2 - bx1) * (by2 - by1) - inter;
  return union > 0 ? inter / union : 0;
}

export function normaliseText(s) {
  return String(s ?? '').toUpperCase().replace(/[^A-Z0-9?!]/g, '');
}

const NAMED_COLOURS = {
  black: '#000000', white: '#ffffff', gray: '#808080', grey: '#808080', darkgray: '#a9a9a9', darkgrey: '#a9a9a9',
  dimgray: '#696969', silver: '#c0c0c0', red: '#ff0000', darkred: '#8b0000', crimson: '#dc143c', firebrick: '#b22222',
  maroon: '#800000', orange: '#ffa500', darkorange: '#ff8c00', orangered: '#ff4500', yellow: '#ffff00', gold: '#ffd700',
  green: '#008000', darkgreen: '#006400', forestgreen: '#228b22', lime: '#00ff00', limegreen: '#32cd32', seagreen: '#2e8b57',
  olive: '#808000', teal: '#008080', cyan: '#00ffff', aqua: '#00ffff', blue: '#0000ff', darkblue: '#00008b', navy: '#000080',
  royalblue: '#4169e1', mediumblue: '#0000cd', dodgerblue: '#1e90ff', steelblue: '#4682b4', skyblue: '#87ceeb',
  purple: '#800080', violet: '#ee82ee', indigo: '#4b0082', darkviolet: '#9400d3', blueviolet: '#8a2be2', magenta: '#ff00ff',
  fuchsia: '#ff00ff', pink: '#ffc0cb', hotpink: '#ff69b4', brown: '#a52a2a', saddlebrown: '#8b4513', chocolate: '#d2691e',
};

/** CSS colour (hex, rgb() or a common name) → [r, g, b], or null when unknown. */
export function parseColour(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase().replace(/\s+/g, '');
  const hex = NAMED_COLOURS[v] ?? v;
  let m = /^#([0-9a-f]{6})$/.exec(hex);
  if (m) { const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  m = /^#([0-9a-f]{3})$/.exec(hex);
  if (m) return [...m[1]].map((c) => parseInt(c + c, 16));
  m = /^rgba?\((\d+),(\d+),(\d+)/.exec(v);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return null;
}

/** Coarse colour family, so "#e02020" and "red" agree but red and orange do not. */
export function colourFamily(rgb) {
  if (!rgb) return null;
  const [r, g, b] = rgb.map((c) => c / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (sat < 0.25 || d < 0.12) return l < 0.35 ? 'black' : l > 0.85 ? 'white' : 'gray';
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h < 15 || h >= 330) return 'red';
  if (h < 45) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 170) return 'green';
  if (h < 200) return 'cyan';
  if (h < 260) return 'blue';
  return 'purple';
}

function arrowHeadRight(exp, pred) {
  const pts = Array.isArray(pred.points) ? pred.points.filter((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y)) : [];
  if (!exp.points || pts.length < 2) return false;
  const head = pts[pts.length - 1];
  const [tail, expHead] = [exp.points[0], exp.points[exp.points.length - 1]];
  return Math.hypot(head.x - expHead[0], head.y - expHead[1]) < Math.hypot(head.x - tail[0], head.y - tail[1]);
}

/**
 * Matches predicted to expected elements greedily by padded-box IoU (a small bonus
 * for the right type and the right text breaks ties), then derives the metrics.
 */
export function scoreCase(expected, response) {
  const pad = padFor(expected.width, expected.height);
  const exp = expected.elements.map((e, i) => ({ ...e, i, box: toBox(e.bbox) }));
  const preds = (Array.isArray(response?.elements) ? response.elements : [])
    .map((p, j) => ({ ...p, j, box: toBox(p.bounding_box) }))
    .filter((p) => p.box);

  const pairs = [];
  for (const e of exp) {
    for (const p of preds) {
      const overlap = iou(e.box, p.box, pad);
      if (overlap < MATCH_IOU) continue;
      const typeOk = e.accept.includes(p.type);
      const textOk = e.type === 'text' && normaliseText(p.text_content) === normaliseText(e.text);
      pairs.push({ e, p, overlap, typeOk, rank: overlap + (typeOk ? 0.15 : 0) + (textOk ? 0.15 : 0) });
    }
  }
  pairs.sort((a, b) => b.rank - a.rank);
  const usedE = new Set(), usedP = new Set(), matches = [];
  for (const pair of pairs) {
    if (usedE.has(pair.e.i) || usedP.has(pair.p.j)) continue;
    usedE.add(pair.e.i);
    usedP.add(pair.p.j);
    matches.push(pair);
  }

  const nE = exp.length, nP = preds.length, nM = matches.length;
  const precision = nP ? nM / nP : 0;
  const recall = nE ? nM / nE : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  const typedMatches = matches.filter((m) => m.typeOk);
  const ratio = (hit, total) => (total ? hit / total : null);

  const texts = exp.filter((e) => e.type === 'text');
  const textHits = matches.filter((m) => m.e.type === 'text' && normaliseText(m.p.text_content) === normaliseText(m.e.text));
  const arrows = exp.filter((e) => e.type === 'arrow');
  const arrowHits = matches.filter((m) => m.e.type === 'arrow' && m.p.type === 'arrow' && arrowHeadRight(m.e, m.p));
  const coloured = exp.filter((e) => e.color);
  const colourHits = matches.filter((m) => m.e.color
    && colourFamily(parseColour(m.e.color)) === colourFamily(parseColour(m.p.style_info?.color)));
  const summary = String(response?.analysis_summary?.composition_interpretation ?? '').toLowerCase();
  const keyword = expected.keywords?.length ? (expected.keywords.some((k) => summary.includes(k.toLowerCase())) ? 1 : 0) : null;

  const metrics = {
    expected: nE,
    predicted: nP,
    matched: nM,
    precision,
    recall,
    f1,
    typedRecall: ratio(typedMatches.length, nE),
    typeAccuracy: ratio(typedMatches.length, nM),
    meanIou: nM ? matches.reduce((s, m) => s + iou(m.e.box, m.p.box, pad), 0) / nM : 0,
    text: ratio(textHits.length, texts.length),
    arrowDirection: ratio(arrowHits.length, arrows.length),
    colour: ratio(colourHits.length, coloured.length),
    keyword,
    // The failure pictogram support was built for: a box standing in for a shape that is not one.
    rectangleStandIns: matches.filter((m) => RECTANGULAR.has(m.p.type) && !RECTANGULAR.has(m.e.type) && m.e.type !== 'text').length,
    extentRatio: extentRatio(exp, preds),
  };
  metrics.score = composite(metrics);

  return {
    metrics,
    missed: exp.filter((e) => !usedE.has(e.i)).map((e) => e.label),
    extra: preds.filter((p) => !usedP.has(p.j)).map((p) => p.type),
    wrongType: matches.filter((m) => !m.typeOk).map((m) => `${m.e.label}: ${m.p.type}`),
  };
}

/** Weighted mean of the applicable components, 0-100. */
export function composite(m) {
  let sum = 0, weight = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) {
    if (m[k] == null) continue;
    sum += w * m[k];
    weight += w;
  }
  return weight ? (100 * sum) / weight : 0;
}

/**
 * Size of the answer's overall extent relative to the drawing's. Far from 1 means
 * the model answered in another coordinate space (0-1000 normalised, a resized
 * image), which drags every IoU to zero and deserves a look before blaming the prompt.
 */
function extentRatio(exp, preds) {
  if (!exp.length || !preds.length) return null;
  const span = (items) => {
    const xs = items.flatMap((e) => [e.box[0], e.box[2]]), ys = items.flatMap((e) => [e.box[1], e.box[3]]);
    return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  };
  const [ew, eh] = span(exp), [pw, ph] = span(preds);
  return { x: ew ? pw / ew : null, y: eh ? ph / eh : null };
}

/** Failed calls score 0 so a model cannot win by erroring on hard cases. */
export function failedMetrics() {
  return { score: 0, f1: 0, precision: 0, recall: 0, typedRecall: 0, rectangleStandIns: 0 };
}

/** Per-model means across all scored runs. */
export function aggregate(runs) {
  const byModel = new Map();
  for (const r of runs) {
    if (!byModel.has(r.model)) byModel.set(r.model, []);
    byModel.get(r.model).push(r);
  }
  const mean = (xs) => {
    const v = xs.filter((x) => x != null && Number.isFinite(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const median = (xs) => {
    const v = xs.filter(Number.isFinite).sort((a, b) => a - b);
    return v.length ? v[Math.floor(v.length / 2)] : null;
  };
  return [...byModel.entries()].map(([model, rs]) => {
    const ms = rs.map((r) => r.metrics);
    return {
      model,
      runs: rs.length,
      failures: rs.filter((r) => r.error).length,
      score: mean(ms.map((m) => m.score)),
      f1: mean(ms.map((m) => m.f1)),
      precision: mean(ms.map((m) => m.precision)),
      recall: mean(ms.map((m) => m.recall)),
      typedRecall: mean(ms.map((m) => m.typedRecall)),
      text: mean(ms.map((m) => m.text)),
      arrowDirection: mean(ms.map((m) => m.arrowDirection)),
      colour: mean(ms.map((m) => m.colour)),
      keyword: mean(ms.map((m) => m.keyword)),
      rectangleStandIns: ms.reduce((s, m) => s + (m.rectangleStandIns || 0), 0),
      medianLatencyMs: median(rs.map((r) => r.latencyMs)),
    };
  }).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

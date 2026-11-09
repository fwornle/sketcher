import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aggregate, colourFamily, composite, iou, normaliseText, parseColour, scoreCase } from '../score.mjs';

const expected = {
  width: 960,
  height: 640,
  keywords: ['tree'],
  elements: [
    { label: 'tier', type: 'triangle', accept: ['triangle', 'polygon'], bbox: [100, 100, 200, 200] },
    { label: 'trunk', type: 'rectangle', accept: ['rectangle', 'square'], bbox: [140, 200, 160, 240] },
    { label: 'sign', type: 'text', accept: ['text'], bbox: [400, 100, 500, 130], text: 'GO' },
    { label: 'arrow', type: 'arrow', accept: ['arrow'], bbox: [600, 300, 800, 320], points: [[600, 310], [800, 310]] },
  ],
};

const el = (type, [x1, y1, x2, y2], extra = {}) => ({ type, bounding_box: { x1, y1, x2, y2 }, points: null, text_content: null, ...extra });

test('a perfect answer scores 100', () => {
  const { metrics, missed, extra } = scoreCase(expected, {
    analysis_summary: { composition_interpretation: 'A small tree' },
    elements: [
      el('triangle', [100, 100, 200, 200]),
      el('rectangle', [140, 200, 160, 240]),
      el('text', [400, 100, 500, 130], { text_content: 'go' }),
      el('arrow', [600, 300, 800, 320], { points: [{ x: 600, y: 310 }, { x: 800, y: 310 }] }),
    ],
  });
  assert.equal(metrics.score, 100);
  assert.deepEqual([missed, extra], [[], []]);
});

test('a rectangle in place of a triangle is found but has the wrong type', () => {
  const { metrics, wrongType } = scoreCase(expected, { elements: [el('rectangle', [100, 100, 200, 200])] });
  assert.equal(metrics.matched, 1);
  assert.equal(metrics.typedRecall, 0);
  assert.equal(metrics.rectangleStandIns, 1);
  assert.deepEqual(wrongType, ['tier: rectangle']);
});

test('a polygon is an accepted answer for a triangle', () => {
  const { metrics } = scoreCase(expected, { elements: [el('polygon', [102, 98, 199, 203])] });
  assert.equal(metrics.typeAccuracy, 1);
  assert.equal(metrics.rectangleStandIns, 0);
});

test('a reversed arrow is matched but loses the direction point', () => {
  const { metrics } = scoreCase(expected, {
    elements: [el('arrow', [600, 300, 800, 320], { points: [{ x: 800, y: 310 }, { x: 600, y: 310 }] })],
  });
  assert.equal(metrics.matched, 1);
  assert.equal(metrics.arrowDirection, 0);
});

test('far-away boxes do not match, and extras lower precision', () => {
  const { metrics, extra } = scoreCase(expected, {
    elements: [el('triangle', [100, 100, 200, 200]), el('circle', [850, 500, 900, 550])],
  });
  assert.equal(metrics.matched, 1);
  assert.equal(metrics.precision, 0.5);
  assert.deepEqual(extra, ['circle']);
});

test('answers in 0-1000 normalised coordinates show up in the extent ratio', () => {
  const scale = (v, d) => Math.round((v / d) * 1000);
  const { metrics } = scoreCase(expected, {
    elements: expected.elements.map((e) => el(e.accept[0], [scale(e.bbox[0], 960), scale(e.bbox[1], 640), scale(e.bbox[2], 960), scale(e.bbox[3], 640)])),
  });
  assert.ok(metrics.extentRatio.y > 1.4);
});

test('a missing or empty answer scores 0 without throwing', () => {
  assert.equal(scoreCase(expected, null).metrics.score, 0);
  assert.equal(scoreCase(expected, { elements: [{ type: 'circle' }] }).metrics.predicted, 0);
});

test('helpers', () => {
  assert.equal(iou([0, 0, 10, 10], [0, 0, 10, 10]), 1);
  assert.equal(iou([0, 0, 10, 0], [0, 0, 10, 0]), 0);
  assert.ok(iou([0, 0, 10, 0], [0, 0, 10, 0], 5) > 0.9);
  assert.equal(normaliseText(' Ok? '), 'OK?');
  assert.equal(colourFamily(parseColour('#d62828')), 'red');
  assert.equal(colourFamily(parseColour('crimson')), 'red');
  assert.equal(colourFamily(parseColour('#ef7d00')), 'orange');
  assert.equal(colourFamily(parseColour('rgb(29, 78, 216)')), 'blue');
  assert.equal(colourFamily(parseColour('#7b2cbf')), 'purple');
  assert.equal(colourFamily(parseColour('#1d1d1f')), 'black');
  assert.equal(parseColour('chartreuse-ish'), null);
  assert.equal(composite({ f1: 1, typedRecall: 1, text: null, arrowDirection: null, colour: null, keyword: null }), 100);
});

test('aggregate ranks models and counts failures', () => {
  const agg = aggregate([
    { model: 'a', metrics: { score: 50, f1: 0.5 }, latencyMs: 10 },
    { model: 'a', metrics: { score: 0 }, error: 'boom', latencyMs: 30 },
    { model: 'b', metrics: { score: 80, f1: 0.8 }, latencyMs: 20 },
  ]);
  assert.deepEqual(agg.map((a) => [a.model, a.score, a.failures]), [['b', 80, 0], ['a', 25, 1]]);
});

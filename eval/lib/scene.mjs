// A sketch under construction: every builder draws its strokes on the canvas AND
// records the element a perfect answer would contain, so the picture and its
// ground truth can never drift apart.
import { Canvas, handDrawn, rng, smoothCurve } from './raster.mjs';
import { layoutText, textWidth } from './strokefont.mjs';

/** Types a model may answer with for each expected type and still be right. */
export const ACCEPTED_TYPES = {
  rectangle: ['rectangle', 'square'],
  square: ['square', 'rectangle'],
  circle: ['circle', 'ellipse'],
  ellipse: ['ellipse', 'circle'],
  // A polygon through the same corners renders identically, so it is not a miss.
  triangle: ['triangle', 'polygon'],
  rhombus: ['rhombus', 'polygon'],
  parallelogram: ['parallelogram', 'polygon'],
  trapezoid: ['trapezoid', 'polygon'],
  polygon: ['polygon', 'polyline'],
  polyline: ['polyline'],
  line_segment: ['line_segment', 'polyline', 'arrow'],
  arrow: ['arrow'],
  text: ['text'],
};

const round = (v) => Math.round(v);
const bboxOf = (pts) => [
  Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])),
  Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1])),
];

export class Scene {
  constructor({ id, title, width = 960, height = 640, seed = 1, keywords = [], pen = 3.5, notes = '' }) {
    Object.assign(this, { id, title, width, height, keywords, pen, notes });
    this.canvas = new Canvas(width, height);
    this.random = rng(seed);
    this.elements = [];
  }

  #add(type, bbox, extra = {}) {
    this.elements.push({
      label: extra.label ?? type,
      type,
      accept: ACCEPTED_TYPES[type],
      bbox: bbox.map(round),
      ...(extra.text != null && { text: extra.text }),
      ...(extra.color && { color: extra.color }),
      ...(extra.points && { points: extra.points.map((p) => p.map(round)) }),
    });
  }

  #ink(points, { closed = false, color, amp, overshoot } = {}) {
    this.canvas.stroke(handDrawn(points, this.random, { closed, amp, overshoot }), { width: this.pen, color });
  }

  polygonShape(type, points, opts = {}) {
    this.#ink(points, { closed: true, color: opts.color });
    this.#add(type, bboxOf(points), opts);
  }

  rect(x1, y1, x2, y2, opts = {}) {
    const type = opts.type ?? (Math.abs((x2 - x1) - (y2 - y1)) < 0.08 * Math.max(x2 - x1, y2 - y1) ? 'square' : 'rectangle');
    this.polygonShape(type, [[x1, y1], [x2, y1], [x2, y2], [x1, y2]], opts);
  }

  /** Isosceles triangle pointing up, apex centred over the base. */
  triangle(cx, top, base, height, opts = {}) {
    this.polygonShape('triangle', [[cx, top], [cx + base / 2, top + height], [cx - base / 2, top + height]], opts);
  }

  rhombus(cx, cy, w, h, opts = {}) {
    this.polygonShape('rhombus', [[cx, cy - h / 2], [cx + w / 2, cy], [cx, cy + h / 2], [cx - w / 2, cy]], opts);
  }

  parallelogram(x1, y1, x2, y2, slant, opts = {}) {
    this.polygonShape('parallelogram', [[x1 + slant, y1], [x2, y1], [x2 - slant, y2], [x1, y2]], opts);
  }

  trapezoid(x1, y1, x2, y2, inset, opts = {}) {
    this.polygonShape('trapezoid', [[x1 + inset, y1], [x2 - inset, y1], [x2, y2], [x1, y2]], opts);
  }

  polygon(points, opts = {}) {
    this.polygonShape('polygon', points, opts);
  }

  ellipse(cx, cy, rx, ry, opts = {}) {
    const n = 72, start = this.random() * Math.PI * 2, p = this.random() * 6.28;
    const pts = [];
    for (let k = 0; k <= n + 5; k++) {
      const a = start + (k / n) * Math.PI * 2;
      const wob = 1 + 0.025 * Math.sin(2 * a + p);
      pts.push([cx + rx * wob * Math.cos(a), cy + ry * wob * Math.sin(a)]);
    }
    this.canvas.stroke(pts, { width: this.pen, color: opts.color });
    const type = opts.type ?? (Math.abs(rx - ry) < 0.1 * Math.max(rx, ry) ? 'circle' : 'ellipse');
    this.#add(type, [cx - rx, cy - ry, cx + rx, cy + ry], opts);
  }

  circle(cx, cy, r, opts = {}) {
    this.ellipse(cx, cy, r, r, { ...opts, type: 'circle' });
  }

  line(a, b, opts = {}) {
    this.#ink([a, b], { color: opts.color, amp: 1.2 });
    this.#add('line_segment', bboxOf([a, b]), { ...opts, points: [a, b] });
  }

  /** Straight arrow from `tail` to `head` with a two-stroke head. */
  arrow(tail, head, opts = {}) {
    this.#ink([tail, head], { color: opts.color, amp: 1.2 });
    const ang = Math.atan2(head[1] - tail[1], head[0] - tail[0]);
    const len = opts.headLength ?? 18;
    const wings = [-0.5, 0.5].map((d) => [head[0] - len * Math.cos(ang + d), head[1] - len * Math.sin(ang + d)]);
    for (const w of wings) this.#ink([w, head], { color: opts.color, amp: 0.5 });
    this.#add('arrow', bboxOf([tail, head, ...wings]), { ...opts, points: [tail, head] });
  }

  /** Smooth open stroke through control points. */
  curve(controls, opts = {}) {
    const pts = smoothCurve(controls);
    this.#ink(pts, { color: opts.color, amp: 1.0 });
    this.#add('polyline', bboxOf(pts), opts);
  }

  /** Hand-printed text with its top-left corner at (x, y). */
  text(str, x, y, size = 28, opts = {}) {
    const { strokes, bbox } = layoutText(str, x, y, size);
    const pen = this.pen;
    this.pen = Math.max(2.5, pen - 0.5);
    for (const s of strokes) this.#ink(s, { color: opts.color, amp: 0.6, overshoot: 0.15 });
    this.pen = pen;
    this.#add('text', bbox, { ...opts, text: str });
  }

  /** Text centred on (cx, cy). */
  centredText(str, cx, cy, size = 28, opts = {}) {
    this.text(str, cx - textWidth(str, size) / 2, cy - size / 2, size, opts);
  }

  /** The ground truth, as written next to the PNG. */
  expected() {
    return {
      id: this.id,
      title: this.title,
      image: `${this.id}.png`,
      width: this.width,
      height: this.height,
      keywords: this.keywords,
      ...(this.notes && { notes: this.notes }),
      elements: this.elements,
    };
  }
}

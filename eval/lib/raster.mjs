// A tiny anti-aliased stroke rasteriser with a PNG encoder, so the eval sketches
// can be regenerated anywhere Node runs: no canvas, no native modules, no fonts.
import zlib from 'node:zlib';

/** Deterministic PRNG (mulberry32), so a case renders the same pixels every time. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** '#rrggbb' → [r, g, b]. */
export function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export class Canvas {
  constructor(width, height, paper = '#fbfaf6') {
    this.width = width;
    this.height = height;
    this.rgb = new Uint8Array(width * height * 3);
    const [r, g, b] = hexToRgb(paper);
    for (let i = 0; i < width * height; i++) {
      this.rgb[i * 3] = r;
      this.rgb[i * 3 + 1] = g;
      this.rgb[i * 3 + 2] = b;
    }
    // Per-stroke coverage, so the joints of one stroke do not darken twice.
    this.cov = new Float32Array(width * height);
  }

  /** Draws an open polyline of [x, y] points as one pen stroke. */
  stroke(points, { width = 3.5, color = '#1d1d1f' } = {}) {
    if (points.length < 2) return;
    const r = width / 2;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1];
      const [bx, by] = points[i];
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - r - 1));
      const x1 = Math.min(this.width - 1, Math.ceil(Math.max(ax, bx) + r + 1));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by) - r - 1));
      const y1 = Math.min(this.height - 1, Math.ceil(Math.max(ay, by) + r + 1));
      minX = Math.min(minX, x0); maxX = Math.max(maxX, x1);
      minY = Math.min(minY, y0); maxY = Math.max(maxY, y1);
      const dx = bx - ax, dy = by - ay;
      const len2 = dx * dx + dy * dy || 1e-9;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5;
          const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
          const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
          const c = Math.max(0, Math.min(1, r + 0.5 - d));
          const i = y * this.width + x;
          if (c > this.cov[i]) this.cov[i] = c;
        }
      }
    }
    if (minX > maxX) return;
    const [cr, cg, cb] = hexToRgb(color);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const i = y * this.width + x;
        const a = this.cov[i];
        if (a === 0) continue;
        const j = i * 3;
        this.rgb[j] = Math.round(cr * a + this.rgb[j] * (1 - a));
        this.rgb[j + 1] = Math.round(cg * a + this.rgb[j + 1] * (1 - a));
        this.rgb[j + 2] = Math.round(cb * a + this.rgb[j + 2] * (1 - a));
        this.cov[i] = 0;
      }
    }
  }

  /** Encodes the canvas as an RGB PNG. */
  toPng() {
    const { width, height } = this;
    const raw = Buffer.alloc((width * 3 + 1) * height);
    for (let y = 0; y < height; y++) {
      raw[y * (width * 3 + 1)] = 0; // filter: none
      Buffer.from(this.rgb.buffer, y * width * 3, width * 3).copy(raw, y * (width * 3 + 1) + 1);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 2; // colour type: RGB
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]);
  }
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/**
 * Turns an ideal polyline into a hand-drawn one: resampled every few pixels, pushed
 * sideways by smooth low-frequency wobble, with a small overshoot at the ends. A
 * closed outline overlaps its start the way a pen closing a shape does.
 */
export function handDrawn(points, random, { closed = false, amp = 1.6, overshoot = 1 } = {}) {
  const ideal = closed ? [...points, points[0]] : points;
  const out = [];
  const f1 = 40 + random() * 30, f2 = 14 + random() * 10;
  const p1 = random() * 6.28, p2 = random() * 6.28;
  let s = 0;
  const wobble = (len) => amp * (0.6 * Math.sin(len / f1 + p1) + 0.4 * Math.sin(len / f2 + p2));
  for (let i = 1; i < ideal.length; i++) {
    const [ax, ay] = ideal[i - 1];
    const [bx, by] = ideal[i];
    const len = Math.hypot(bx - ax, by - ay);
    if (len === 0) continue;
    const ux = (bx - ax) / len, uy = (by - ay) / len;
    const steps = Math.max(1, Math.ceil(len / 5));
    for (let k = i === 1 ? 0 : 1; k <= steps; k++) {
      const t = k / steps;
      const w = wobble(s + t * len);
      out.push([ax + t * (bx - ax) - uy * w, ay + t * (by - ay) + ux * w]);
    }
    s += len;
  }
  if (out.length < 2) return out;
  // Overshoot past the ends (open strokes) or into the first segment (closed ones).
  const extend = (from, to, by) => {
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
    return [to[0] + ((to[0] - from[0]) / len) * by, to[1] + ((to[1] - from[1]) / len) * by];
  };
  if (closed) {
    const n = Math.min(out.length - 1, 2 + Math.floor(random() * 2));
    for (let k = 1; k <= n; k++) out.push(out[k]);
  } else {
    out.unshift(extend(out[1], out[0], random() * 3 * overshoot));
    out.push(extend(out[out.length - 2], out[out.length - 1], random() * 4 * overshoot));
  }
  return out;
}

/** Samples a smooth Catmull-Rom curve through control points (for roads, rivers). */
export function smoothCurve(controls, perSegment = 16) {
  const pts = [];
  const c = [controls[0], ...controls, controls[controls.length - 1]];
  for (let i = 1; i < c.length - 2; i++) {
    const [p0, p1, p2, p3] = [c[i - 1], c[i], c[i + 1], c[i + 2]];
    for (let k = 0; k < perSegment; k++) {
      const t = k / perSegment, t2 = t * t, t3 = t2 * t;
      pts.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t
        + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  pts.push(controls[controls.length - 1]);
  return pts;
}

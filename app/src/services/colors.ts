/**
 * Turns the colour a VLM reports ("black", "dark maroon", "#a33", "rgb(0, 0, 255)") into a
 * #rrggbb value drawio understands. drawio silently draws nothing for a colour it cannot
 * read, so an unrecognised description returns undefined and the shape keeps drawio's
 * default (black) instead of disappearing.
 */

const NAMED_COLORS: Record<string, string> = {
  black: '#000000', white: '#ffffff', gray: '#808080', grey: '#808080', silver: '#c0c0c0',
  red: '#ff0000', maroon: '#800000', crimson: '#dc143c', burgundy: '#800020',
  pink: '#ffc0cb', magenta: '#ff00ff', fuchsia: '#ff00ff', purple: '#800080', violet: '#ee82ee',
  indigo: '#4b0082', lavender: '#e6e6fa', blue: '#0000ff', navy: '#000080', azure: '#007fff',
  cyan: '#00ffff', aqua: '#00ffff', teal: '#008080', turquoise: '#40e0d0',
  green: '#008000', lime: '#00ff00', olive: '#808000',
  yellow: '#ffff00', gold: '#ffd700', orange: '#ffa500', coral: '#ff7f50', salmon: '#fa8072',
  brown: '#a52a2a', tan: '#d2b48c', beige: '#f5f5dc', khaki: '#f0e68c',
};

/** Words that shift a named colour towards black (negative) or white (positive). */
const SHADE_MODIFIERS: Record<string, number> = {
  dark: -0.35, deep: -0.35, dim: -0.25,
  light: 0.4, pale: 0.5, bright: 0.15, pastel: 0.5,
};

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
}

function shade(hex: string, amount: number): string {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const target = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  return toHex(r + (target - r) * t, g + (target - g) * t, b + (target - b) * t);
}

export function toHexColor(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v);
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map(c => c + c).join('') : hex[1];
    return `#${digits}`;
  }

  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/.exec(v);
  if (rgb) return toHex(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]));

  // Free text: "dark maroon", "dark-red", "light grey". Use the last word that names a
  // colour, shaded by any modifier before it; a compact CSS name like "darkred" splits too.
  const words = v.replace(/[^a-z]+/g, ' ').trim().split(' ')
    .flatMap(w => {
      const prefix = Object.keys(SHADE_MODIFIERS).find(m => w.startsWith(m) && NAMED_COLORS[w.slice(m.length)]);
      return prefix ? [prefix, w.slice(prefix.length)] : [w];
    });
  const baseIndex = words.map(w => w in NAMED_COLORS).lastIndexOf(true);
  if (baseIndex < 0) return undefined;

  const amount = words.slice(0, baseIndex).reduce((sum, w) => sum + (SHADE_MODIFIERS[w] ?? 0), 0);
  const base = NAMED_COLORS[words[baseIndex]];
  return amount === 0 ? base : shade(base, Math.max(-0.8, Math.min(0.8, amount)));
}

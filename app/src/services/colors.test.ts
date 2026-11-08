import { describe, it, expect } from 'vitest';
import { toHexColor } from './colors';

describe('toHexColor', () => {
  it('passes hex through, expanding the short form', () => {
    expect(toHexColor('#A33')).toBe('#aa3333');
    expect(toHexColor('#5a1a1a')).toBe('#5a1a1a');
  });

  it('converts rgb() and plain colour names', () => {
    expect(toHexColor('rgb(0, 0, 255)')).toBe('#0000ff');
    expect(toHexColor('Black')).toBe('#000000');
    expect(toHexColor('grey')).toBe('#808080');
  });

  it('shades a named colour by the words before it (the "dark maroon" case)', () => {
    expect(toHexColor('dark maroon')).toBe('#530000');
    expect(toHexColor('darkred')).toBe(toHexColor('dark red'));
    expect(toHexColor('light-blue')).toBe('#6666ff');
  });

  it('returns undefined for anything drawio could not draw', () => {
    expect(toHexColor('unknown')).toBeUndefined();
    expect(toHexColor('chalky smudge')).toBeUndefined();
    expect(toHexColor('')).toBeUndefined();
    expect(toHexColor(null)).toBeUndefined();
  });
});

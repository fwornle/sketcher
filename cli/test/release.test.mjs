import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions } from '../lib/release.mjs';

describe('compareVersions', () => {
  it('orders versions numerically, not as strings', () => {
    assert.equal(compareVersions('0.10.0', '0.9.9'), 1);
    assert.equal(compareVersions('0.9.9', '0.10.0'), -1);
    assert.equal(compareVersions('1.2.3', '1.2.3'), 0);
  });

  it('ignores a leading v and treats missing parts as zero', () => {
    assert.equal(compareVersions('v1.2.0', '1.2'), 0);
    assert.equal(compareVersions('v2', '1.9.9'), 1);
  });

  it('compares the release part of a prerelease version', () => {
    assert.equal(compareVersions('1.0.0-rc.1', '1.0.0'), 0);
  });
});

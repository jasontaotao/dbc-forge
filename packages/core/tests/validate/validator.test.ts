import { describe, it, expect } from 'vitest';

import { createNetwork } from '../../src/model/network.js';
import { validate } from '../../src/validate/validator.js';

describe('validator', () => {
  it('runs all rules and returns all issues (no short-circuit)', () => {
    const net = createNetwork({ version: '' });
    const r = validate(net, { mode: 'build' });
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
    expect(r.warnings.length).toBeGreaterThanOrEqual(0);
  });

  it('extract mode demotes errors to warnings', () => {
    const net = createNetwork({ version: '' });
    const build = validate(net, { mode: 'build' });
    const extract = validate(net, { mode: 'extract' });
    expect(build.errors.length).toBeGreaterThan(0);
    expect(extract.errors).toHaveLength(0);
    expect(extract.warnings.length).toBeGreaterThanOrEqual(build.errors.length);
  });

  it('diff mode also demotes errors to warnings', () => {
    const net = createNetwork({ version: '' });
    const diff = validate(net, { mode: 'diff' });
    expect(diff.errors).toHaveLength(0);
    expect(diff.warnings.length).toBeGreaterThan(0);
  });

  it('default mode is build', () => {
    const net = createNetwork({ version: '' });
    const defaultResult = validate(net);
    const buildResult = validate(net, { mode: 'build' });
    expect(defaultResult.errors.length).toBe(buildResult.errors.length);
    expect(defaultResult.warnings.length).toBe(buildResult.warnings.length);
  });
});

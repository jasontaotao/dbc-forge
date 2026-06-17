import { describe, it, expect } from 'vitest';

import { ValidationError, ParseError, IOError, UsageError } from '../src/errors.js';

describe('errors', () => {
  it('ValidationError carries issues array', () => {
    const e = new ValidationError([
      { rule: 'signal.overlap', severity: 'error', location: { messageId: 0x100 }, message: 'X' },
    ]);
    expect(e.name).toBe('ValidationError');
    expect(e.issues).toHaveLength(1);
    expect(e.issues[0]?.rule).toBe('signal.overlap');
  });

  it('ParseError carries line/column', () => {
    const e = new ParseError('bad token', { line: 12, column: 4 });
    expect(e.line).toBe(12);
    expect(e.column).toBe(4);
  });

  it('IOError wraps fs error with path', () => {
    const e = new IOError('not found', { path: '/tmp/x.dbc' });
    expect(e.path).toBe('/tmp/x.dbc');
  });

  it('UsageError carries usage hint', () => {
    const e = new UsageError('missing -o', { hint: 'use -o <output>' });
    expect(e.hint).toContain('-o');
  });
});

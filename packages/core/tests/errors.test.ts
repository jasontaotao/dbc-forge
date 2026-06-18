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

  it('IOError with cause propagates cause field', () => {
    const cause = new Error('ENOENT');
    const e = new IOError('cannot read', { path: '/tmp/x', cause });
    expect(e.path).toBe('/tmp/x');
    expect(e.cause).toBe(cause);
  });

  it('UsageError without hint has undefined hint', () => {
    const e = new UsageError('bad flag');
    expect(e.hint).toBeUndefined();
  });

  it('all errors are instanceof Error', () => {
    expect(new ValidationError([])).toBeInstanceOf(Error);
    expect(new ParseError('x', { line: 1, column: 1 })).toBeInstanceOf(Error);
    expect(new IOError('x', { path: '/y' })).toBeInstanceOf(Error);
    expect(new UsageError('x')).toBeInstanceOf(Error);
  });

  it('ParseError message includes line and column', () => {
    const e = new ParseError('bad token', { line: 12, column: 4 });
    expect(e.message).toContain('line 12');
    expect(e.message).toContain('4');
  });
});

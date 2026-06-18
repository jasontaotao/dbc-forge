import { describe, it, expect } from 'vitest';
import { renderError } from '../../src/render/errors.js';
import { ValidationError, ParseError, IOError, UsageError } from '@dbc-forge/core';

describe('renderError', () => {
  it('renders UsageError with code 3 and includes hint when present', () => {
    const err = new UsageError('missing --output', { hint: 'use -o <file>' });
    const r = renderError(err);
    expect(r.code).toBe(3);
    expect(r.message).toContain('参数错误');
    expect(r.message).toContain('missing --output');
    expect(r.message).toContain('use -o <file>');
  });

  it('renders UsageError without hint cleanly', () => {
    const err = new UsageError('bad arg');
    const r = renderError(err);
    expect(r.code).toBe(3);
    expect(r.message).toContain('参数错误');
    expect(r.message).not.toContain('提示');
  });

  it('renders IOError with code 2 and includes path', () => {
    const err = new IOError('cannot read', { path: '/tmp/missing.dbc' });
    const r = renderError(err);
    expect(r.code).toBe(2);
    expect(r.message).toContain('I/O 错误');
    expect(r.message).toContain('/tmp/missing.dbc');
  });

  it('renders ParseError with code 1', () => {
    const err = new ParseError('unexpected token', { line: 10, column: 5 });
    const r = renderError(err);
    expect(r.code).toBe(1);
    expect(r.message).toContain('解析错误');
    expect(r.message).toContain('unexpected token');
  });

  it('renders ValidationError with code 1 and issue count', () => {
    const err = new ValidationError([
      { rule: 'x', severity: 'error', location: {}, message: 'm' },
      { rule: 'y', severity: 'warning', location: {}, message: 'm' },
    ]);
    const r = renderError(err);
    expect(r.code).toBe(1);
    expect(r.message).toContain('校验失败');
    expect(r.message).toContain('2');
  });

  it('renders unknown error with code 1', () => {
    const r = renderError(new Error('boom'));
    expect(r.code).toBe(1);
    expect(r.message).toContain('boom');
  });

  it('renders non-Error unknown with code 1', () => {
    const r = renderError('a string error');
    expect(r.code).toBe(1);
    expect(r.message).toContain('a string error');
  });
});

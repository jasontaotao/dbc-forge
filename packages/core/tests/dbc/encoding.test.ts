import { describe, it, expect } from 'vitest';

import { decodeAttrValue, encodeAttrValue } from '../../src/dbc/encoding.js';
import type { AttrType } from '../../src/model/attributes/attribute.js';

describe('attr value encoding', () => {
  it('ENUM encodes string → index', () => {
    const t: AttrType = { kind: 'enum', values: ['Cyclic', 'NotUsed', 'CyclicIfActive'] };
    expect(encodeAttrValue('Cyclic', t)).toBe(0);
    expect(encodeAttrValue('CyclicIfActive', t)).toBe(2);
  });

  it('ENUM throws on unknown enum value', () => {
    const t: AttrType = { kind: 'enum', values: ['A', 'B'] };
    expect(() => encodeAttrValue('C', t)).toThrow();
  });

  it('ENUM decodes index → string', () => {
    const t: AttrType = { kind: 'enum', values: ['Cyclic', 'NotUsed'] };
    expect(decodeAttrValue(1, t)).toBe('NotUsed');
  });

  it('ENUM throws on out-of-range index', () => {
    const t: AttrType = { kind: 'enum', values: ['A'] };
    expect(() => decodeAttrValue(5, t)).toThrow();
  });

  it('HEX uses decimal integer in DBC', () => {
    const t: AttrType = { kind: 'hex', min: 0, max: 0xff };
    expect(encodeAttrValue(0xab, t)).toBe('171');
  });

  it('HEX truncates fractional values to integer', () => {
    const t: AttrType = { kind: 'hex', min: 0, max: 0xff };
    expect(encodeAttrValue(171.9, t)).toBe('171');
  });

  it('INT uses toString', () => {
    const t: AttrType = { kind: 'int', min: 0, max: 100 };
    expect(encodeAttrValue(42, t)).toBe('42');
  });

  it('STRING escapes inner double-quotes', () => {
    const t: AttrType = { kind: 'string' };
    expect(encodeAttrValue('He said "hi"', t)).toBe('"He said \\"hi\\""');
  });

  it('STRING escapes backslashes', () => {
    const t: AttrType = { kind: 'string' };
    expect(encodeAttrValue('a\\b', t)).toBe('"a\\\\b"');
  });

  it('STRING decodes with stripped quotes', () => {
    const t: AttrType = { kind: 'string' };
    expect(decodeAttrValue('"hello"', t)).toBe('hello');
  });

  it('STRING decodes unescaped quotes', () => {
    const t: AttrType = { kind: 'string' };
    expect(decodeAttrValue('"He said \\"hi\\""', t)).toBe('He said "hi"');
  });

  it('STRING leaves unquoted strings as-is', () => {
    const t: AttrType = { kind: 'string' };
    expect(decodeAttrValue('not-quoted', t)).toBe('not-quoted');
  });

  it('FLOAT accepts 1.0 and 1', () => {
    const t: AttrType = { kind: 'float', min: 0, max: 1 };
    expect(decodeAttrValue('1.0', t)).toBe(1.0);
    expect(decodeAttrValue('1', t)).toBe(1);
  });

  it('FLOAT accepts scientific notation', () => {
    const t: AttrType = { kind: 'float', min: 0, max: 1 };
    expect(decodeAttrValue('1e-3', t)).toBeCloseTo(0.001);
  });

  it('non-string non-number passes through unchanged', () => {
    const t: AttrType = { kind: 'int', min: 0, max: 1 };
    // boolean would never be a valid AttrValue but encodeAttrValue
    // must not throw for unusual inputs
    expect(encodeAttrValue(true as unknown as number, t)).toBe(true);
  });
});

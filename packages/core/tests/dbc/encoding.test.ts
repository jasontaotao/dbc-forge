import { describe, it, expect } from 'vitest';

import { decodeAttrValue, encodeAttrValue } from '../../src/dbc/encoding.js';
import type { AttrType } from '../../src/model/attributes/attribute.js';

describe('attr value encoding', () => {
  it('ENUM encodes string → index', () => {
    const t: AttrType = { kind: 'enum', values: ['Cyclic', 'NotUsed', 'CyclicIfActive'] };
    expect(encodeAttrValue('Cyclic', t)).toBe(0);
    expect(encodeAttrValue('CyclicIfActive', t)).toBe(2);
  });

  it('ENUM decodes index → string', () => {
    const t: AttrType = { kind: 'enum', values: ['Cyclic', 'NotUsed'] };
    expect(decodeAttrValue(1, t)).toBe('NotUsed');
  });

  it('HEX uses decimal integer in DBC', () => {
    const t: AttrType = { kind: 'hex', min: 0, max: 0xff };
    expect(encodeAttrValue(0xab, t)).toBe('171');
  });

  it('STRING escapes inner double-quotes', () => {
    const t: AttrType = { kind: 'string' };
    expect(encodeAttrValue('He said "hi"', t)).toBe('"He said \\"hi\\""');
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
});

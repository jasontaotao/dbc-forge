import { describe, it, expect } from 'vitest';

import {
  createNetwork,
  addAttributeAssignment,
  addAttributeDef,
} from '../../../src/model/network.js';
import { attrValueTypeMismatch } from '../../../src/validate/rules/attr-value-type-mismatch.js';

describe('attr-value-type-mismatch', () => {
  it('passes when string value matches string def', () => {
    let net = createNetwork({ version: '1.0' });
    net = addAttributeDef(net, { name: 'BusType', target: 'network', type: { kind: 'string' }, defaultValue: '' });
    net = addAttributeAssignment(net, { name: 'BusType', target: { kind: 'network' }, value: 'CAN' });
    expect(attrValueTypeMismatch.check(net)).toHaveLength(0);
  });

  it('passes when numeric value matches int def', () => {
    let net = createNetwork({ version: '1.0' });
    net = addAttributeDef(net, { name: 'Baudrate', target: 'network', type: { kind: 'int', min: 0, max: 1_000_000 }, defaultValue: 0 });
    net = addAttributeAssignment(net, { name: 'Baudrate', target: { kind: 'network' }, value: 500000 });
    expect(attrValueTypeMismatch.check(net)).toHaveLength(0);
  });

  it('passes when string value matches enum def', () => {
    let net = createNetwork({ version: '1.0' });
    net = addAttributeDef(net, { name: 'BusType', target: 'network', type: { kind: 'enum', values: ['CAN', 'LIN'] }, defaultValue: 'CAN' });
    net = addAttributeAssignment(net, { name: 'BusType', target: { kind: 'network' }, value: 'CAN' });
    expect(attrValueTypeMismatch.check(net)).toHaveLength(0);
  });

  it('fires when string value assigned to int def', () => {
    let net = createNetwork({ version: '1.0' });
    net = addAttributeDef(net, { name: 'Baudrate', target: 'network', type: { kind: 'int', min: 0, max: 1_000_000 }, defaultValue: 0 });
    net = addAttributeAssignment(net, { name: 'Baudrate', target: { kind: 'network' }, value: 'CAN' });
    const issues = attrValueTypeMismatch.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('attr.value-type-mismatch');
    expect(issues[0]!.severity).toBe('error');
  });
});

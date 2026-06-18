import { describe, it, expect } from 'vitest';

import {
  createNetwork,
  addAttributeAssignment,
  addAttributeDef,
} from '../../../src/model/network.js';
import { attrValueRange } from '../../../src/validate/rules/attr-value-range.js';

describe('attr-value-range', () => {
  it('passes when numeric value is within [min, max]', () => {
    let net = createNetwork({ version: '1.0' });
    net = addAttributeDef(net, { name: 'Baudrate', target: 'network', type: { kind: 'int', min: 0, max: 1_000_000 }, defaultValue: 0 });
    net = addAttributeAssignment(net, { name: 'Baudrate', target: { kind: 'network' }, value: 500000 });
    expect(attrValueRange.check(net)).toHaveLength(0);
  });

  it('fires when numeric value exceeds max', () => {
    let net = createNetwork({ version: '1.0' });
    net = addAttributeDef(net, { name: 'Baudrate', target: 'network', type: { kind: 'int', min: 0, max: 1_000_000 }, defaultValue: 0 });
    net = addAttributeAssignment(net, { name: 'Baudrate', target: { kind: 'network' }, value: 2_000_000 });
    const issues = attrValueRange.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('attr.value-range');
    expect(issues[0]!.severity).toBe('error');
  });

  it('fires when enum value is not in values list', () => {
    let net = createNetwork({ version: '1.0' });
    net = addAttributeDef(net, { name: 'BusType', target: 'network', type: { kind: 'enum', values: ['CAN', 'LIN'] }, defaultValue: 'CAN' });
    net = addAttributeAssignment(net, { name: 'BusType', target: { kind: 'network' }, value: 'FlexRay' });
    expect(attrValueRange.check(net).length).toBeGreaterThan(0);
  });
});

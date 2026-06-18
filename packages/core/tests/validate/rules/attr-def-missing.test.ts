import { describe, it, expect } from 'vitest';

import {
  createNetwork,
  addAttributeAssignment,
  addAttributeDef,
} from '../../../src/model/network.js';
import { attrDefMissing } from '../../../src/validate/rules/attr-def-missing.js';

describe('attr-def-missing', () => {
  it('passes when assignment has matching def', () => {
    let net = createNetwork({ version: '1.0' });
    net = addAttributeDef(net, { name: 'BusType', target: 'network', type: { kind: 'string' }, defaultValue: '' });
    net = addAttributeAssignment(net, { name: 'BusType', target: { kind: 'network' }, value: 'CAN' });
    expect(attrDefMissing.check(net)).toHaveLength(0);
  });

  it('fires when assignment has no matching def', () => {
    let net = createNetwork({ version: '1.0' });
    net = addAttributeAssignment(net, { name: 'Custom', target: { kind: 'network' }, value: 'x' });
    const issues = attrDefMissing.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('attr.def-missing');
    expect(issues[0]!.severity).toBe('error');
  });
});

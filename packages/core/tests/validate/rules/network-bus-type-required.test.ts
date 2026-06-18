import { describe, it, expect } from 'vitest';

import {
  createNetwork,
  addAttributeAssignment,
} from '../../../src/model/network.js';
import { networkBusTypeRequired } from '../../../src/validate/rules/network-bus-type-required.js';

describe('network-bus-type-required', () => {
  it('fires when no BusType assignment exists', () => {
    const net = createNetwork({ version: '1.0' });
    const issues = networkBusTypeRequired.check(net);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.rule).toBe('network.bus-type-required');
    expect(issues[0]!.severity).toBe('error');
  });

  it('passes when BusType is set', () => {
    const net0 = createNetwork({ version: '1.0' });
    const net = addAttributeAssignment(net0, {
      name: 'BusType',
      target: { kind: 'network' },
      value: 'CAN',
    });
    expect(networkBusTypeRequired.check(net)).toHaveLength(0);
  });
});

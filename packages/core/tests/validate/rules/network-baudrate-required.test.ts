import { describe, it, expect } from 'vitest';

import {
  createNetwork,
  addAttributeAssignment,
} from '../../../src/model/network.js';
import { networkBaudrateRequired } from '../../../src/validate/rules/network-baudrate-required.js';

describe('network-baudrate-required', () => {
  it('fires when no Baudrate assignment exists', () => {
    const net = createNetwork({ version: '1.0' });
    const issues = networkBaudrateRequired.check(net);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.rule).toBe('network.baudrate-required');
    expect(issues[0]!.severity).toBe('error');
  });

  it('passes when Baudrate is set', () => {
    const net0 = createNetwork({ version: '1.0' });
    const net = addAttributeAssignment(net0, {
      name: 'Baudrate',
      target: { kind: 'network' },
      value: 500000,
    });
    expect(networkBaudrateRequired.check(net)).toHaveLength(0);
  });
});

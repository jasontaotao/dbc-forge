// Rule: network.bus-type-required
// A Vector DBC network must declare BusType (the protocol the matrix is bound to).
// Without it, downstream tools cannot route messages.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const networkBusTypeRequired = {
  id: 'network.bus-type-required',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const has = net.attributeAssignments.some(
      (a) => a.name === 'BusType' && a.target.kind === 'network',
    );
    if (has) return [];
    return [
      {
        rule: this.id,
        severity: this.severity,
        location: {},
        message: '网络缺少 BusType 属性（必需，规定总线类型）',
      },
    ];
  },
};

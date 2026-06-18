// Rule: network.baudrate-required
// Baudrate defines the bus bitrate; without it the network cannot be simulated or flashed.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const networkBaudrateRequired = {
  id: 'network.baudrate-required',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const has = net.attributeAssignments.some(
      (a) => a.name === 'Baudrate' && a.target.kind === 'network',
    );
    if (has) return [];
    return [
      {
        rule: this.id,
        severity: this.severity,
        location: {},
        message: '网络缺少 Baudrate 属性（必需，规定总线波特率）',
      },
    ];
  },
};

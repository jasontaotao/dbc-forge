// Rule: signal.physical-range
// min <= max in the physical (engineering) value domain. Inverted bounds
// break Vector's plot rendering and confuse downstream consumers.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const signalPhysicalRange = {
  id: 'signal.physical-range',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      for (const s of m.signals) {
        if (s.min > s.max) {
          issues.push({
            rule: this.id,
            severity: this.severity,
            location: { messageId: m.id, signalName: s.name },
            message: `信号 "${s.name}" 物理值范围非法: min=${s.min} > max=${s.max}`,
          });
        }
      }
    }
    return issues;
  },
};

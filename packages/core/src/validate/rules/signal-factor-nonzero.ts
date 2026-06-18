// Rule: signal.factor-nonzero
// factor == 0 makes the physical value always equal to `offset` regardless of
// the raw bits. Almost always a typo; refuse to ship.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const signalFactorNonzero = {
  id: 'signal.factor-nonzero',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      for (const s of m.signals) {
        if (s.factor === 0) {
          issues.push({
            rule: this.id,
            severity: this.severity,
            location: { messageId: m.id, signalName: s.name },
            message: `信号 "${s.name}" 的 factor 为 0（应为非零值）`,
          });
        }
      }
    }
    return issues;
  },
};

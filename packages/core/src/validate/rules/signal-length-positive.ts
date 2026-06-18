// Rule: signal.length-positive
// A 0-length signal is meaningless and breaks every downstream tool.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const signalLengthPositive = {
  id: 'signal.length-positive',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      for (const s of m.signals) {
        if (!(s.length > 0)) {
          issues.push({
            rule: this.id,
            severity: this.severity,
            location: { messageId: m.id, signalName: s.name },
            message: `信号 "${s.name}" 长度必须 > 0（当前 ${s.length}）`,
          });
        }
      }
    }
    return issues;
  },
};

// Rule: vt.signal-bound-exists
// Signal.valueTable must reference a VT defined in VAL_TABLE_; an orphan
// reference breaks decoding on every consumer.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const vtSignalBoundExists = {
  id: 'vt.signal-bound-exists',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const vtNames = new Set(net.valueTables.map((vt) => vt.name));
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      for (const s of m.signals) {
        if (s.valueTable === undefined) continue;
        if (!vtNames.has(s.valueTable)) {
          issues.push({
            rule: this.id,
            severity: this.severity,
            location: { messageId: m.id, signalName: s.name },
            message: `信号 "${s.name}" 引用的 VAL_TABLE_ "${s.valueTable}" 在网络中不存在`,
          });
        }
      }
    }
    return issues;
  },
};

// Rule: signal.unit-when-factor
// When factor != 1 or offset != 0, the signal's physical value is scaled — the
// engineering unit string becomes important for downstream consumers. Warning
// (not error) because there are legitimate dimensionless-scaled signals.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const signalUnitWhenFactor = {
  id: 'signal.unit-when-factor',
  severity: 'warning' as const,
  check(net: Network): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      for (const s of m.signals) {
        const scaled = s.factor !== 1 || s.offset !== 0;
        if (scaled && s.unit === '') {
          issues.push({
            rule: this.id,
            severity: this.severity,
            location: { messageId: m.id, signalName: s.name },
            message: `信号 "${s.name}" 使用非单位缩放 (factor=${s.factor}, offset=${s.offset}) 但 unit 为空`,
          });
        }
      }
    }
    return issues;
  },
};

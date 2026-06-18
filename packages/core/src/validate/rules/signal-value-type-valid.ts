// Rule: signal.value-type-valid
// Type-system-enforced check on Signal.valueType. Mirrors byteOrderValid;
// documented in case the union is widened later.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

const VALID = new Set<string>(['unsigned', 'signed', 'float', 'double']);

export const signalValueTypeValid = {
  id: 'signal.value-type-valid',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      for (const s of m.signals) {
        if (!VALID.has(s.valueType)) {
          issues.push({
            rule: this.id,
            severity: this.severity,
            location: { messageId: m.id, signalName: s.name },
            message: `信号 "${s.name}" 类型 "${s.valueType}" 非法 (允许值: unsigned, signed, float, double)`,
          });
        }
      }
    }
    return issues;
  },
};

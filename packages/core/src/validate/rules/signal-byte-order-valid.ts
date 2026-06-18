// Rule: signal.byte-order-valid
// The Signal.byteOrder field is a discriminated union ('little-endian' |
// 'big-endian'); invalid values are unrepresentable in TypeScript. This rule
// is a structural safety net — if we ever loosen the type, this guard
// catches a stray string before it reaches the DBC writer.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

const VALID = new Set<string>(['little-endian', 'big-endian']);

export const signalByteOrderValid = {
  id: 'signal.byte-order-valid',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      for (const s of m.signals) {
        if (!VALID.has(s.byteOrder)) {
          issues.push({
            rule: this.id,
            severity: this.severity,
            location: { messageId: m.id, signalName: s.name },
            message: `信号 "${s.name}" 字节序 "${s.byteOrder}" 非法 (允许值: little-endian, big-endian)`,
          });
        }
      }
    }
    return issues;
  },
};

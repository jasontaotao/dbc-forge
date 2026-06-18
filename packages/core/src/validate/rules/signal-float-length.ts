// Rule: signal.float-length
// IEEE 754 single-precision (float) is 32 bits, double-precision (double) is 64.
// Other widths are not representable.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

const FLOAT_LENGTH = 32;
const DOUBLE_LENGTH = 64;

export const signalFloatLength = {
  id: 'signal.float-length',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      for (const s of m.signals) {
        if (s.valueType === 'float' && s.length !== FLOAT_LENGTH) {
          issues.push({
            rule: this.id,
            severity: this.severity,
            location: { messageId: m.id, signalName: s.name },
            message: `信号 "${s.name}" 类型为 float 但长度 ${s.length} != ${FLOAT_LENGTH}`,
          });
        } else if (s.valueType === 'double' && s.length !== DOUBLE_LENGTH) {
          issues.push({
            rule: this.id,
            severity: this.severity,
            location: { messageId: m.id, signalName: s.name },
            message: `信号 "${s.name}" 类型为 double 但长度 ${s.length} != ${DOUBLE_LENGTH}`,
          });
        }
      }
    }
    return issues;
  },
};

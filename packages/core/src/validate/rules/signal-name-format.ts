// Rule: signal.name-format
// DBC SG_ names use the same C-identifier rules as nodes and messages.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

const FORMAT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAX_LENGTH = 32;

export const signalNameFormat = {
  id: 'signal.name-format',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      for (const s of m.signals) {
        if (!FORMAT.test(s.name) || s.name.length > MAX_LENGTH) {
          issues.push({
            rule: this.id,
            severity: this.severity,
            location: { messageId: m.id, signalName: s.name },
            message: `信号名 "${s.name}" 不符合格式 (^[A-Za-z_][A-Za-z0-9_]*$, 1-${MAX_LENGTH} chars)`,
          });
        }
      }
    }
    return issues;
  },
};

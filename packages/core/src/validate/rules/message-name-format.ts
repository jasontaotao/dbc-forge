// Rule: message.name-format
// DBC BO_ names use the same C-identifier rules as BU_ nodes (1..32 chars, no
// whitespace, no punctuation outside [A-Za-z0-9_]).

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

const FORMAT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAX_LENGTH = 32;

export const messageNameFormat = {
  id: 'message.name-format',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      if (!FORMAT.test(m.name) || m.name.length > MAX_LENGTH) {
        issues.push({
          rule: this.id,
          severity: this.severity,
          location: { messageId: m.id },
          message: `消息名 "${m.name}" 不符合格式 (^[A-Za-z_][A-Za-z0-9_]*$, 1-${MAX_LENGTH} chars)`,
        });
      }
    }
    return issues;
  },
};

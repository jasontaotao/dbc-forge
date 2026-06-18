// Rule: signal.name-duplicate-in-message
// Within one message, signal names must be unique. Two signals in the same
// message with the same name create ambiguity in the DBC and downstream code.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const signalNameDuplicateInMessage = {
  id: 'signal.name-duplicate-in-message',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      const seen = new Set<string>();
      const dup = new Set<string>();
      for (const s of m.signals) {
        if (seen.has(s.name)) dup.add(s.name);
        else seen.add(s.name);
      }
      for (const name of dup) {
        issues.push({
          rule: this.id,
          severity: this.severity,
          location: { messageId: m.id, signalName: name },
          message: `消息 0x${m.id.toString(16)} 中信号名 "${name}" 重复`,
        });
      }
    }
    return issues;
  },
};

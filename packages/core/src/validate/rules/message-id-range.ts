// Rule: message.id-range
// CAN IDs are 11-bit (0..0x7ff) for classic CAN and 29-bit (0..0x1FFFFFFF) for
// CAN 2.0B extended. Any id outside that range cannot be sent on the wire.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

const MAX_CAN_ID = 0x1fffffff;

export const messageIdRange = {
  id: 'message.id-range',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      if (!Number.isInteger(m.id) || m.id < 0 || m.id > MAX_CAN_ID) {
        issues.push({
          rule: this.id,
          severity: this.severity,
          location: { messageId: m.id },
          message: `消息 ID ${m.id} 超出合法范围 (0..0x${MAX_CAN_ID.toString(16)})`,
        });
      }
    }
    return issues;
  },
};

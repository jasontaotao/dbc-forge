// Rule: message.dlc-range
// Classic CAN frames carry 0..8 bytes. CAN FD allows up to 64, but dbc-forge's
// MVP targets classic CAN. Anything outside [0, 8] is a parse error upstream
// and would silently break a Vector import.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

const MIN_DLC = 0;
const MAX_DLC = 8;

export const messageDlcRange = {
  id: 'message.dlc-range',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      if (!Number.isInteger(m.dlc) || m.dlc < MIN_DLC || m.dlc > MAX_DLC) {
        issues.push({
          rule: this.id,
          severity: this.severity,
          location: { messageId: m.id },
          message: `消息 "${m.name}" 的 DLC ${m.dlc} 超出合法范围 (${MIN_DLC}..${MAX_DLC})`,
        });
      }
    }
    return issues;
  },
};

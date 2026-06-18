// Rule: mux.switch-exactly-one
// At most one Multiplexor per message — multiple switches are undefined behaviour.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';
import { isMultiplexor } from '../../model/signal.js';

export const muxSwitchExactlyOne = {
  id: 'mux.switch-exactly-one',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      const switches = m.signals.filter(isMultiplexor);
      if (switches.length > 1) {
        issues.push({
          rule: this.id,
          severity: this.severity,
          location: { messageId: m.id },
          message: `消息 0x${m.id.toString(16)} 包含 ${switches.length} 个 Multiplexor 信号 (应为 0 或 1)`,
        });
      }
    }
    return issues;
  },
};

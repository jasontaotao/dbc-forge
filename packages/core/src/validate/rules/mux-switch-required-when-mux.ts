// Rule: mux.switch-required-when-mux
// If any Muxed/ExtendedMuxed signal exists, exactly one Multiplexor must be
// present in the same message.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';
import { isMuxed, isMultiplexor } from '../../model/signal.js';

export const muxSwitchRequiredWhenMux = {
  id: 'mux.switch-required-when-mux',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      const hasMuxed = m.signals.some(isMuxed);
      if (!hasMuxed) continue;
      const switchCount = m.signals.filter(isMultiplexor).length;
      if (switchCount !== 1) {
        issues.push({
          rule: this.id,
          severity: this.severity,
          location: { messageId: m.id },
          message: `消息 0x${m.id.toString(16)} 包含 Muxed 信号但 Multiplexor 数量为 ${switchCount} (应为 1)`,
        });
      }
    }
    return issues;
  },
};

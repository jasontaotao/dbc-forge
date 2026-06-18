// Rule: signal.bit-range
// startBit + length must fit within dlc*8 bits. Going past the dlc boundary
// silently truncates the signal payload in many downstream tools.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const signalBitRange = {
  id: 'signal.bit-range',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      const limit = m.dlc * 8;
      for (const s of m.signals) {
        if (s.startBit < 0 || s.startBit + s.length > limit) {
          issues.push({
            rule: this.id,
            severity: this.severity,
            location: { messageId: m.id, signalName: s.name },
            message: `信号 "${s.name}" 位区间 [${s.startBit}, ${s.startBit + s.length}) 超出消息 0x${m.id.toString(16)} 的 ${limit} bits 上限 (DLC=${m.dlc})`,
          });
        }
      }
    }
    return issues;
  },
};

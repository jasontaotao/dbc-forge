// Rule: message.id-duplicate
// CAN IDs uniquely identify a frame on the bus. Two messages with the same id is
// always a configuration error — whichever was declared second wins at runtime and
// the loser is silently dropped.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const messageIdDuplicate = {
  id: 'message.id-duplicate',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const seen = new Map<number, number>();
    const dup = new Set<number>();
    for (const m of net.messages) {
      const prior = seen.get(m.id) ?? 0;
      seen.set(m.id, prior + 1);
      if (prior > 0) dup.add(m.id);
    }
    return Array.from(dup).map((id) => ({
      rule: this.id,
      severity: this.severity,
      location: { messageId: id },
      message: `消息 ID 0x${id.toString(16)} (${id}) 重复`,
    }));
  },
};

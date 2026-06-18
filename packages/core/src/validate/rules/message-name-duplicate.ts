// Rule: message.name-duplicate
// Vector CANdb++ allows messages with the same id if the names differ, so name
// collisions are the more useful detection. Two messages sharing a name would
// silently overwrite each other on round-trip.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const messageNameDuplicate = {
  id: 'message.name-duplicate',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const seen = new Set<string>();
    const dup = new Set<string>();
    for (const m of net.messages) {
      if (seen.has(m.name)) dup.add(m.name);
      else seen.add(m.name);
    }
    return Array.from(dup).map((name) => ({
      rule: this.id,
      severity: this.severity,
      location: {},
      message: `消息名 "${name}" 重复`,
    }));
  },
};

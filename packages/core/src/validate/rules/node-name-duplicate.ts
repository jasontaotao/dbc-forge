// Rule: node.name-duplicate
// DBC BU_ block is a flat list of unique node names.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const nodeNameDuplicate = {
  id: 'node.name-duplicate',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const seen = new Set<string>();
    const dup = new Set<string>();
    for (const n of net.nodes) {
      if (seen.has(n.name)) dup.add(n.name);
      else seen.add(n.name);
    }
    return Array.from(dup).map((name) => ({
      rule: this.id,
      severity: this.severity,
      location: { nodeName: name },
      message: `节点名 "${name}" 重复`,
    }));
  },
};

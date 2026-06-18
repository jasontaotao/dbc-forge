// Rule: node.unreferenced
// A node declared in BU_ but never referenced (as message transmitter, additional
// transmitter, or signal receiver) is dead weight in the matrix. Warning only —
// legitimate cases exist (reserved nodes for future expansion).

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const nodeUnreferenced = {
  id: 'node.unreferenced',
  severity: 'warning' as const,
  check(net: Network): ValidationIssue[] {
    const used = new Set<string>();
    for (const m of net.messages) {
      used.add(m.transmitter);
      for (const t of m.additionalTransmitters) used.add(t);
      for (const s of m.signals) {
        for (const r of s.receivers) used.add(r);
      }
    }
    const issues: ValidationIssue[] = [];
    for (const n of net.nodes) {
      if (!used.has(n.name)) {
        issues.push({
          rule: this.id,
          severity: this.severity,
          location: { nodeName: n.name },
          message: `节点 "${n.name}" 在网络中存在但未被任何消息或信号引用`,
        });
      }
    }
    return issues;
  },
};

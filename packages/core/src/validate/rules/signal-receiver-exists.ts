// Rule: signal.receiver-exists
// Each signal receiver must be a real node in BU_, or one of the Vector
// pseudo-node virtual receivers (Vector__XXX pattern used for unicast /
// unassigned targets in CANdb++).

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

const VECTOR_VIRTUAL_PATTERN = /^Vector__/;

export const signalReceiverExists = {
  id: 'signal.receiver-exists',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const nodeNames = new Set(net.nodes.map((n) => n.name));
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      for (const s of m.signals) {
        for (const r of s.receivers) {
          if (nodeNames.has(r) || VECTOR_VIRTUAL_PATTERN.test(r)) continue;
          issues.push({
            rule: this.id,
            severity: this.severity,
            location: { messageId: m.id, signalName: s.name, nodeName: r },
            message: `信号 "${s.name}" 的接收节点 "${r}" 在网络节点列表中不存在`,
          });
        }
      }
    }
    return issues;
  },
};

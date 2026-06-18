// Rule: message.transmitter-exists
// A BO_ transmitter must reference a node declared in BU_. Vector CANdb++
// permits "Vector__XXX" pseudo-nodes for virtual transmitters but those are
// not in BU_; we require a real entry.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const messageTransmitterExists = {
  id: 'message.transmitter-exists',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const nodeNames = new Set(net.nodes.map((n) => n.name));
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      if (!nodeNames.has(m.transmitter)) {
        issues.push({
          rule: this.id,
          severity: this.severity,
          location: { messageId: m.id },
          message: `消息 "${m.name}" 的发送节点 "${m.transmitter}" 在网络节点列表中不存在`,
        });
      }
    }
    return issues;
  },
};

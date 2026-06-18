// Rule: attr.target-exists
// The (messageId|signalName|nodeName) referenced by a BA_ target must resolve
// in the network. Otherwise the assignment is orphaned.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const attrTargetExists = {
  id: 'attr.target-exists',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const msgIds = new Set(net.messages.map((m) => m.id));
    const nodeNames = new Set(net.nodes.map((n) => n.name));
    const signalNamesByMsg = new Map<number, Set<string>>();
    for (const m of net.messages) {
      signalNamesByMsg.set(m.id, new Set(m.signals.map((s) => s.name)));
    }
    const issues: ValidationIssue[] = [];
    for (const a of net.attributeAssignments) {
      const loc: { messageId?: number; signalName?: string; nodeName?: string } = {};
      if (a.target.kind === 'message') {
        const id = a.target.messageId;
        loc.messageId = id;
        if (!msgIds.has(id)) {
          issues.push({
            rule: this.id,
            severity: this.severity,
            location: loc,
            message: `属性 "${a.name}" 的目标消息 0x${id.toString(16)} 在网络中不存在`,
          });
        }
      } else if (a.target.kind === 'signal') {
        const id = a.target.messageId;
        const sname = a.target.signalName;
        loc.messageId = id;
        loc.signalName = sname;
        const signalsInMsg = signalNamesByMsg.get(id);
        if (!signalsInMsg || !signalsInMsg.has(sname)) {
          issues.push({
            rule: this.id,
            severity: this.severity,
            location: loc,
            message: `属性 "${a.name}" 的目标信号 "${sname}" (消息 0x${id.toString(16)}) 在网络中不存在`,
          });
        }
      } else if (a.target.kind === 'node') {
        const nname = a.target.nodeName;
        loc.nodeName = nname;
        if (!nodeNames.has(nname)) {
          issues.push({
            rule: this.id,
            severity: this.severity,
            location: loc,
            message: `属性 "${a.name}" 的目标节点 "${nname}" 在网络中不存在`,
          });
        }
      }
    }
    return issues;
  },
};

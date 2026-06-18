// Rule: attr.rel-target-exists
// Relation attributes (BA_DEF_REL_ / BA_REL_) bind a node to a message or
// (node, message, signal) tuple. Each component must resolve.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const attrRelTargetExists = {
  id: 'attr.rel-target-exists',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const nodeNames = new Set(net.nodes.map((n) => n.name));
    const msgIds = new Set(net.messages.map((m) => m.id));
    const signalNamesByMsg = new Map<number, Set<string>>();
    for (const m of net.messages) {
      signalNamesByMsg.set(m.id, new Set(m.signals.map((s) => s.name)));
    }
    const issues: ValidationIssue[] = [];
    for (const a of net.relationAttributeAssignments) {
      const t = a.target;
      const loc: { messageId?: number; signalName?: string; nodeName?: string } = {
        nodeName: t.nodeName,
        messageId: t.messageId,
      };
      if (!nodeNames.has(t.nodeName)) {
        issues.push({
          rule: this.id,
          severity: this.severity,
          location: loc,
          message: `关系属性 "${a.name}" 的目标节点 "${t.nodeName}" 在网络中不存在`,
        });
      }
      if (!msgIds.has(t.messageId)) {
        issues.push({
          rule: this.id,
          severity: this.severity,
          location: loc,
          message: `关系属性 "${a.name}" 的目标消息 0x${t.messageId.toString(16)} 在网络中不存在`,
        });
      }
      if (t.kind === 'node-signal') {
        const signalsInMsg = signalNamesByMsg.get(t.messageId);
        loc.signalName = t.signalName;
        if (!signalsInMsg || !signalsInMsg.has(t.signalName)) {
          issues.push({
            rule: this.id,
            severity: this.severity,
            location: loc,
            message: `关系属性 "${a.name}" 的目标信号 "${t.signalName}" 在消息 0x${t.messageId.toString(16)} 中不存在`,
          });
        }
      }
    }
    return issues;
  },
};

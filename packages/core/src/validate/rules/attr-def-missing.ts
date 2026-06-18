// Rule: attr.def-missing
// Every BA_ assignment must have a matching BA_DEF_ in attributeDefs.
// Otherwise the assignment is a free-floating attribute that Vector can't parse.
// Build-mode auto-emits (⚠️5) for well-known attributes; this rule enforces the
// invariant at validate time so extract/diff mode also surfaces missing defs.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const attrDefMissing = {
  id: 'attr.def-missing',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const defNames = new Set(net.attributeDefs.map((d) => d.name));
    const seen = new Set<string>();
    const issues: ValidationIssue[] = [];
    for (const a of net.attributeAssignments) {
      const key = `${a.name}|${a.target.kind}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!defNames.has(a.name)) {
        issues.push({
          rule: this.id,
          severity: this.severity,
          location: this.assignmentLocation(a),
          message: `属性 "${a.name}" 在网络中没有对应的 BA_DEF_ 定义`,
        });
      }
    }
    return issues;
  },
  assignmentLocation(a: { target: { kind: string; messageId?: number; signalName?: string; nodeName?: string } }): { messageId?: number; signalName?: string; nodeName?: string } {
    if (a.target.kind === 'message' && a.target.messageId !== undefined) return { messageId: a.target.messageId };
    if (a.target.kind === 'signal' && a.target.messageId !== undefined && a.target.signalName !== undefined) return { messageId: a.target.messageId, signalName: a.target.signalName };
    if (a.target.kind === 'node' && a.target.nodeName !== undefined) return { nodeName: a.target.nodeName };
    return {};
  },
};

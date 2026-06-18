// Rule: attr.value-type-mismatch
// The assignment value's runtime kind must match the def's declared AttrType.
// string/enum accept strings; int/hex/float accept numbers.

import type { ValidationIssue } from '../../errors.js';
import type { AttributeAssignment, AttributeDef } from '../../model/attributes/attribute.js';
import type { Network } from '../../model/network.js';

function locationOf(a: AttributeAssignment): {
  messageId?: number;
  signalName?: string;
  nodeName?: string;
} {
  if (a.target.kind === 'message' && a.target.messageId !== undefined)
    return { messageId: a.target.messageId };
  if (
    a.target.kind === 'signal' &&
    a.target.messageId !== undefined &&
    a.target.signalName !== undefined
  )
    return { messageId: a.target.messageId, signalName: a.target.signalName };
  if (a.target.kind === 'node' && a.target.nodeName !== undefined)
    return { nodeName: a.target.nodeName };
  return {};
}

function valueMatchesType(value: string | number, def: AttributeDef): boolean {
  switch (def.type.kind) {
    case 'int':
    case 'hex':
    case 'float':
      return typeof value === 'number';
    case 'string':
    case 'enum':
      return typeof value === 'string';
  }
}

export const attrValueTypeMismatch = {
  id: 'attr.value-type-mismatch',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const defsByName = new Map(net.attributeDefs.map((d) => [d.name, d] as const));
    const issues: ValidationIssue[] = [];
    for (const a of net.attributeAssignments) {
      const def = defsByName.get(a.name);
      if (!def) continue; // covered by attr-def-missing
      if (!valueMatchesType(a.value, def)) {
        issues.push({
          rule: this.id,
          severity: this.severity,
          location: locationOf(a),
          message: `属性 "${a.name}" 的值类型 (${typeof a.value}) 与定义类型 (${def.type.kind}) 不匹配`,
        });
      }
    }
    return issues;
  },
};

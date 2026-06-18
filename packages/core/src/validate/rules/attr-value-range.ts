// Rule: attr.value-range
// Numeric values must be in [min, max]; enum values must be in values[].

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

function inRange(value: string | number, def: AttributeDef): boolean {
  switch (def.type.kind) {
    case 'int':
    case 'hex':
    case 'float':
      return typeof value === 'number' && value >= def.type.min && value <= def.type.max;
    case 'enum':
      return typeof value === 'string' && def.type.values.includes(value);
    case 'string':
      return typeof value === 'string';
  }
}

export const attrValueRange = {
  id: 'attr.value-range',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const defsByName = new Map(net.attributeDefs.map((d) => [d.name, d] as const));
    const issues: ValidationIssue[] = [];
    for (const a of net.attributeAssignments) {
      const def = defsByName.get(a.name);
      if (!def) continue; // covered by attr-def-missing
      if (!inRange(a.value, def)) {
        issues.push({
          rule: this.id,
          severity: this.severity,
          location: locationOf(a),
          message: `属性 "${a.name}" 的值 (${a.value}) 超出定义范围 ${describeTypeRange(def)}`,
        });
      }
    }
    return issues;
  },
};

function describeTypeRange(def: AttributeDef): string {
  switch (def.type.kind) {
    case 'int':
    case 'hex':
    case 'float':
      return `[${def.type.min}, ${def.type.max}]`;
    case 'enum':
      return `[${def.type.values.join(', ')}]`;
    case 'string':
      return 'string';
  }
}

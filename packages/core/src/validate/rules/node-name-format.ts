// Rule: node.name-format
// DBC BU_ names must match /^[A-Za-z_][A-Za-z0-9_]*$/ and be 1..32 chars long.
// These constraints are enforced by the Vector CANdb++ parser and most downstream
// tools, so anything else would silently break round-trip.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

const FORMAT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAX_LENGTH = 32;

export const nodeNameFormat = {
  id: 'node.name-format',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const n of net.nodes) {
      if (!FORMAT.test(n.name) || n.name.length > MAX_LENGTH) {
        issues.push({
          rule: this.id,
          severity: this.severity,
          location: { nodeName: n.name },
          message: `节点名 "${n.name}" 不符合格式 (^[A-Za-z_][A-Za-z0-9_]*$, 1-${MAX_LENGTH} chars)`,
        });
      }
    }
    return issues;
  },
};

// Rule: vt.duplicate-raw-value
// A VAL_TABLE_ entry list must have unique raw values; otherwise the lookup
// is ambiguous.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const vtDuplicateRawValue = {
  id: 'vt.duplicate-raw-value',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const vt of net.valueTables) {
      const seen = new Set<number>();
      const dup = new Set<number>();
      for (const e of vt.entries) {
        if (seen.has(e.raw)) dup.add(e.raw);
        else seen.add(e.raw);
      }
      for (const raw of dup) {
        issues.push({
          rule: this.id,
          severity: this.severity,
          location: {},
          message: `VAL_TABLE_ "${vt.name}" 中 raw 值 ${raw} 重复`,
        });
      }
    }
    return issues;
  },
};

// Rule: vt.value-in-signal-range
// Every raw value in a signal's bound VAL_TABLE_ must fit in [0, 2^length - 1].
// Values outside the range are unreachable on the wire.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const vtValueInSignalRange = {
  id: 'vt.value-in-signal-range',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const vtByName = new Map(net.valueTables.map((vt) => [vt.name, vt]));
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      for (const s of m.signals) {
        if (s.valueTable === undefined) continue;
        const vt = vtByName.get(s.valueTable);
        if (!vt) continue; // covered by vt-signal-bound-exists
        const max = (1 << s.length) - 1;
        for (const e of vt.entries) {
          if (!Number.isInteger(e.raw) || e.raw < 0 || e.raw > max) {
            issues.push({
              rule: this.id,
              severity: this.severity,
              location: { messageId: m.id, signalName: s.name },
              message: `VAL_TABLE_ "${vt.name}" 的 raw 值 ${e.raw} 超出信号 "${s.name}" 长度 ${s.length} 的合法范围 [0, ${max}]`,
            });
          }
        }
      }
    }
    return issues;
  },
};

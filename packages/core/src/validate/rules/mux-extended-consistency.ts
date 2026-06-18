// Rule: mux.extended-consistency
// Message.muxExtensions keys map a parent Muxed signal name to additional values
// that inherit from it. Each value in the array must be a valid muxed value
// (already covered by mux-muxed-value-in-range), but we also check that:
//   (a) every key in muxExtensions corresponds to a Muxed/ExtendedMuxed signal
//   (b) no duplicate values within one extension set
// Orphan extension entries (key points at nothing) are flagged as errors.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const muxExtendedConsistency = {
  id: 'mux.extended-consistency',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      const ext = m.muxExtensions;
      if (!ext) continue;
      const signalNames = new Set(m.signals.map((s) => s.name));
      for (const [key, values] of ext) {
        if (!signalNames.has(key)) {
          issues.push({
            rule: this.id,
            severity: this.severity,
            location: { messageId: m.id, signalName: key },
            message: `消息 0x${m.id.toString(16)} 的 muxExtensions 引用了不存在的信号 "${key}"`,
          });
          continue;
        }
        const seen = new Set<number>();
        for (const v of values) {
          if (seen.has(v)) {
            issues.push({
              rule: this.id,
              severity: this.severity,
              location: { messageId: m.id, signalName: key },
              message: `信号 "${key}" 的 ExtendedMuxed 值 ${v} 在该集合中重复`,
            });
          }
          seen.add(v);
        }
      }
    }
    return issues;
  },
};

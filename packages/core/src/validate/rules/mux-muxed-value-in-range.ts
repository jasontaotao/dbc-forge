// Rule: mux.muxed-value-in-range
// Every Muxed/ExtendedMuxed value must fit within [0, 2^switch.length - 1].
// Values outside the range can never be selected on the wire.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';
import { isMultiplexor } from '../../model/signal.js';

function muxValues(s: { multiplexed: { kind: string; value?: number } }): number[] {
  if (s.multiplexed.kind === 'Muxed' || s.multiplexed.kind === 'ExtendedMuxed') {
    return [s.multiplexed.value as number];
  }
  return [];
}

export const muxMuxedValueInRange = {
  id: 'mux.muxed-value-in-range',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      const sw = m.signals.find(isMultiplexor);
      const max = sw ? (1 << sw.length) - 1 : 0;
      for (const s of m.signals) {
        for (const v of muxValues(s)) {
          if (!Number.isInteger(v) || v < 0 || v > max) {
            issues.push({
              rule: this.id,
              severity: this.severity,
              location: { messageId: m.id, signalName: s.name },
              message: `信号 "${s.name}" 的 Muxed 值 ${v} 超出 Multiplexor 长度 ${sw?.length ?? 0} 的合法范围 [0, ${max}]`,
            });
          }
        }
      }
    }
    return issues;
  },
};

// Rule: signal.overlap
// Enforces ⚠️4 frozen 2026-06-18: signals sharing a bucket (Plain, Multiplexor,
// or a specific Muxed/ExtendedMuxed value) MUST NOT overlap in bit range.
// See model/signal.ts JSDoc for the four frozen invariants.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';
import { muxBucket } from '../../model/signal.js';

function bitsOverlap(a: { startBit: number; length: number }, b: { startBit: number; length: number }): boolean {
  return a.startBit < b.startBit + b.length && b.startBit < a.startBit + a.length;
}

export const signalOverlap = {
  id: 'signal.overlap',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      // Bucket signals per ⚠️4 frozen rule (Plain/Muxor/<value>/extmux:<value>).
      const buckets = new Map<string, { name: string; startBit: number; length: number }[]>();
      for (const s of m.signals) {
        const bucket = muxBucket(s);
        const list = buckets.get(bucket) ?? [];
        list.push({ name: s.name, startBit: s.startBit, length: s.length });
        buckets.set(bucket, list);
      }
      for (const [bucket, sigs] of buckets) {
        for (let i = 0; i < sigs.length; i++) {
          for (let j = i + 1; j < sigs.length; j++) {
            const a = sigs[i]!;
            const b = sigs[j]!;
            if (bitsOverlap(a, b)) {
              issues.push({
                rule: this.id,
                severity: this.severity,
                location: { messageId: m.id, signalName: a.name },
                message: `信号 "${a.name}" 与 "${b.name}" 在消息 0x${m.id.toString(16)} 的 mux bucket "${bucket}" 中位区间重叠`,
              });
            }
          }
        }
      }
    }
    return issues;
  },
};

// Stub — implemented in Commit 3.
import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const muxExtendedConsistency = {
  id: 'mux.extended-consistency',
  severity: 'error' as const,
  check(_net: Network): ValidationIssue[] { return []; },
};

// Stub — implemented in Commit 2.
import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const signalByteOrderValid = {
  id: 'signal.byte-order-valid',
  severity: 'error' as const,
  check(_net: Network): ValidationIssue[] { return []; },
};

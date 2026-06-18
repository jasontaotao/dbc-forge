// Stub — implemented in Commit 4.
import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const attrValueTypeMismatch = {
  id: 'attr.value-type-mismatch',
  severity: 'error' as const,
  check(_net: Network): ValidationIssue[] { return []; },
};

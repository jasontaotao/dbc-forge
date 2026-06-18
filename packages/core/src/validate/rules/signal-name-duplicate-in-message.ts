// Stub — implemented in Commit 3.
import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const signalNameDuplicateInMessage = {
  id: 'signal.name-duplicate-in-message',
  severity: 'error' as const,
  check(_net: Network): ValidationIssue[] { return []; },
};

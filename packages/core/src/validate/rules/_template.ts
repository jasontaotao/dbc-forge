// Template for new validation rules.
//
// Delete this file in Phase 9.5 Task 9.5.1 (quality gate hardening).
// Use it as a copy-paste starting point when adding a new rule: replace the
// rule id, severity, and check() body, then add a corresponding test file
// at packages/core/tests/validate/rules/<rule-id>.test.ts.
//
// Rules must follow the project's TDD discipline:
//   1. Write the test (RED).
//   2. Implement the rule (GREEN).
//   3. Refactor (IMPROVE).
//   4. Verify coverage ≥ 80% (project floor) — Phase 6 does not bump this bar.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

export const ruleTemplate = {
  id: 'template.example-rule',
  severity: 'warning' as const,
  check(_net: Network): ValidationIssue[] {
    return [];
  },
};

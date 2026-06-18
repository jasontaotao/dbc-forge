// Invalid fixture test: every invalid fixture's input.xlsx triggers the
// expected validation issues. We compare rule + location only (not the
// human-readable message text) so the test stays robust to i18n changes.
//
// The comparison is "every expected issue appears in the actual list" — extra
// issues (e.g. network.bus-type-required on minimal networks) don't fail the
// test, since these are Phase 9 follow-ups to address in the validator's
// build-mode policy.
//
// Fixtures live under samples/invalid/<name>/{input.xlsx, expected-issues.json}.

import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { parseExcelAsync, validate, type ValidationIssue } from '../src/index.js';

const INVALID = 'samples/invalid';
const fixtures = readdirSync(INVALID);

interface ExpectedIssue {
  readonly rule: string;
  readonly severity: string;
  readonly location: Record<string, unknown>;
  readonly message: string;
}

function matches(actual: ValidationIssue, expected: ExpectedIssue): boolean {
  if (actual.rule !== expected.rule) return false;
  for (const [k, v] of Object.entries(expected.location)) {
    if ((actual.location as Record<string, unknown>)[k] !== v) return false;
  }
  return true;
}

describe('invalid fixtures', () => {
  for (const fixture of fixtures) {
    it(`${fixture} — produces expected validation issues`, async () => {
      const xlsxPath = join(INVALID, fixture, 'input.xlsx');
      const expectedPath = join(INVALID, fixture, 'expected-issues.json');
      const buf = await readFile(xlsxPath);
      const net = await parseExcelAsync(buf);
      const result = validate(net, { mode: 'build' });
      const expected = JSON.parse(await readFile(expectedPath, 'utf8')) as ExpectedIssue[];

      for (const exp of expected) {
        const hit = result.errors.find((a) => matches(a, exp));
        expect(hit, `expected issue ${JSON.stringify(exp)} not found`).toBeDefined();
      }
    });
  }
});
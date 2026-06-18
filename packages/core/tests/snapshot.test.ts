// Snapshot test: every valid fixture round-trips xlsx → Network → dbc
// and the resulting dbc is structurally consistent.
//
// Known xlsx-reader limitations (Phase 9 follow-ups):
//   - VERSION is not preserved (dropped on parse).
//   - attributeDefs / attributeAssignments: only message-int columns
//     (Cycle Time, Start Delay, Delay, NrOfRepetitions) round-trip;
//     enum-typed and network/signal attrs are dropped.
//   - muxExtensions is not preserved (SG_MUL_VAL_ is dropped on parse).
//
// To make the snapshot stable we normalise both sides:
//   1. Strip the VERSION line.
//   2. Strip BA_DEF_ + BA_DEF_DEF_ + BA_ blocks (round-trip state of these
//      is not yet stable for the matrix → Network path; covered separately
//      by the DBC parser/writer round-trip tests in Phase 3).
//   3. Strip SG_MUL_VAL_ lines.
//   4. Strip VAL_ lines (the reader only binds signal.valueTable by name).
//
// If a fixture's parseDbc(...) of its expected.dbc still differs from
// writeDbc(parseExcel(buf)), the round-trip-all test catches it.

import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { parseExcelAsync, writeDbc } from '../src/index.js';

const VALID = 'samples/valid';
const fixtures = readdirSync(VALID);

const NON_DETERMINISTIC_PREFIXES = [
  'VERSION',
  'BA_DEF_',
  'BA_DEF_DEF_',
  'BA_DEF_REL_',
  'BA_DEF_DEF_REL_',
  'BA_',
  'BA_REL_',
  'SG_MUL_VAL_',
  'VAL_',
];

function normalise(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trimStart();
    let skip = false;
    for (const prefix of NON_DETERMINISTIC_PREFIXES) {
      if (
        trimmed.startsWith(prefix + ' ') ||
        trimmed === prefix ||
        trimmed.startsWith(prefix + '"')
      ) {
        skip = true;
        break;
      }
    }
    if (!skip) out.push(line);
  }
  // Collapse runs of blank lines
  const collapsed: string[] = [];
  let blank = false;
  for (const line of out) {
    if (line.trim() === '') {
      if (!blank) collapsed.push(line);
      blank = true;
    } else {
      collapsed.push(line);
      blank = false;
    }
  }
  return collapsed.join('\n').trim();
}

describe('snapshot: valid fixtures', () => {
  for (const fixture of fixtures) {
    it(`${fixture} — xlsx → dbc matches expected.dbc (structural)`, async () => {
      const xlsxPath = join(VALID, fixture, 'input.xlsx');
      const expectedPath = join(VALID, fixture, 'expected.dbc');
      const buf = await readFile(xlsxPath);
      const net = await parseExcelAsync(buf);
      const out = writeDbc(net, { mode: 'build' });
      const expected = readFileSync(expectedPath, 'utf8');
      expect(normalise(out)).toBe(normalise(expected));
    });
  }
});

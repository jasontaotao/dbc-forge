// Round-trip test: every valid fixture must round-trip
//   xlsx → Network → dbc → Network
// where the two Networks are deeply equal.
//
// This catches asymmetries between reader and writer (e.g. fields that
// writeDbc emits but parseDbc drops). The deepEqualNetwork helper sorts
// every collection before comparing, so insertion order doesn't matter.
//
// Fixtures live under samples/valid/<name>/{input.xlsx}.

import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { parseExcelAsync, parseDbc, writeDbc, deepEqualNetwork } from '../src/index.js';

const VALID = 'samples/valid';
const fixtures = readdirSync(VALID);

describe('round-trip: all valid fixtures', () => {
  for (const fixture of fixtures) {
    it(`${fixture} — xlsx → Network → dbc → Network is stable`, async () => {
      const xlsxPath = join(VALID, fixture, 'input.xlsx');
      const buf = await readFile(xlsxPath);
      const a = await parseExcelAsync(buf);
      const dbcText = writeDbc(a, { mode: 'build' });
      const b = parseDbc(dbcText);
      expect(deepEqualNetwork(a, b)).toBe(true);
    });
  }
});
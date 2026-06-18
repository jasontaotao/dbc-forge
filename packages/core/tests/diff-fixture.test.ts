// Diff fixture test: baseline.xlsx → modified.xlsx produces the expected
// summary counts. Per-change details are exercised by the Phase 7 differ
// unit tests; this test confirms the fixture wires up correctly.
//
// Fixtures live under samples/diff/{baseline.xlsx, modified.xlsx}.

import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { parseExcelAsync, diff } from '../src/index.js';

const DIFF = 'samples/diff';

describe('diff fixture', () => {
  it('baseline → modified produces expected diff summary', async () => {
    const a = await parseExcelAsync(await readFile(join(DIFF, 'baseline.xlsx')));
    const b = await parseExcelAsync(await readFile(join(DIFF, 'modified.xlsx')));
    const report = diff(a, b);

    // Expected counts:
    //   baseline: 1 message (BaselineMsg) with 3 signals (Keep, ToChange, ToRemove)
    //   modified: 2 messages:
    //     - BaselineMsg with 2 signals (Keep, ToChange) — ToChange mutated
    //       (length 8 → 16, unit '', factor 1) → signal-changed; ToRemove
    //       dropped → signal-removed
    //     - AddedMsg → message-added (with 1 signal-added)
    expect(report.summary.messagesAdded).toBe(1);
    expect(report.summary.signalsRemoved).toBe(1);
    expect(report.summary.signalsChanged).toBe(1);
    expect(report.summary.signalsAdded).toBe(1);
  });
});

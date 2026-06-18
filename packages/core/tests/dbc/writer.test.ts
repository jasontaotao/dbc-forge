import { describe, it, expect } from 'vitest';

import { writeDbc } from '../../src/dbc/writer.js';
import { addNode, createNetwork } from '../../src/model/network.js';

describe('dbc writer — header', () => {
  it('emits VERSION + NS_ + BS_ + BU_', () => {
    const n0 = createNetwork({ version: '1.0' });
    const n1 = addNode(n0, { name: 'ECM' });
    const out = writeDbc(n1);
    expect(out).toMatch(/^VERSION "1\.0"/);
    expect(out).toMatch(/NS_ :/);
    expect(out).toMatch(/BS_:/);
    expect(out).toMatch(/BU_: ECM/);
  });
});

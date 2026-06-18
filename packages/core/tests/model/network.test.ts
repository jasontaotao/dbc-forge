import { describe, it, expect } from 'vitest';

import { createNetwork, addMessage } from '../../src/model/network.js';

describe('Network', () => {
  it('createNetwork empty', () => {
    const n = createNetwork({ version: '1.0' });
    expect(n.version).toBe('1.0');
    expect(n.messages).toHaveLength(0);
  });

  it('addMessage returns a new Network (immutability)', () => {
    const n0 = createNetwork({ version: '1.0' });
    const n1 = addMessage(n0, { id: 1, name: 'M', dlc: 8, transmitter: 'N' });
    expect(n0.messages).toHaveLength(0);
    expect(n1.messages).toHaveLength(1);
  });
});

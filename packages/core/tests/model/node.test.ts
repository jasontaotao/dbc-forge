import { describe, it, expect } from 'vitest';

import { createNode } from '../../src/model/node.js';

describe('Node', () => {
  it('createNode with name and optional address', () => {
    const n = createNode({ name: 'BCM', address: 0x10 });
    expect(n.name).toBe('BCM');
    expect(n.address).toBe(0x10);
  });

  it('createNode without address yields undefined', () => {
    const n = createNode({ name: 'Gateway' });
    expect(n.address).toBeUndefined();
  });
});
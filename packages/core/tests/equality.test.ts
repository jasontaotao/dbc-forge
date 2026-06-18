import { describe, it, expect } from 'vitest';

import { deepEqualNetwork } from '../src/equality.js';
import { createNetwork, addMessage, addNode } from '../src/model/network.js';
import { createSignal } from '../src/model/signal.js';

describe('deepEqualNetwork', () => {
  it('returns true for two empty networks', () => {
    const a = createNetwork({ version: '1.0' });
    const b = createNetwork({ version: '1.0' });
    expect(deepEqualNetwork(a, b)).toBe(true);
  });

  it('returns false when versions differ', () => {
    const a = createNetwork({ version: '1.0' });
    const b = createNetwork({ version: '2.0' });
    expect(deepEqualNetwork(a, b)).toBe(false);
  });

  it('returns true when nodes match', () => {
    const a = addNode(createNetwork({ version: '1.0' }), { name: 'ECU', address: 1 });
    const b = addNode(createNetwork({ version: '1.0' }), { name: 'ECU', address: 1 });
    expect(deepEqualNetwork(a, b)).toBe(true);
  });

  it('returns false when node addresses differ', () => {
    const a = addNode(createNetwork({ version: '1.0' }), { name: 'ECU', address: 1 });
    const b = addNode(createNetwork({ version: '1.0' }), { name: 'ECU', address: 2 });
    expect(deepEqualNetwork(a, b)).toBe(false);
  });

  it('returns true when messages match (sorted by id)', () => {
    let a = addMessage(createNetwork({ version: '1.0' }), { id: 0x100, name: 'M', dlc: 8, transmitter: 'N' });
    a = addMessage(a, { id: 0x200, name: 'M2', dlc: 4, transmitter: 'N' });
    let b = addMessage(createNetwork({ version: '1.0' }), { id: 0x200, name: 'M2', dlc: 4, transmitter: 'N' });
    b = addMessage(b, { id: 0x100, name: 'M', dlc: 8, transmitter: 'N' });
    expect(deepEqualNetwork(a, b)).toBe(true);
  });

  it('normalizes empty muxExtensions to absent', () => {
    const sig = createSignal({
      name: 'S', startBit: 0, length: 8, byteOrder: 'little-endian',
      valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 255,
      unit: '', receivers: [],
    });
    const a = addMessage(createNetwork({ version: '1.0' }), {
      id: 0x100, name: 'M', dlc: 8, transmitter: 'N', signals: [sig],
    });
    const b = addMessage(createNetwork({ version: '1.0' }), {
      id: 0x100, name: 'M', dlc: 8, transmitter: 'N',
      signals: [sig],
      muxExtensions: new Map(),
    });
    expect(deepEqualNetwork(a, b)).toBe(true);
  });

  it('detects matching muxExtensions', () => {
    const sig = createSignal({
      name: 'S', startBit: 0, length: 8, byteOrder: 'little-endian',
      valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 255,
      unit: '', receivers: [],
    });
    const map = new Map([['S', [0, 1]]]);
    const a = addMessage(createNetwork({ version: '1.0' }), {
      id: 0x100, name: 'M', dlc: 8, transmitter: 'N', signals: [sig],
      muxExtensions: map,
    });
    const b = addMessage(createNetwork({ version: '1.0' }), {
      id: 0x100, name: 'M', dlc: 8, transmitter: 'N', signals: [sig],
      muxExtensions: new Map([['S', [0, 1]]]),
    });
    expect(deepEqualNetwork(a, b)).toBe(true);
  });
});

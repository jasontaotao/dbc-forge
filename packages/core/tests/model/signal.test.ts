import { describe, it, expect } from 'vitest';

import { createSignal, isMultiplexor, isMuxed, muxBucket } from '../../src/model/signal.js';

describe('Signal', () => {
  it('createSignal with all fields', () => {
    const s = createSignal({
      name: 'Speed', startBit: 0, length: 16, byteOrder: 'little-endian',
      valueType: 'unsigned', factor: 0.1, offset: 0, min: 0, max: 6553.5,
      unit: 'km/h', receivers: ['BCM'],
    });
    expect(s.startBit).toBe(0);
    expect(s.byteOrder).toBe('little-endian');
  });

  it('isMultiplexor detects Mux switch signal', () => {
    const m = createSignal({ name: 'Mux', startBit: 0, length: 8, byteOrder: 'little-endian', valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: [], multiplexed: 'Multiplexor' });
    expect(isMultiplexor(m)).toBe(true);
  });

  it('isMuxed detects multiplexed value signal', () => {
    const m = createSignal({ name: 'S0', startBit: 8, length: 8, byteOrder: 'little-endian', valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: [], multiplexed: { kind: 'Muxed', value: 0 } });
    expect(isMuxed(m)).toBe(true);
  });

  it('muxBucket returns the bucket key for grouping', () => {
    const m0 = createSignal({ name: 'A', startBit: 8, length: 8, byteOrder: 'little-endian', valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: [], multiplexed: { kind: 'Muxed', value: 0 } });
    const m1 = createSignal({ name: 'B', startBit: 16, length: 8, byteOrder: 'little-endian', valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: [], multiplexed: { kind: 'Muxed', value: 1 } });
    expect(muxBucket(m0)).toBe('0');
    expect(muxBucket(m1)).toBe('1');
  });
});
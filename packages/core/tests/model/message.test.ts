import { describe, it, expect } from 'vitest';

import { createMessage } from '../../src/model/message.js';

describe('Message', () => {
  it('createMessage with required fields', () => {
    const m = createMessage({ id: 0x100, name: 'EngineStatus', dlc: 8, transmitter: 'ECU' });
    expect(m.id).toBe(0x100);
    expect(m.dlc).toBe(8);
    expect(m.transmitter).toBe('ECU');
  });

  it('createMessage with 29-bit id sets isExtended', () => {
    const m = createMessage({ id: 0x18FF1234, name: 'X', dlc: 8, transmitter: 'GW' });
    expect(m.isExtended).toBe(true);
  });
});
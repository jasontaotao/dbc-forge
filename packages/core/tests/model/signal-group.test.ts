import { describe, it, expect } from 'vitest';

import { createSignalGroup } from '../../src/model/signal-group.js';

describe('SignalGroup', () => {
  it('createSignalGroup with name + signalNames + messageId', () => {
    const sg = createSignalGroup({
      name: 'SG_Engine',
      messageId: 0x100,
      signalNames: ['RPM', 'Temp'],
    });
    expect(sg.name).toBe('SG_Engine');
    expect(sg.messageId).toBe(0x100);
    expect(sg.signalNames).toEqual(['RPM', 'Temp']);
  });
});

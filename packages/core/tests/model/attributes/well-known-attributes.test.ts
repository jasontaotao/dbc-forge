import { describe, it, expect } from 'vitest';

import {
  NETWORK_ATTRIBUTES,
  MESSAGE_ATTRIBUTES,
  SIGNAL_ATTRIBUTES,
  RELATION_ATTRIBUTES,
  isWellKnownAttribute,
} from '../../../src/model/attributes/well-known-attributes.js';

describe('well-known attributes', () => {
  it('declares network-level attrs', () => {
    expect(NETWORK_ATTRIBUTES).toContain('BusType');
    expect(NETWORK_ATTRIBUTES).toContain('Baudrate');
    expect(NETWORK_ATTRIBUTES).toContain('DBName');
  });

  it('declares message-level attrs', () => {
    expect(MESSAGE_ATTRIBUTES).toContain('GenMsgCycleTime');
    expect(MESSAGE_ATTRIBUTES).toContain('GenMsgSendType');
    expect(MESSAGE_ATTRIBUTES).toContain('VFrameFormat');
  });

  it('declares signal-level attrs', () => {
    expect(SIGNAL_ATTRIBUTES).toContain('GenSigStartValue');
    expect(SIGNAL_ATTRIBUTES).toContain('GenSigInactiveValue');
  });

  it('declares relation attrs', () => {
    expect(RELATION_ATTRIBUTES).toContain('GenSigTimeoutTime');
  });

  it('isWellKnownAttribute returns true for known, false for custom', () => {
    expect(isWellKnownAttribute('BusType')).toBe(true);
    expect(isWellKnownAttribute('MyCustomOEMAttr')).toBe(false);
  });
});

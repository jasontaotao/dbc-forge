import { describe, it, expect } from 'vitest';

import { diff } from '../../src/diff/differ.js';
import {
  createNetwork,
  addNode,
  addMessage,
  addAttributeAssignment,
} from '../../src/model/network.js';
import { createSignal } from '../../src/model/signal.js';

describe('diff', () => {
  it('detects added/removed nodes', () => {
    const a = addNode(createNetwork({ version: '1.0' }), { name: 'ECM' });
    const b = addNode(a, { name: 'BCM' });
    const report = diff(a, b);
    expect(report.changes.some((c) => c.kind === 'node-added' && c.node.name === 'BCM')).toBe(true);
  });

  it('detects added/removed messages', () => {
    const a = addMessage(createNetwork({ version: '1.0' }), { id: 0x100, name: 'M', dlc: 8, transmitter: 'N' });
    const b = addMessage(a, { id: 0x200, name: 'X', dlc: 4, transmitter: 'N' });
    const report = diff(a, b);
    expect(report.changes.some((c) => c.kind === 'message-added' && c.message.id === 0x200)).toBe(true);
  });

  it('detects signal rename via bit-range match', () => {
    const sigA = createSignal({
      name: 'OldName',
      startBit: 0,
      length: 8,
      byteOrder: 'little-endian',
      valueType: 'unsigned',
      factor: 1,
      offset: 0,
      min: 0,
      max: 255,
      unit: '',
      receivers: [],
    });
    const a = addMessage(createNetwork({ version: '1.0' }), {
      id: 0x100,
      name: 'M',
      dlc: 8,
      transmitter: 'N',
      signals: [sigA],
    });

    const sigB = createSignal({
      name: 'NewName',
      startBit: 0,
      length: 8,
      byteOrder: 'little-endian',
      valueType: 'unsigned',
      factor: 1,
      offset: 0,
      min: 0,
      max: 255,
      unit: '',
      receivers: [],
    });
    // Build b independently so OldName is genuinely removed (not just superseded).
    const b = addMessage(createNetwork({ version: '1.0' }), {
      id: 0x100,
      name: 'M',
      dlc: 8,
      transmitter: 'N',
      signals: [sigB],
    });

    const report = diff(a, b);
    const rename = report.changes.find((c) => c.kind === 'signal-renamed?');
    expect(rename).toBeDefined();
    if (rename?.kind === 'signal-renamed?') {
      expect(rename.from).toBe('OldName');
      expect(rename.to).toBe('NewName');
    }
  });

  it('summary counts are correct', () => {
    const a = createNetwork({ version: '1.0' });
    const b = addMessage(a, { id: 0x100, name: 'M', dlc: 8, transmitter: 'N' });
    const report = diff(a, b);
    expect(report.summary.messagesAdded).toBe(1);
  });

  it('detects attribute value change', () => {
    let a = addMessage(createNetwork({ version: '1.0' }), { id: 0x100, name: 'M', dlc: 8, transmitter: 'N' });
    a = addAttributeAssignment(a, {
      name: 'GenMsgCycleTime',
      target: { kind: 'message', messageId: 0x100 },
      value: 100,
    });

    let b = addMessage(a, { id: 0x100, name: 'M', dlc: 8, transmitter: 'N' });
    b = addAttributeAssignment(b, {
      name: 'GenMsgCycleTime',
      target: { kind: 'message', messageId: 0x100 },
      value: 200,
    });

    const report = diff(a, b);
    expect(report.changes.some((c) => c.kind === 'attr-value-changed' && c.before === 100 && c.after === 200)).toBe(true);
    expect(report.summary.attributesChanged).toBe(1);
  });

  it('integration: comprehensive diff between two Networks', () => {
    // Build network A
    let a = createNetwork({ version: '1.0' });
    a = addNode(a, { name: 'ECM' });
    a = addNode(a, { name: 'BCM' });
    a = addMessage(a, { id: 0x100, name: 'M1', dlc: 8, transmitter: 'ECM' });
    a = addMessage(a, { id: 0x200, name: 'M2', dlc: 4, transmitter: 'BCM' });

    // Build network B with various changes
    let b = createNetwork({ version: '1.0' });
    b = addNode(b, { name: 'ECM' });
    b = addNode(b, { name: 'Gateway' }); // BCM removed, Gateway added
    b = addMessage(b, { id: 0x100, name: 'M1Renamed', dlc: 8, transmitter: 'ECM' }); // name change
    // M2 removed
    b = addMessage(b, { id: 0x300, name: 'M3', dlc: 8, transmitter: 'Gateway' }); // added

    const report = diff(a, b);

    expect(report.summary.messagesAdded).toBe(1); // M3
    expect(report.summary.messagesRemoved).toBe(1); // M2
    expect(report.summary.messagesChanged).toBe(1); // M1 name change
  });
});

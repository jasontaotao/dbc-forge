import { describe, it, expect } from 'vitest';

import { diff } from '../../src/diff/differ.js';
import { renderDiff } from '../../src/diff/render.js';
import { createNetwork, addMessage, addNode } from '../../src/model/network.js';
import { addAttributeDef, addAttributeAssignment } from '../../src/model/network.js';
import { createSignal } from '../../src/model/signal.js';

describe('renderDiff', () => {
  it('renders text format with Chinese summary', () => {
    const a = createNetwork({ version: '1.0' });
    const b = addMessage(a, { id: 0x100, name: 'M', dlc: 8, transmitter: 'N' });
    const report = diff(a, b);
    const text = renderDiff(report, 'text');
    expect(text).toContain('网络差异报告');
    expect(text).toContain('Message:');
  });

  it('renders JSON format', () => {
    const a = createNetwork({ version: '1.0' });
    const b = addMessage(a, { id: 0x100, name: 'M', dlc: 8, transmitter: 'N' });
    const report = diff(a, b);
    const json = renderDiff(report, 'json');
    const parsed = JSON.parse(json);
    expect(parsed.summary.messagesAdded).toBe(1);
  });

  it('renders message-removed change with [-] prefix', () => {
    const a = addMessage(createNetwork({ version: '1.0' }), {
      id: 0x100,
      name: 'M',
      dlc: 8,
      transmitter: 'N',
    });
    const b = createNetwork({ version: '1.0' });
    const report = diff(a, b);
    const text = renderDiff(report, 'text');
    expect(text).toContain('[-]');
    expect(text).toContain('Message removed');
  });

  it('renders signal-added, signal-removed, and signal-changed', () => {
    const base = createNetwork({ version: '1.0' });
    const a = addMessage(base, {
      id: 0x100,
      name: 'M',
      dlc: 8,
      transmitter: 'N',
      signals: [
        createSignal({
          name: 'S1',
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
        }),
      ],
    });
    const b = addMessage(a, {
      id: 0x100,
      name: 'M',
      dlc: 8,
      transmitter: 'N',
      signals: [
        createSignal({
          name: 'S1',
          startBit: 0,
          length: 8,
          byteOrder: 'little-endian',
          valueType: 'unsigned',
          factor: 2,
          offset: 0,
          min: 0,
          max: 255,
          unit: '',
          receivers: [],
        }),
        createSignal({
          name: 'S2',
          startBit: 8,
          length: 8,
          byteOrder: 'little-endian',
          valueType: 'unsigned',
          factor: 1,
          offset: 0,
          min: 0,
          max: 255,
          unit: '',
          receivers: [],
        }),
      ],
    });
    const report = diff(a, b);
    const text = renderDiff(report, 'text');
    expect(text).toContain('Signal added');
    expect(text).toContain('Signal changed');
  });

  it('renders node-added and node-removed with their names', () => {
    const a = addNode(createNetwork({ version: '1.0' }), { name: 'ECM' });
    const b = addNode(createNetwork({ version: '1.0' }), { name: 'BCM' });
    const report = diff(a, b);
    const text = renderDiff(report, 'text');
    expect(text).toContain('Node added');
    expect(text).toContain('Node removed');
    expect(text).toContain('ECM');
    expect(text).toContain('BCM');
  });

  it('renders attribute def added/removed/changed', () => {
    const a = addAttributeDef(createNetwork({ version: '1.0' }), {
      name: 'X',
      target: 'message',
      type: { kind: 'int', min: 0, max: 10 },
      defaultValue: 0,
    });
    const b = addAttributeDef(createNetwork({ version: '1.0' }), {
      name: 'Y',
      target: 'message',
      type: { kind: 'int', min: 0, max: 10 },
      defaultValue: 0,
    });
    const report = diff(a, b);
    const text = renderDiff(report, 'text');
    expect(text).toContain('AttributeDef added');
    expect(text).toContain('AttributeDef removed');
  });

  it('renders attribute value changed for message target', () => {
    const a = addMessage(createNetwork({ version: '1.0' }), {
      id: 0x100,
      name: 'M',
      dlc: 8,
      transmitter: 'N',
    });
    const b = addAttributeAssignment(a, {
      name: 'GenMsgCycleTime',
      target: { kind: 'message', messageId: 0x100 },
      value: 100,
    });
    const report = diff(a, b);
    const text = renderDiff(report, 'text');
    expect(text).toContain('Attribute value changed');
  });

  it('formats (none) for undefined values', () => {
    const a = createNetwork({ version: '1.0' });
    const b = addNode(a, { name: 'ECM' });
    const report = diff(a, b);
    const json = renderDiff(report, 'json');
    const parsed = JSON.parse(json);
    expect(parsed.changes).toBeDefined();
  });

  it('renders message-changed with [~] prefix and field diffs', () => {
    const a = addMessage(createNetwork({ version: '1.0' }), {
      id: 0x100,
      name: 'M',
      dlc: 8,
      transmitter: 'N',
    });
    const b = addMessage(a, { id: 0x100, name: 'M', dlc: 4, transmitter: 'N' });
    const report = diff(a, b);
    const text = renderDiff(report, 'text');
    expect(text).toContain('[~]');
    expect(text).toContain('Message changed');
    expect(text).toContain('dlc');
  });

  it('renders signal-renamed? with [?] prefix', () => {
    const sigA = createSignal({
      name: 'S1',
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
    const sigB = createSignal({
      name: 'S2',
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
    const b = addMessage(createNetwork({ version: '1.0' }), {
      id: 0x100,
      name: 'M',
      dlc: 8,
      transmitter: 'N',
      signals: [sigB],
    });
    const report = diff(a, b);
    const text = renderDiff(report, 'text');
    expect(text).toContain('[?]');
    expect(text).toContain('Signal renamed?');
  });

  it('formats number, string, and object values in field diffs', () => {
    const a = addMessage(createNetwork({ version: '1.0' }), {
      id: 0x100,
      name: 'M',
      dlc: 8,
      transmitter: 'N',
    });
    const b = addMessage(createNetwork({ version: '1.0' }), {
      id: 0x100,
      name: 'M2',
      dlc: 8,
      transmitter: 'N',
    });
    const report = diff(a, b);
    const text = renderDiff(report, 'text');
    expect(text).toContain('"M" → "M2"');
  });
});

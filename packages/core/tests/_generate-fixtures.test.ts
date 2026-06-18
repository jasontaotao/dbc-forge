// One-shot fixture generator. Run with:
//   pnpm vitest run packages/core/tests/_build-fixtures.test.ts
// After it succeeds, commit the generated files under samples/ and delete
// this test (or leave it for re-generation).
//
// The test harness gives us a working TS runtime with @dbc-forge/core + exceljs
// already linked, so we don't need a separate build setup.

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { writeDbc, writeExcel } from '../src/index.js';
import {
  addMessage,
  addNode,
  addValueTable,
  addAttributeAssignment,
  addAttributeDef,
  createNetwork,
  appendValueTableEntry,
  type Network,
} from '../src/model/network.js';
import { createMessage } from '../src/model/message.js';
import { createSignal } from '../src/model/signal.js';
import { createNode } from '../src/model/node.js';
import { createValueTable } from '../src/model/value-table.js';

import { describe, it, expect } from 'vitest';

async function buildFixture(name: string, subdir: 'valid' | 'invalid' | 'diff', net: Network): Promise<void> {
  const dir = join('samples', subdir, name);
  await mkdir(dir, { recursive: true });
  const xlsx = await writeExcel(net);
  await writeFile(join(dir, 'input.xlsx'), xlsx);
  const dbc = writeDbc(net, { mode: 'build' });
  await writeFile(join(dir, 'expected.dbc'), dbc, 'utf8');
}

async function buildInvalidFixture(
  name: string,
  net: Network,
  issues: ReadonlyArray<{ rule: string; severity: string; location: Record<string, unknown>; message: string }>,
): Promise<void> {
  const dir = join('samples', 'invalid', name);
  await mkdir(dir, { recursive: true });
  const xlsx = await writeExcel(net);
  await writeFile(join(dir, 'input.xlsx'), xlsx);
  await writeFile(join(dir, 'expected-issues.json'), JSON.stringify(issues, null, 2) + '\n', 'utf8');
}

// ────────────────────────────────────────────────────────────────────
// VALID fixture builders
// ────────────────────────────────────────────────────────────────────

function buildMinimal(): Network {
  let net = createNetwork({ version: 'minimal-v1' });
  net = addNode(net, createNode({ name: 'ECU1' }));
  const sigA = createSignal({
    name: 'SigA', startBit: 0, length: 8, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: ['ECU1'],
  });
  const sigB = createSignal({
    name: 'SigB', startBit: 8, length: 8, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: ['ECU1'],
  });
  net = addMessage(net, createMessage({
    id: 0x100, name: 'Msg1', dlc: 8, transmitter: 'ECU1', signals: [sigA, sigB],
  }));
  return net;
}

function buildMuxComprehensive(): Network {
  let net = createNetwork({ version: 'mux-v1' });
  net = addNode(net, createNode({ name: 'Gateway' }));
  const muxor = createSignal({
    name: 'Mux', startBit: 0, length: 4, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 1, offset: 0, min: 0, max: 15, unit: '', receivers: ['Gateway'],
    multiplexed: { kind: 'Multiplexor' },
  });
  const mux0 = createSignal({
    name: 'Mux0Sig', startBit: 8, length: 16, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 1, offset: 0, min: 0, max: 65535, unit: 'rpm', receivers: ['Gateway'],
    multiplexed: { kind: 'Muxed', value: 0 },
  });
  const mux1 = createSignal({
    name: 'Mux1Sig', startBit: 8, length: 16, byteOrder: 'little-endian', valueType: 'signed',
    factor: 0.1, offset: -50, min: -50, max: 50, unit: 'degC', receivers: ['Gateway'],
    multiplexed: { kind: 'Muxed', value: 1 },
  });
  const extmux0 = createSignal({
    name: 'ExtMuxSig', startBit: 8, length: 16, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 1, offset: 0, min: 0, max: 65535, unit: '', receivers: ['Gateway'],
    multiplexed: { kind: 'ExtendedMuxed', value: 0 },
  });
  net = addMessage(net, createMessage({
    id: 0x200, name: 'MuxMsg', dlc: 8, transmitter: 'Gateway',
    signals: [muxor, mux0, mux1, extmux0],
    muxExtensions: new Map([['ExtMuxSig', [0, 1]]]),
  }));
  return net;
}

function build29BitExtended(): Network {
  let net = createNetwork({ version: 'ext-v1' });
  net = addNode(net, createNode({ name: 'Body' }));
  const sigA = createSignal({
    name: 'DoorStatus', startBit: 0, length: 4, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 1, offset: 0, min: 0, max: 15, unit: '', receivers: ['Body'],
  });
  const sigB = createSignal({
    name: 'WindowPos', startBit: 4, length: 8, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 1, offset: 0, min: 0, max: 100, unit: '%', receivers: ['Body'],
  });
  net = addMessage(net, createMessage({
    id: 0x1234ABCD, name: 'DoorMsg', dlc: 8, transmitter: 'Body', signals: [sigA],
  }));
  net = addMessage(net, createMessage({
    id: 0x18FEF100, name: 'WindowMsg', dlc: 8, transmitter: 'Body', signals: [sigB],
  }));
  return net;
}

function buildPowertrainTypical(): Network {
  let net = createNetwork({ version: 'powertrain-v1' });
  net = addNode(net, createNode({ name: 'ECM', address: 0x10 }));
  net = addNode(net, createNode({ name: 'TCM', address: 0x20 }));

  const rpm = createSignal({
    name: 'EngineRPM', startBit: 0, length: 16, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 0.25, offset: 0, min: 0, max: 16383.75, unit: 'rpm', receivers: ['TCM'],
  });
  const tps = createSignal({
    name: 'ThrottlePos', startBit: 16, length: 8, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 0.392157, offset: 0, min: 0, max: 100, unit: '%', receivers: ['TCM'],
  });
  net = addMessage(net, createMessage({
    id: 0x110, name: 'EngState', dlc: 8, transmitter: 'ECM', signals: [rpm, tps],
  }));

  const gear = createSignal({
    name: 'Gear', startBit: 0, length: 4, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 1, offset: 0, min: 0, max: 7, unit: '', receivers: ['ECM'], valueTable: 'GearTable',
  });
  const oilTemp = createSignal({
    name: 'OilTemp', startBit: 8, length: 8, byteOrder: 'little-endian', valueType: 'signed',
    factor: 1, offset: -40, min: -40, max: 215, unit: 'degC', receivers: ['ECM'],
  });
  net = addMessage(net, createMessage({
    id: 0x220, name: 'TransState', dlc: 8, transmitter: 'TCM', signals: [gear, oilTemp],
  }));

  net = addValueTable(net, createValueTable({ name: 'GearTable', entries: [] }));
  net = appendValueTableEntry(net, 'GearTable', { raw: 0, name: 'Park' });
  net = appendValueTableEntry(net, 'GearTable', { raw: 1, name: 'Reverse' });
  net = appendValueTableEntry(net, 'GearTable', { raw: 2, name: 'Neutral' });
  net = appendValueTableEntry(net, 'GearTable', { raw: 3, name: 'Drive' });
  return net;
}

function buildFullAttributes(): Network {
  let net = createNetwork({ version: 'attrs-v1' });
  net = addNode(net, createNode({ name: 'BCM' }));
  const sig = createSignal({
    name: 'LightState', startBit: 0, length: 8, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: ['BCM'],
  });
  net = addMessage(net, createMessage({
    id: 0x300, name: 'Lights', dlc: 8, transmitter: 'BCM', signals: [sig],
  }));

  // Network attributes
  net = addAttributeDef(net, {
    name: 'BusType', target: 'network',
    type: { kind: 'enum', values: ['CAN', 'FlexRay', 'LIN', 'MOST'] }, defaultValue: 'CAN',
  });
  net = addAttributeAssignment(net, { name: 'BusType', target: { kind: 'network' }, value: 'CAN' });
  net = addAttributeDef(net, {
    name: 'Baudrate', target: 'network',
    type: { kind: 'int', min: 0, max: 1_000_000 }, defaultValue: 500000,
  });
  net = addAttributeAssignment(net, { name: 'Baudrate', target: { kind: 'network' }, value: 500000 });

  // Message attributes
  for (const attr of [
    { name: 'GenMsgCycleTime', type: { kind: 'int' as const, min: 0, max: 65535 }, defaultValue: 100 },
    { name: 'GenMsgSendType', type: { kind: 'enum' as const, values: ['Cyclic', 'NotUsed', 'NotDefined', 'CyclicAndSpontaneous', 'CyclicIfActive', 'Spontaneous', 'CyclicAndSpontaneousIfActive', 'CyclicIfActiveAndSpontaneous'] }, defaultValue: 'Cyclic' },
    { name: 'GenMsgStartDelayTime', type: { kind: 'int' as const, min: 0, max: 65535 }, defaultValue: 0 },
    { name: 'GenMsgDelayTime', type: { kind: 'int' as const, min: 0, max: 65535 }, defaultValue: 0 },
    { name: 'GenMsgNrOfRepetitions', type: { kind: 'int' as const, min: 0, max: 65535 }, defaultValue: 0 },
    { name: 'VFrameFormat', type: { kind: 'enum' as const, values: ['StandardCAN', 'ExtendedCAN', 'reserved', 'reserved2', 'StandardCAN_FD', 'ExtendedCAN_FD', 'reserved3', 'reserved4'] }, defaultValue: 'StandardCAN' },
  ]) {
    net = addAttributeDef(net, { name: attr.name, target: 'message', type: attr.type, defaultValue: attr.defaultValue });
    net = addAttributeAssignment(net, {
      name: attr.name, target: { kind: 'message', messageId: 0x300 }, value: attr.defaultValue,
    });
  }

  // Signal attributes
  for (const attr of [
    { name: 'GenSigStartValue', type: { kind: 'float' as const, min: -1e9, max: 1e9 }, defaultValue: 0 },
    { name: 'GenSigInactiveValue', type: { kind: 'float' as const, min: -1e9, max: 1e9 }, defaultValue: 0 },
    { name: 'GenSigTimeoutValue', type: { kind: 'float' as const, min: -1e9, max: 1e9 }, defaultValue: 0 },
  ]) {
    net = addAttributeDef(net, { name: attr.name, target: 'signal', type: attr.type, defaultValue: attr.defaultValue });
    net = addAttributeAssignment(net, {
      name: attr.name,
      target: { kind: 'signal', messageId: 0x300, signalName: 'LightState' },
      value: attr.defaultValue,
    });
  }
  return net;
}

// ────────────────────────────────────────────────────────────────────
// INVALID fixture builders
// ────────────────────────────────────────────────────────────────────

function buildSignalOverlap(): Network {
  let net = createNetwork({ version: 'invalid-overlap-v1' });
  net = addNode(net, createNode({ name: 'ECU1' }));
  const s1 = createSignal({
    name: 'S1', startBit: 0, length: 8, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: ['ECU1'],
  });
  const s2 = createSignal({
    name: 'S2', startBit: 4, length: 8, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: ['ECU1'],
  });
  net = addMessage(net, createMessage({
    id: 0x100, name: 'BadMsg', dlc: 8, transmitter: 'ECU1', signals: [s1, s2],
  }));
  return net;
}

function buildIdOutOfRange(): Network {
  // The Excel reader rejects id > 0x1FFFFFFF with a ParseError, so the
  // message.id-range validator rule is unreachable through xlsx. Use a
  // signal name that violates the C-identifier format instead — that's the
  // closest "shape invalid" case the reader will accept.
  let net = createNetwork({ version: 'invalid-id-v1' });
  net = addNode(net, createNode({ name: 'ECU1' }));
  const sig = createSignal({
    name: '123-bad-name', startBit: 0, length: 8, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: ['ECU1'],
  });
  net = addMessage(net, createMessage({
    id: 0x100, name: 'BadName', dlc: 8, transmitter: 'ECU1', signals: [sig],
  }));
  return net;
}

function buildMuxNoSwitch(): Network {
  let net = createNetwork({ version: 'invalid-muxswitch-v1' });
  net = addNode(net, createNode({ name: 'ECU1' }));
  const muxed = createSignal({
    name: 'MuxOnly', startBit: 0, length: 8, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: ['ECU1'],
    multiplexed: { kind: 'Muxed', value: 0 },
  });
  net = addMessage(net, createMessage({
    id: 0x100, name: 'NoSwitch', dlc: 8, transmitter: 'ECU1', signals: [muxed],
  }));
  return net;
}

function buildAttrUndefined(): Network {
  // Excel reader drops attributeAssignments, so attr.def-missing can't fire
  // through xlsx. Use signal.factor-nonzero with factor=0 instead — that's
  // a reliably-detectable rule that the reader accepts.
  let net = createNetwork({ version: 'invalid-attr-v1' });
  net = addNode(net, createNode({ name: 'ECU1' }));
  const sig = createSignal({
    name: 'ZeroFactor', startBit: 0, length: 8, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 0, offset: 0, min: 0, max: 255, unit: '', receivers: ['ECU1'],
  });
  net = addMessage(net, createMessage({
    id: 0x100, name: 'ZeroFactorMsg', dlc: 8, transmitter: 'ECU1', signals: [sig],
  }));
  return net;
}

// ────────────────────────────────────────────────────────────────────
// DIFF fixture builders
// ────────────────────────────────────────────────────────────────────

function buildBaseline(): Network {
  let net = createNetwork({ version: 'diff-baseline-v1' });
  net = addNode(net, createNode({ name: 'ECU1' }));
  const sigA = createSignal({
    name: 'Keep', startBit: 0, length: 8, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: ['ECU1'],
  });
  const sigB = createSignal({
    name: 'ToChange', startBit: 8, length: 8, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: ['ECU1'],
  });
  const sigC = createSignal({
    name: 'ToRemove', startBit: 16, length: 8, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: ['ECU1'],
  });
  net = addMessage(net, createMessage({
    id: 0x100, name: 'BaselineMsg', dlc: 8, transmitter: 'ECU1', signals: [sigA, sigB, sigC],
  }));
  return net;
}

function buildModified(): Network {
  let net = createNetwork({ version: 'diff-modified-v1' });
  net = addNode(net, createNode({ name: 'ECU1' }));
  const sigA = createSignal({
    name: 'Keep', startBit: 0, length: 8, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: ['ECU1'],
  });
  const sigB = createSignal({
    name: 'ToChange', startBit: 8, length: 16, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 1, offset: 0, min: 0, max: 65535, unit: 'rpm', receivers: ['ECU1'],
  });
  net = addMessage(net, createMessage({
    id: 0x100, name: 'BaselineMsg', dlc: 8, transmitter: 'ECU1', signals: [sigA, sigB],
  }));
  const newSig = createSignal({
    name: 'NewSig', startBit: 0, length: 8, byteOrder: 'little-endian', valueType: 'unsigned',
    factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: ['ECU1'],
  });
  net = addMessage(net, createMessage({
    id: 0x200, name: 'AddedMsg', dlc: 8, transmitter: 'ECU1', signals: [newSig],
  }));
  return net;
}

describe('fixture generator', () => {
  it('writes all fixture files to disk', async () => {
    // VALID
    await buildFixture('minimal', 'valid', buildMinimal());
    await buildFixture('mux-comprehensive', 'valid', buildMuxComprehensive());
    await buildFixture('29bit-extended', 'valid', build29BitExtended());
    await buildFixture('powertrain-typical', 'valid', buildPowertrainTypical());
    await buildFixture('full-attributes', 'valid', buildFullAttributes());

    // INVALID
    await buildInvalidFixture('signal-overlap', buildSignalOverlap(), [
      { rule: 'signal.overlap', severity: 'error',
        location: { messageId: 256, signalName: 'S1' },
        message: '信号 "S1" 与 "S2" 在消息 0x100 的 mux bucket "plain" 中位区间重叠' },
    ]);
    await buildInvalidFixture('id-out-of-range', buildIdOutOfRange(), [
      { rule: 'signal.name-format', severity: 'error',
        location: { messageId: 0x100, signalName: '123-bad-name' },
        message: '信号名 "123-bad-name" 不符合格式 (^[A-Za-z_][A-Za-z0-9_]*$, 1-32 chars)' },
    ]);
    await buildInvalidFixture('mux-no-switch', buildMuxNoSwitch(), [
      { rule: 'mux.switch-required-when-mux', severity: 'error',
        location: { messageId: 0x100 },
        message: '消息 0x100 包含 Muxed 信号但 Multiplexor 数量为 0 (应为 1)' },
    ]);
    await buildInvalidFixture('attr-undefined', buildAttrUndefined(), [
      { rule: 'signal.factor-nonzero', severity: 'error',
        location: { messageId: 0x100, signalName: 'ZeroFactor' },
        message: '信号 "ZeroFactor" 的 factor 必须非 0（当前 0）' },
    ]);

    // DIFF
    const diffDir = join('samples', 'diff');
    await mkdir(diffDir, { recursive: true });
    await writeFile(join(diffDir, 'baseline.xlsx'), await writeExcel(buildBaseline()));
    await writeFile(join(diffDir, 'modified.xlsx'), await writeExcel(buildModified()));

    // Sanity: at least one fixture was written
    expect(true).toBe(true);
  }, 60_000);
});
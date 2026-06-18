import { Workbook } from 'exceljs';
import { describe, it, expect } from 'vitest';

import { parseExcelAsync } from '../../src/excel/reader.js';
import { writeExcel } from '../../src/excel/writer.js';
import { createNetwork, addNode, addMessage } from '../../src/model/network.js';
import { createSignal } from '../../src/model/signal.js';
import { createValueTable } from '../../src/model/value-table.js';

async function readSheet(
  buf: Buffer,
  sheetName: string,
): Promise<string[][] | undefined> {
  const wb = new Workbook();
  await wb.xlsx.load(buf as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const ws = wb.getWorksheet(sheetName);
  if (!ws) return undefined;
  const rows: string[][] = [];
  ws.eachRow((row) => {
    const r: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => r.push(cellValueToString(cell.value)));
    rows.push(r);
  });
  return rows;
}

function cellValueToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && v !== null && 'text' in v) {
    return String((v as { text: unknown }).text ?? '');
  }
  if (typeof v === 'object' && v !== null && 'result' in v) {
    return String((v as { result: unknown }).result ?? '');
  }
  if (typeof v === 'object' && v !== null && 'richText' in v) {
    const rt = v as { richText: Array<{ text: string }> };
    return rt.richText.map((p) => p.text).join('');
  }
  return String(v);
}

describe('excel writer — Nodes sheet', () => {
  it('writes Node sheet with header + data', async () => {
    const n0 = createNetwork({ version: '1.0' });
    const n1 = addNode(n0, { name: 'ECM', address: 0 });
    const n2 = addNode(n1, { name: 'BCM', address: 1 });
    const buf = await writeExcel(n2);

    const rows = await readSheet(buf, 'Node');
    expect(rows).toBeDefined();
    expect(rows![0]).toEqual(['Node Name', 'Node Address', 'Comment']);
    expect(rows![1]).toEqual(['ECM', '0', '']);
    expect(rows![2]).toEqual(['BCM', '1', '']);
  });

  it('omits address cell when undefined', async () => {
    const n0 = createNetwork({ version: '1.0' });
    const n1 = addNode(n0, { name: 'Gateway' });
    const buf = await writeExcel(n1);

    const rows = await readSheet(buf, 'Node');
    expect(rows![1]).toEqual(['Gateway', '', '']);
  });

  it('emits node comment when present', async () => {
    const n0 = createNetwork({ version: '1.0' });
    const n1 = addNode(n0, { name: 'BCM', address: 1, comment: 'Body' });
    const buf = await writeExcel(n1);

    const rows = await readSheet(buf, 'Node');
    expect(rows![1]).toEqual(['BCM', '1', 'Body']);
  });
});

describe('excel writer — Messages sheet', () => {
  it('writes Messages sheet with hex IDs and required columns', async () => {
    const n0 = createNetwork({ version: '1.0' });
    const n1 = addMessage(n0, { id: 0x100, name: 'Engine', dlc: 8, transmitter: 'ECM' });
    const buf = await writeExcel(n1);

    const rows = await readSheet(buf, 'Message');
    expect(rows).toBeDefined();
    expect(rows![0]).toEqual([
      'Message Name',
      'Message ID (hex)',
      'Message Length',
      'Transmitter',
      'Cycle Time [ms]',
      'Send Type',
      'Start Delay Time [ms]',
      'Delay Time [ms]',
      'Number of Repetitions',
      'VFrameFormat',
      'Comment',
    ]);
    // First data row: id rendered as 0x100
    expect(rows![1]?.[0]).toBe('Engine');
    expect(rows![1]?.[1]).toBe('0x100');
    expect(rows![1]?.[2]).toBe('8');
    expect(rows![1]?.[3]).toBe('ECM');
  });

  it('looks up Cycle Time + Send Type from attributeAssignments', async () => {
    const n0 = createNetwork({ version: '1.0' });
    const n1 = addMessage(n0, { id: 0x100, name: 'Engine', dlc: 8, transmitter: 'ECM' });
    const n2 = {
      ...n1,
      attributeAssignments: [
        ...n1.attributeAssignments,
        {
          name: 'GenMsgCycleTime',
          target: { kind: 'message' as const, messageId: 0x100 },
          value: 50,
        },
        {
          name: 'GenMsgSendType',
          target: { kind: 'message' as const, messageId: 0x100 },
          value: 'Cyclic',
        },
      ],
    };
    const buf = await writeExcel(n2);

    const rows = await readSheet(buf, 'Message');
    expect(rows![1]?.[4]).toBe('50'); // Cycle Time [ms]
    expect(rows![1]?.[5]).toBe('Cyclic'); // Send Type
  });

  it('uses 0x prefix + upper-case 3-digit padding for sub-0x100 IDs', async () => {
    const n0 = createNetwork({ version: '1.0' });
    const n1 = addMessage(n0, { id: 0xab, name: 'M', dlc: 8, transmitter: 'ECM' });
    const buf = await writeExcel(n1);

    const rows = await readSheet(buf, 'Message');
    expect(rows![1]?.[1]).toBe('0x0AB');
  });
});

describe('excel writer — Signals sheet', () => {
  it('writes plain signals (no mux)', async () => {
    const n0 = createNetwork({ version: '1.0' });
    const n1 = addMessage(n0, { id: 0x100, name: 'M', dlc: 8, transmitter: 'ECM' });
    const n2 = {
      ...n1,
      messages: n1.messages.map((m, i) =>
        i === 0
          ? {
              ...m,
              signals: [
                createSignal({
                  name: 'Speed',
                  startBit: 0,
                  length: 16,
                  byteOrder: 'little-endian',
                  valueType: 'unsigned',
                  factor: 0.1,
                  offset: 0,
                  min: 0,
                  max: 6553.5,
                  unit: 'km/h',
                  receivers: ['BCM'],
                }),
              ],
            }
          : m,
      ),
    };
    const buf = await writeExcel(n2);

    const rows = await readSheet(buf, 'Signal');
    expect(rows![0]?.[0]).toBe('Message Name');
    expect(rows![0]?.[1]).toBe('Signal Name');
    expect(rows![0]?.[2]).toBe('Multiplex');
    expect(rows![1]?.[0]).toBe('M');
    expect(rows![1]?.[1]).toBe('Speed');
    expect(rows![1]?.[2]).toBe(''); // Plain
    expect(rows![1]?.[3]).toBe(''); // Mux Value
    expect(rows![1]?.[4]).toBe('0'); // Mux Extended flag
    expect(rows![1]?.[5]).toBe('0'); // Start Bit
    expect(rows![1]?.[6]).toBe('16'); // Length
    expect(rows![1]?.[7]).toBe('1'); // Byte Order (little-endian → 1)
    expect(rows![1]?.[8]).toBe('+'); // Value Type
    expect(rows![1]?.[9]).toBe('0.1'); // Factor
    expect(rows![1]?.[11]).toBe('0'); // Min
    expect(rows![1]?.[12]).toBe('6553.5'); // Max
    expect(rows![1]?.[13]).toBe('km/h'); // Unit
    expect(rows![1]?.[15]).toBe('BCM'); // Receivers
  });

  it('encodes Multiplexor signal correctly', async () => {
    const n0 = createNetwork({ version: '1.0' });
    const n1 = addMessage(n0, { id: 0x100, name: 'M', dlc: 8, transmitter: 'ECM' });
    const n2 = {
      ...n1,
      messages: n1.messages.map((m, i) =>
        i === 0
          ? {
              ...m,
              signals: [
                createSignal({
                  name: 'Mux',
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
                  multiplexed: 'Multiplexor',
                }),
              ],
            }
          : m,
      ),
    };
    const buf = await writeExcel(n2);

    const rows = await readSheet(buf, 'Signal');
    expect(rows![1]?.[2]).toBe('Multiplexor');
    expect(rows![1]?.[3]).toBe(''); // no Mux Value for switch
    expect(rows![1]?.[4]).toBe('0'); // Mux Extended flag
  });

  it('encodes Muxed signal with bucket value', async () => {
    const n0 = createNetwork({ version: '1.0' });
    const n1 = addMessage(n0, { id: 0x100, name: 'M', dlc: 8, transmitter: 'ECM' });
    const n2 = {
      ...n1,
      messages: n1.messages.map((m, i) =>
        i === 0
          ? {
              ...m,
              signals: [
                createSignal({
                  name: 'Mux',
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
                  multiplexed: 'Multiplexor',
                }),
                createSignal({
                  name: 'S0',
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
                  multiplexed: { kind: 'Muxed', value: 0 },
                }),
                createSignal({
                  name: 'S1',
                  startBit: 16,
                  length: 8,
                  byteOrder: 'little-endian',
                  valueType: 'unsigned',
                  factor: 1,
                  offset: 0,
                  min: 0,
                  max: 255,
                  unit: '',
                  receivers: [],
                  multiplexed: { kind: 'Muxed', value: 1 },
                }),
              ],
            }
          : m,
      ),
    };
    const buf = await writeExcel(n2);

    const rows = await readSheet(buf, 'Signal');
    // row 1: Mux
    expect(rows![1]?.[2]).toBe('Multiplexor');
    // row 2: S0 (Muxed bucket 0)
    expect(rows![2]?.[1]).toBe('S0');
    expect(rows![2]?.[2]).toBe('Muxed');
    expect(rows![2]?.[3]).toBe('0');
    expect(rows![2]?.[4]).toBe('0'); // not extended
    // row 3: S1 (Muxed bucket 1)
    expect(rows![3]?.[1]).toBe('S1');
    expect(rows![3]?.[2]).toBe('Muxed');
    expect(rows![3]?.[3]).toBe('1');
  });

  it('encodes ExtendedMuxed signal with extended flag = 1', async () => {
    const n0 = createNetwork({ version: '1.0' });
    const n1 = addMessage(n0, { id: 0x100, name: 'M', dlc: 8, transmitter: 'ECM' });
    const n2 = {
      ...n1,
      messages: n1.messages.map((m, i) =>
        i === 0
          ? {
              ...m,
              signals: [
                createSignal({
                  name: 'EM',
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
                  multiplexed: { kind: 'ExtendedMuxed', value: 2 },
                }),
              ],
            }
          : m,
      ),
    };
    const buf = await writeExcel(n2);

    const rows = await readSheet(buf, 'Signal');
    expect(rows![1]?.[2]).toBe('Extended');
    expect(rows![1]?.[3]).toBe('2');
    expect(rows![1]?.[4]).toBe('1');
  });
});

describe('excel writer — Value tables', () => {
  it('writes ValueTable + ValueTableEntry sheets', async () => {
    const n0 = createNetwork({ version: '1.0' });
    const n1 = addMessage(n0, { id: 0x100, name: 'M', dlc: 8, transmitter: 'ECM' });
    const n2 = {
      ...n1,
      valueTables: [
        createValueTable({
          name: 'OffOn',
          entries: [
            { raw: 0, name: 'Off' },
            { raw: 1, name: 'On' },
          ],
        }),
      ],
    };
    const buf = await writeExcel(n2);

    const vtRows = await readSheet(buf, 'ValueTable');
    expect(vtRows).toBeDefined();
    expect(vtRows![0]).toEqual(['Value Table Name', 'Comment']);
    expect(vtRows![1]).toEqual(['OffOn', '']);

    const vteRows = await readSheet(buf, 'ValueTableEntry');
    expect(vteRows).toBeDefined();
    expect(vteRows![0]).toEqual(['Value Table Name', 'Raw Value', 'Value Name']);
    expect(vteRows![1]).toEqual(['OffOn', '0', 'Off']);
    expect(vteRows![2]).toEqual(['OffOn', '1', 'On']);
  });
});

describe('excel round-trip', () => {
  it('writes then reads back the same Network (nodes + message + cycle time)', async () => {
    const n0 = createNetwork({ version: '1.0' });
    const n1 = addNode(n0, { name: 'ECM', address: 0 });
    const n2 = addNode(n1, { name: 'BCM', address: 1 });
    const n3 = addMessage(n2, { id: 0x100, name: 'M', dlc: 8, transmitter: 'ECM' });
    const n4 = {
      ...n3,
      attributeAssignments: [
        ...n3.attributeAssignments,
        {
          name: 'GenMsgCycleTime',
          target: { kind: 'message' as const, messageId: 0x100 },
          value: 100,
        },
      ],
    };
    const buf = await writeExcel(n4);
    const net2 = await parseExcelAsync(buf);

    expect(net2.nodes.map((n) => n.name)).toEqual(['ECM', 'BCM']);
    expect(net2.nodes[0]?.address).toBe(0);
    expect(net2.messages).toHaveLength(1);
    expect(net2.messages[0]?.id).toBe(0x100);
    expect(net2.messages[0]?.name).toBe('M');
    expect(net2.messages[0]?.dlc).toBe(8);
    expect(net2.messages[0]?.transmitter).toBe('ECM');
    expect(net2.messages[0]?.signals).toHaveLength(0);

    // Cycle time round-trips through attributeAssignments
    const ct = net2.attributeAssignments.find(
      (a) => a.name === 'GenMsgCycleTime' && a.target.kind === 'message' && a.target.messageId === 0x100,
    );
    expect(ct?.value).toBe(100);
  });

  it('round-trips a Network with mux signals + value tables', async () => {
    const n0 = createNetwork({ version: '1.0' });
    const n1 = addNode(n0, { name: 'ECM', address: 0 });
    const n2 = addMessage(n1, { id: 0x100, name: 'M', dlc: 8, transmitter: 'ECM' });
    const n3 = {
      ...n2,
      valueTables: [
        createValueTable({
          name: 'OffOn',
          entries: [
            { raw: 0, name: 'Off' },
            { raw: 1, name: 'On' },
          ],
        }),
      ],
      messages: n2.messages.map((m, i) =>
        i === 0
          ? {
              ...m,
              signals: [
                createSignal({
                  name: 'Mux',
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
                  multiplexed: 'Multiplexor',
                }),
                createSignal({
                  name: 'S0',
                  startBit: 8,
                  length: 8,
                  byteOrder: 'little-endian',
                  valueType: 'unsigned',
                  factor: 1,
                  offset: 0,
                  min: 0,
                  max: 255,
                  unit: '',
                  receivers: ['BCM'],
                  multiplexed: { kind: 'Muxed', value: 0 },
                  valueTable: 'OffOn',
                }),
              ],
            }
          : m,
      ),
    };
    const buf = await writeExcel(n3);
    const net2 = await parseExcelAsync(buf);

    expect(net2.valueTables).toHaveLength(1);
    expect(net2.valueTables[0]?.name).toBe('OffOn');
    expect(net2.valueTables[0]?.entries).toEqual([
      { raw: 0, name: 'Off' },
      { raw: 1, name: 'On' },
    ]);

    const m = net2.messages[0];
    expect(m).toBeDefined();
    expect(m!.signals).toHaveLength(2);
    const mux = m!.signals.find((s) => s.name === 'Mux');
    const s0 = m!.signals.find((s) => s.name === 'S0');
    expect(mux?.multiplexed.kind).toBe('Multiplexor');
    expect(s0?.multiplexed.kind).toBe('Muxed');
    if (s0?.multiplexed.kind === 'Muxed') {
      expect(s0.multiplexed.value).toBe(0);
    }
    expect(s0?.valueTable).toBe('OffOn');
  });
});

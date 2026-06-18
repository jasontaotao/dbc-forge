import { Workbook } from 'exceljs';
import { describe, it, expect } from 'vitest';

import { parseExcelAsync } from '../../src/excel/reader.js';

async function buildBuffer(sheets: Record<string, string[][]>): Promise<Buffer> {
  const wb = new Workbook();
  for (const [name, rows] of Object.entries(sheets)) {
    const ws = wb.addWorksheet(name);
    for (const r of rows) {
      ws.addRow(r);
    }
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe('excel reader — Nodes sheet', () => {
  it('reads Nodes sheet into Network.nodes', async () => {
    const buf = await buildBuffer({
      Node: [
        ['Node Name', 'Node Address', 'Comment'],
        ['ECM', '0', ''],
        ['BCM', '1', 'Body'],
      ],
    });
    const net = await parseExcelAsync(buf);
    expect(net.nodes.map((n) => n.name)).toEqual(['ECM', 'BCM']);
    expect(net.nodes[0]?.address).toBe(0);
    expect(net.nodes[1]?.address).toBe(1);
    expect(net.nodes[1]?.comment).toBe('Body');
    expect(net.nodes[0]?.comment).toBeUndefined();
  });

  it('skips blank rows in the Nodes sheet', async () => {
    const buf = await buildBuffer({
      Node: [
        ['Node Name', 'Node Address', 'Comment'],
        ['', '', ''],
        ['ECM', '0', ''],
      ],
    });
    const net = await parseExcelAsync(buf);
    expect(net.nodes).toHaveLength(1);
    expect(net.nodes[0]?.name).toBe('ECM');
  });

  it('omits address when cell is blank', async () => {
    const buf = await buildBuffer({
      Node: [
        ['Node Name', 'Node Address', 'Comment'],
        ['Gateway', '', 'Bridges bus'],
      ],
    });
    const net = await parseExcelAsync(buf);
    expect(net.nodes[0]?.address).toBeUndefined();
    expect(net.nodes[0]?.comment).toBe('Bridges bus');
  });
});

describe('excel reader — Messages sheet', () => {
  it('reads Messages sheet into Network.messages', async () => {
    const buf = await buildBuffer({
      Node: [['Node Name', 'Node Address', 'Comment'], ['ECM', '0', '']],
      Message: [
        ['Message Name', 'Message ID (hex)', 'Message Length', 'Transmitter', 'Comment'],
        ['Engine', '0x100', '8', 'ECM', 'Engine status frame'],
        ['Body', '0x200', '4', 'BCM', ''],
      ],
    });
    const net = await parseExcelAsync(buf);
    expect(net.messages).toHaveLength(2);
    expect(net.messages[0]?.id).toBe(0x100);
    expect(net.messages[0]?.name).toBe('Engine');
    expect(net.messages[0]?.dlc).toBe(8);
    expect(net.messages[0]?.transmitter).toBe('ECM');
    expect(net.messages[0]?.comment).toBe('Engine status frame');
    expect(net.messages[1]?.id).toBe(0x200);
    expect(net.messages[1]?.dlc).toBe(4);
    expect(net.messages[1]?.comment).toBeUndefined();
  });

  it('parses decimal message IDs', async () => {
    const buf = await buildBuffer({
      Node: [['Node Name', 'Node Address', 'Comment'], ['ECM', '0', '']],
      Message: [
        ['Message Name', 'Message ID (hex)', 'Message Length', 'Transmitter'],
        ['M', '256', '8', 'ECM'],
      ],
    });
    const net = await parseExcelAsync(buf);
    expect(net.messages[0]?.id).toBe(256);
  });
});

describe('excel reader — Signals sheet', () => {
  it('reads plain signals', async () => {
    const buf = await buildBuffer({
      Node: [['Node Name', 'Node Address', 'Comment'], ['ECM', '0', ''], ['BCM', '1', '']],
      Message: [
        ['Message Name', 'Message ID (hex)', 'Message Length', 'Transmitter'],
        ['M', '0x100', '8', 'ECM'],
      ],
      Signal: [
        [
          'Message Name', 'Signal Name', 'Multiplex', 'Mux Value', 'Mux Extended',
          'Start Bit', 'Signal Length', 'Byte Order', 'Value Type', 'Factor',
          'Offset', 'Minimum', 'Maximum', 'Unit', 'Value Table Name', 'Receivers',
          'GenSigStartValue', 'GenSigInactiveValue', 'GenSigTimeoutValue', 'Comment',
        ],
        ['M', 'Speed', '', '', '', '0', '16', '1', '+', '0.1', '0', '0', '6553.5', 'rpm', '', 'BCM', '0', '0', '0', ''],
      ],
    });
    const net = await parseExcelAsync(buf);
    const sig = net.messages[0]?.signals[0];
    expect(sig?.name).toBe('Speed');
    expect(sig?.startBit).toBe(0);
    expect(sig?.length).toBe(16);
    expect(sig?.byteOrder).toBe('little-endian');
    expect(sig?.valueType).toBe('unsigned');
    expect(sig?.multiplexed.kind).toBe('Plain');
    expect(sig?.receivers).toEqual(['BCM']);
  });

  it('reads muxed signals (Multiplexor + Muxed)', async () => {
    const buf = await buildBuffer({
      Node: [['Node Name', 'Node Address', 'Comment'], ['ECM', '0', ''], ['BCM', '1', '']],
      Message: [
        ['Message Name', 'Message ID (hex)', 'Message Length', 'Transmitter'],
        ['M', '0x100', '8', 'ECM'],
      ],
      Signal: [
        [
          'Message Name', 'Signal Name', 'Multiplex', 'Mux Value', 'Mux Extended',
          'Start Bit', 'Signal Length', 'Byte Order', 'Value Type', 'Factor',
          'Offset', 'Minimum', 'Maximum', 'Unit', 'Value Table Name', 'Receivers',
          'GenSigStartValue', 'GenSigInactiveValue', 'GenSigTimeoutValue', 'Comment',
        ],
        ['M', 'Mux', 'Multiplexor', '', '', '0', '8', '1', '+', '1', '0', '0', '255', '', '', 'BCM', '0', '0', '0', ''],
        ['M', 'Speed', 'Muxed', '0', '0', '8', '16', '1', '+', '0.1', '0', '0', '6553.5', 'rpm', '', 'BCM', '0', '0', '0', ''],
        ['M', 'Temp', 'Muxed', '1', '0', '24', '8', '1', '+', '1', '-40', '-40', '215', 'degC', '', 'BCM', '0', '0', '0', ''],
      ],
    });
    const net = await parseExcelAsync(buf);
    const sigs = net.messages[0]?.signals ?? [];
    expect(sigs).toHaveLength(3);
    expect(sigs[0]?.multiplexed.kind).toBe('Multiplexor');
    expect(sigs[1]?.multiplexed.kind).toBe('Muxed');
    expect(sigs[1]?.multiplexed).toEqual({ kind: 'Muxed', value: 0 });
    expect(sigs[2]?.multiplexed).toEqual({ kind: 'Muxed', value: 1 });
  });

  it('reads ExtendedMuxed signals when Multiplex=Extended', async () => {
    const buf = await buildBuffer({
      Node: [['Node Name', 'Node Address', 'Comment'], ['ECM', '0', ''], ['BCM', '1', '']],
      Message: [
        ['Message Name', 'Message ID (hex)', 'Message Length', 'Transmitter'],
        ['M', '0x100', '8', 'ECM'],
      ],
      Signal: [
        [
          'Message Name', 'Signal Name', 'Multiplex', 'Mux Value', 'Mux Extended',
          'Start Bit', 'Signal Length', 'Byte Order', 'Value Type', 'Factor',
          'Offset', 'Minimum', 'Maximum', 'Unit', 'Value Table Name', 'Receivers',
          'GenSigStartValue', 'GenSigInactiveValue', 'GenSigTimeoutValue', 'Comment',
        ],
        ['M', 'Mux', 'Multiplexor', '', '', '0', '8', '1', '+', '1', '0', '0', '255', '', '', 'BCM', '0', '0', '0', ''],
        ['M', 'Sub1', 'Extended', '3', '1', '8', '16', '1', '+', '1', '0', '0', '1', '', '', 'BCM', '0', '0', '0', ''],
      ],
    });
    const net = await parseExcelAsync(buf);
    const sigs = net.messages[0]?.signals ?? [];
    expect(sigs[1]?.multiplexed.kind).toBe('ExtendedMuxed');
    expect(sigs[1]?.multiplexed).toEqual({ kind: 'ExtendedMuxed', value: 3 });
  });
});

describe('excel reader — Value Tables', () => {
  it('reads ValueTable + ValueTableEntry sheets', async () => {
    const buf = await buildBuffer({
      ValueTable: [
        ['Value Table Name', 'Comment'],
        ['OffOn', 'Simple on/off'],
      ],
      ValueTableEntry: [
        ['Value Table Name', 'Raw Value', 'Value Name'],
        ['OffOn', '0', 'Off'],
        ['OffOn', '1', 'On'],
      ],
    });
    const net = await parseExcelAsync(buf);
    expect(net.valueTables).toHaveLength(1);
    expect(net.valueTables[0]?.name).toBe('OffOn');
    expect(net.valueTables[0]?.entries).toEqual([
      { raw: 0, name: 'Off' },
      { raw: 1, name: 'On' },
    ]);
  });

  it('creates empty ValueTable when entries sheet missing', async () => {
    const buf = await buildBuffer({
      ValueTable: [
        ['Value Table Name', 'Comment'],
        ['Lone'],
      ],
    });
    const net = await parseExcelAsync(buf);
    expect(net.valueTables).toHaveLength(1);
    expect(net.valueTables[0]?.entries).toEqual([]);
  });
});

describe('excel reader — attribute columns', () => {
  it('wires Cycle Time and Send Type into attributeAssignments', async () => {
    const buf = await buildBuffer({
      Node: [['Node Name', 'Node Address', 'Comment'], ['ECM', '0', '']],
      Message: [
        [
          'Message Name', 'Message ID (hex)', 'Message Length', 'Transmitter',
          'Cycle Time [ms]', 'Send Type',
        ],
        ['M', '0x100', '8', 'ECM', '100', 'Cyclic'],
      ],
    });
    const net = await parseExcelAsync(buf);
    expect(net.attributeAssignments).toHaveLength(2);
    expect(net.attributeAssignments[0]).toEqual({
      name: 'GenMsgCycleTime',
      target: { kind: 'message', messageId: 0x100 },
      value: 100,
    });
    expect(net.attributeAssignments[1]).toEqual({
      name: 'GenMsgSendType',
      target: { kind: 'message', messageId: 0x100 },
      value: 'Cyclic',
    });
  });

  it('does not create assignments when attribute columns are blank', async () => {
    const buf = await buildBuffer({
      Node: [['Node Name', 'Node Address', 'Comment'], ['ECM', '0', '']],
      Message: [
        [
          'Message Name', 'Message ID (hex)', 'Message Length', 'Transmitter',
          'Cycle Time [ms]', 'Send Type',
        ],
        ['M', '0x100', '8', 'ECM', '', ''],
      ],
    });
    const net = await parseExcelAsync(buf);
    expect(net.attributeAssignments).toHaveLength(0);
  });
});

describe('excel reader — 29-bit IDs + malformed xlsx', () => {
  it('auto-detects 29-bit extended IDs', async () => {
    const buf = await buildBuffer({
      Node: [['Node Name', 'Node Address', 'Comment'], ['ECM', '0', '']],
      Message: [
        ['Message Name', 'Message ID (hex)', 'Message Length', 'Transmitter'],
        ['Ext', '0x18FF1234', '8', 'ECM'],
      ],
    });
    const net = await parseExcelAsync(buf);
    expect(net.messages[0]?.id).toBe(0x18ff1234);
    expect(net.messages[0]?.isExtended).toBe(true);
  });

  it('treats 11-bit IDs as non-extended', async () => {
    const buf = await buildBuffer({
      Node: [['Node Name', 'Node Address', 'Comment'], ['ECM', '0', '']],
      Message: [
        ['Message Name', 'Message ID (hex)', 'Message Length', 'Transmitter'],
        ['Std', '0x100', '8', 'ECM'],
      ],
    });
    const net = await parseExcelAsync(buf);
    expect(net.messages[0]?.isExtended).toBe(false);
  });

  it('throws IOError on malformed xlsx', async () => {
    await expect(parseExcelAsync(Buffer.from('not a real xlsx file'))).rejects.toThrow();
  });
});

describe('excel reader — full integration', () => {
  it('reads a multi-sheet Vector-style matrix', async () => {
    const buf = await buildBuffer({
      Node: [
        ['Node Name', 'Node Address', 'Comment'],
        ['ECM', '0', ''],
        ['BCM', '1', ''],
        ['Gateway', '2', 'Bridges bus'],
      ],
      Message: [
        [
          'Message Name', 'Message ID (hex)', 'Message Length', 'Transmitter',
          'Cycle Time [ms]', 'Send Type',
        ],
        ['EngineStatus', '0x100', '8', 'ECM', '100', 'Cyclic'],
        ['BodyStatus', '0x200', '8', 'BCM', '200', 'Cyclic'],
      ],
      Signal: [
        [
          'Message Name', 'Signal Name', 'Multiplex', 'Mux Value', 'Mux Extended',
          'Start Bit', 'Signal Length', 'Byte Order', 'Value Type', 'Factor',
          'Offset', 'Minimum', 'Maximum', 'Unit', 'Value Table Name', 'Receivers',
          'GenSigStartValue', 'GenSigInactiveValue', 'GenSigTimeoutValue', 'Comment',
        ],
        ['EngineStatus', 'RPM', '', '', '', '0', '16', '1', '+', '0.1', '0', '0', '6553.5', 'rpm', '', 'BCM', '0', '0', '0', ''],
        ['EngineStatus', 'Temp', '', '', '', '16', '8', '1', '+', '1', '-40', '-40', '215', 'degC', '', 'BCM', '0', '0', '0', ''],
        ['BodyStatus', 'DoorLock', 'Multiplexor', '', '', '0', '8', '1', '+', '1', '0', '0', '255', '', '', 'ECM', '0', '0', '0', ''],
        ['BodyStatus', 'LockState', 'Muxed', '0', '0', '8', '8', '1', '+', '1', '0', '0', '255', '', '', 'ECM', '0', '0', '0', ''],
      ],
    });
    const net = await parseExcelAsync(buf);
    expect(net.nodes).toHaveLength(3);
    expect(net.messages).toHaveLength(2);
    expect(net.messages[0]?.signals).toHaveLength(2);
    expect(net.messages[1]?.signals).toHaveLength(2);
    expect(net.messages[1]?.signals[0]?.multiplexed.kind).toBe('Multiplexor');
    // attribute wiring from Cycle Time / Send Type
    expect(net.attributeAssignments).toHaveLength(4);
  });
});

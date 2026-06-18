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

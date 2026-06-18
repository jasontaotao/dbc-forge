import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// eslint-disable-next-line import/default, import/no-named-as-default-member
import ExcelJS from 'exceljs';
import { execa } from 'execa';
import { describe, it, expect } from 'vitest';

const CLI = fileURLToPath(new URL('../../dist/main.js', import.meta.url));

async function makeMinimalXlsx(path: string): Promise<void> {
  const wb = new ExcelJS.Workbook();

  // Node sheet
  const nodeWs = wb.addWorksheet('Node');
  nodeWs.addRow(['Node Name', 'Node Address', 'Comment']);
  nodeWs.addRow(['ECM', '0x100', '']);

  // Message sheet (empty header rows to avoid issues)
  const msgWs = wb.addWorksheet('Message');
  msgWs.addRow([
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
  msgWs.addRow(['Empty_Msg', '0x100', 8, 'ECM', '', '', '', '', '', 'Standard', '']);

  // Signal sheet
  const sigWs = wb.addWorksheet('Signal');
  sigWs.addRow([
    'Message Name',
    'Signal Name',
    'Multiplex',
    'Mux Value',
    'Mux Extended',
    'Start Bit',
    'Signal Length',
    'Byte Order',
    'Value Type',
    'Factor',
    'Offset',
    'Min',
    'Max',
    'Unit',
    'Initial Value',
    'Value Table Name',
    'Comment',
  ]);
  sigWs.addRow(['Empty_Msg', 'S1', '', '', '', 0, 8, '1', '+', 1, 0, 0, 255, '', 0, '', '']);

  // Value Tables sheet
  const vtWs = wb.addWorksheet('ValueTable');
  vtWs.addRow(['VT Name', 'Comment']);
  // Value Table Entries sheet
  const vteWs = wb.addWorksheet('ValueTableEntry');
  vteWs.addRow(['VT Name', 'Raw Value', 'Value Name']);

  await wb.xlsx.writeFile(path);
}

describe('cli build', () => {
  it('builds xlsx → dbc and exits 0 (with --no-validate, no BusType attrs in fixture)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dbc-forge-'));
    const xlsx = join(dir, 'in.xlsx');
    const dbc = join(dir, 'out.dbc');
    await makeMinimalXlsx(xlsx);
    // Use --no-validate: the minimal xlsx fixture doesn't carry BusType/Baudrate
    // attributes, which the strict build-mode validator requires. Pure round-trip
    // behavior is exercised; validation is covered by the validate.test.ts suite.
    const result = await execa(
      'node',
      [CLI, 'build', xlsx, '-o', dbc, '--no-validate'],
      { reject: false },
    );
    expect(result.exitCode).toBe(0);
    const out = await readFile(dbc, 'utf8');
    expect(out).toMatch(/^VERSION /);
    expect(out).toContain('BU_: ECM');
    expect(out).toContain('BO_ 256 Empty_Msg');
    expect(out).toContain('SG_ S1');
  });

  it('exits 1 when input has no nodes and no messages (validation errors)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dbc-forge-'));
    const xlsx = join(dir, 'in.xlsx');
    const dbc = join(dir, 'out.dbc');
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('EmptySheet');
    await wb.xlsx.writeFile(xlsx);
    const result = await execa('node', [CLI, 'build', xlsx, '-o', dbc], { reject: false });
    expect(result.exitCode).toBe(1);
    // Should report validation failure on stderr
    expect(result.stderr).toMatch(/校验失败|错误|warning|error/i);
  });

  it('skips validation when --no-validate is set', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dbc-forge-'));
    const xlsx = join(dir, 'in.xlsx');
    const dbc = join(dir, 'out.dbc');
    await makeMinimalXlsx(xlsx);
    const result = await execa(
      'node',
      [CLI, 'build', xlsx, '-o', dbc, '--no-validate'],
      { reject: false },
    );
    expect(result.exitCode).toBe(0);
    const out = await readFile(dbc, 'utf8');
    expect(out).toContain('BU_: ECM');
  });
});

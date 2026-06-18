import { writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// eslint-disable-next-line import/default, import/no-named-as-default-member
import ExcelJS from 'exceljs';
import { execa } from 'execa';
import { describe, it, expect } from 'vitest';

const CLI = fileURLToPath(new URL('../../dist/main.js', import.meta.url));

const MINIMAL_DBC = `VERSION ""


NS_ :
	NS_DESC_
	CM_
	BA_DEF_
	BA_
	VAL_
	CAT_DEF_
	CAT_
	FILTER
	BA_DEF_DEF_
	EV_DATA_
	ENVVAR_DATA_
	SGTYPE_
	SGTYPE_VAL_
	BA_DEF_SGTYPE_
	BA_SGTYPE_
	SIG_TYPE_REF_
	VAL_TABLE_
	SIG_GROUP_
	SIG_VALTYPE_
	SIGTYPE_VALTYPE_
	BO_TX_BU_
	BA_DEF_REL_
	BA_REL_
	BA_DEF_DEF_REL_
	BU_SG_REL_
	BU_EV_REL_
	BU_BO_REL_
	SG_MUL_VAL_

BS_:

BU_: ECM

BO_ 256 Empty_Msg: 8 ECM
 SG_ S1 : 0|8@1+ (1,0) [0|255] "" Vector__XXX

BA_DEF_  "BusType" STRING ;
BA_DEF_  "Baudrate" INT 0 1000000;
BA_DEF_DEF_  "BusType" "CAN";
BA_DEF_DEF_  "Baudrate" 500000;
BA_ "BusType" "CAN";
BA_ "Baudrate" 500000;

`;

async function makeMinimalXlsx(path: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const nodeWs = wb.addWorksheet('Node');
  nodeWs.addRow(['Node Name', 'Node Address', 'Comment']);
  nodeWs.addRow(['ECM', '0x100', '']);
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
  const vtWs = wb.addWorksheet('ValueTable');
  vtWs.addRow(['VT Name', 'Comment']);
  const vteWs = wb.addWorksheet('ValueTableEntry');
  vteWs.addRow(['VT Name', 'Raw Value', 'Value Name']);
  await wb.xlsx.writeFile(path);
}

describe('cli validate', () => {
  it('validates a dbc file and prints OK', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dbc-forge-'));
    const dbc = join(dir, 'in.dbc');
    await writeFile(dbc, MINIMAL_DBC, 'utf8');
    const result = await execa('node', [CLI, 'validate', dbc], { reject: false });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('OK:');
  });

  it('validates an xlsx file: strict build-mode requires BusType/Baudrate attrs', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dbc-forge-'));
    const xlsx = join(dir, 'in.xlsx');
    await makeMinimalXlsx(xlsx);
    const result = await execa('node', [CLI, 'validate', xlsx], { reject: false });
    // The minimal xlsx fixture intentionally omits BusType/Baudrate attributes,
    // so the strict build-mode validator flags network.bus-type-required and
    // network.baudrate-required. This documents the contract: xlsx round-trip
    // is not guaranteed to pass strict build validation without the BA_DEF_/BA_
    // lines being present.
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/bus-type-required|baudrate-required/);
  });
});

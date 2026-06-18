import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

BU_: ECM GATEWAY

BO_ 256 Empty_Msg: 8 ECM
 SG_ S1 : 0|8@1+ (1,0) [0|255] "" Vector__XXX

BA_DEF_  "BusType" STRING ;
BA_DEF_  "Baudrate" INT 0 1000000;
BA_DEF_DEF_  "BusType" "CAN";
BA_DEF_DEF_  "Baudrate" 500000;
BA_ "BusType" "CAN";
BA_ "Baudrate" 500000;

`;

describe('cli extract', () => {
  it('extracts dbc → xlsx and exits 0', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dbc-forge-'));
    const dbc = join(dir, 'in.dbc');
    const xlsx = join(dir, 'out.xlsx');
    await writeFile(dbc, MINIMAL_DBC, 'utf8');
    const result = await execa('node', [CLI, 'extract', dbc, '-o', xlsx], { reject: false });
    expect(result.exitCode).toBe(0);
    // Confirm xlsx file is a valid xlsx (PK header)
    const buf = await readFile(xlsx);
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });
});

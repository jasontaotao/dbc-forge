import { writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { execa } from 'execa';
import { describe, it, expect } from 'vitest';

const CLI = fileURLToPath(new URL('../../dist/main.js', import.meta.url));

const DBC_A = `VERSION ""


NS_ :

BS_:

BU_: ECM

BO_ 256 MsgA: 8 ECM
 SG_ S1 : 0|8@1+ (1,0) [0|255] "" Vector__XXX

BA_ "BusType" "CAN";
BA_ "Baudrate" 500000;

`;

const DBC_B = `VERSION ""


NS_ :

BS_:

BU_: ECM

BO_ 256 MsgA: 8 ECM
 SG_ S1 : 0|8@1+ (1,0) [0|255] "" Vector__XXX

BO_ 512 MsgB: 4 ECM
 SG_ S2 : 0|8@1+ (1,0) [0|1] "" Vector__XXX

BA_ "BusType" "CAN";
BA_ "Baudrate" 500000;

`;

describe('cli diff', () => {
  it('produces text report to stdout by default', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dbc-forge-'));
    const a = join(dir, 'a.dbc');
    const b = join(dir, 'b.dbc');
    await writeFile(a, DBC_A, 'utf8');
    await writeFile(b, DBC_B, 'utf8');
    const result = await execa('node', [CLI, 'diff', a, b], { reject: false });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('MsgB');
  });

  it('produces JSON when --format json', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dbc-forge-'));
    const a = join(dir, 'a.dbc');
    const b = join(dir, 'b.dbc');
    await writeFile(a, DBC_A, 'utf8');
    await writeFile(b, DBC_B, 'utf8');
    const result = await execa('node', [CLI, 'diff', a, b, '--format', 'json'], {
      reject: false,
    });
    expect(result.exitCode).toBe(0);
    // Should be valid JSON
    const parsed = JSON.parse(result.stdout) as unknown;
    expect(parsed).toBeTruthy();
  });

  it('writes to -o file when specified', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dbc-forge-'));
    const a = join(dir, 'a.dbc');
    const b = join(dir, 'b.dbc');
    const out = join(dir, 'report.txt');
    await writeFile(a, DBC_A, 'utf8');
    await writeFile(b, DBC_B, 'utf8');
    const result = await execa('node', [CLI, 'diff', a, b, '-o', out], { reject: false });
    expect(result.exitCode).toBe(0);
    const fs = await import('node:fs/promises');
    const content = await fs.readFile(out, 'utf8');
    expect(content).toContain('MsgB');
  });

  it('exits 3 on invalid --format', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dbc-forge-'));
    const a = join(dir, 'a.dbc');
    const b = join(dir, 'b.dbc');
    await writeFile(a, DBC_A, 'utf8');
    await writeFile(b, DBC_B, 'utf8');
    const result = await execa('node', [CLI, 'diff', a, b, '--format', 'xml'], {
      reject: false,
    });
    expect(result.exitCode).toBe(3);
  });
});

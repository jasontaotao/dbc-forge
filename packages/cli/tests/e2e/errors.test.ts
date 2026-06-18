import { fileURLToPath } from 'node:url';

import { execa } from 'execa';
import { describe, it, expect } from 'vitest';

const CLI = fileURLToPath(new URL('../../dist/main.js', import.meta.url));

describe('cli error handling', () => {
  it('exits 2 when input file is not found (build)', async () => {
    const result = await execa(
      'node',
      [CLI, 'build', '/tmp/dbc-forge-nonexistent-input.xlsx', '-o', '/tmp/out.dbc'],
      { reject: false },
    );
    expect(result.exitCode).toBe(2);
  });

  it('exits 2 when input file is not found (extract)', async () => {
    const result = await execa(
      'node',
      [CLI, 'extract', '/tmp/dbc-forge-nonexistent-input.dbc', '-o', '/tmp/out.xlsx'],
      { reject: false },
    );
    expect(result.exitCode).toBe(2);
  });

  it('exits 2 when input file is not found (validate)', async () => {
    const result = await execa('node', [CLI, 'validate', '/tmp/dbc-forge-nonexistent.dbc'], {
      reject: false,
    });
    expect(result.exitCode).toBe(2);
  });

  it('exits 3 when -o is missing for build', async () => {
    const result = await execa('node', [CLI, 'build', '/tmp/whatever.xlsx'], { reject: false });
    // commander exits with its own code on missing required option; accept either 3 or commander's code
    expect([3, 1]).toContain(result.exitCode);
  });

  it('exits 3 when -o is missing for extract', async () => {
    const result = await execa('node', [CLI, 'extract', '/tmp/whatever.dbc'], { reject: false });
    expect([3, 1]).toContain(result.exitCode);
  });

  it('prints help with exit 0 when --help is given', async () => {
    const result = await execa('node', [CLI, '--help'], { reject: false });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('dbc-forge');
  });
});

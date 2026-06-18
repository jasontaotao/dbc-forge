import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { parseDbc, parseExcelAsync, validate, IOError } from '@dbc-forge/core';
import { renderIssues } from '../render/issues.js';
import type { Network } from '@dbc-forge/core';

async function loadInput(path: string): Promise<Network> {
  const buf = await readFile(path);
  if (path.toLowerCase().endsWith('.dbc')) {
    return parseDbc(buf.toString('utf8'));
  }
  return parseExcelAsync(buf);
}

export const validateCommand = new Command('validate')
  .description('校验一个网络（xlsx 或 dbc）')
  .argument('<input>', 'input file')
  .action(async (input: string) => {
    let net: Network;
    try {
      net = await loadInput(input);
    } catch (e) {
      if (e instanceof IOError) throw e;
      throw new IOError('cannot read input', { path: input, cause: e });
    }
    const r = validate(net, { mode: 'build' });
    if (r.errors.length > 0) {
      process.stderr.write(renderIssues([...r.errors, ...r.warnings]) + '\n');
      process.exit(1);
    }
    if (r.warnings.length > 0) {
      process.stderr.write(renderIssues(r.warnings) + '\n');
    }
    process.stdout.write(`OK: 0 errors, ${r.warnings.length} warnings\n`);
  });

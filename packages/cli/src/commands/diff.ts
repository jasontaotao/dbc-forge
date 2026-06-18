import { readFile, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';

import { parseDbc, parseExcelAsync, diff, renderDiff, IOError, UsageError } from '@dbc-forge/core';
import type { Network } from '@dbc-forge/core';
import { Command } from 'commander';

interface DiffOptions {
  format: string;
  output?: string;
}

async function loadInput(path: string): Promise<Network> {
  const buf = await readFile(path);
  const ext = extname(path).toLowerCase();
  if (ext === '.dbc') return parseDbc(buf.toString('utf8'));
  if (ext === '.xlsx' || ext === '.xlsm') return parseExcelAsync(buf);
  throw new IOError('unsupported file type (expected .dbc or .xlsx)', { path });
}

export const diffCommand = new Command('diff')
  .description('语义化 diff 两个网络 (xlsx 或 dbc)')
  .argument('<a>', 'first input (xlsx or dbc)')
  .argument('<b>', 'second input (xlsx or dbc)')
  .option('--format <fmt>', 'output format: text or json', 'text')
  .option('-o, --output <file>', 'write report to file (default: stdout)')
  .action(async (a: string, b: string, opts: DiffOptions) => {
    if (opts.format !== 'text' && opts.format !== 'json') {
      throw new UsageError(`invalid --format: ${opts.format}`, {
        hint: 'use --format text or --format json',
      });
    }
    let netA: Network;
    let netB: Network;
    try {
      netA = await loadInput(a);
    } catch (e) {
      if (e instanceof IOError) throw e;
      throw new IOError('cannot read input', { path: a, cause: e });
    }
    try {
      netB = await loadInput(b);
    } catch (e) {
      if (e instanceof IOError) throw e;
      throw new IOError('cannot read input', { path: b, cause: e });
    }
    const report = diff(netA, netB);
    const text = renderDiff(report, opts.format as 'text' | 'json');
    if (opts.output) {
      try {
        await writeFile(opts.output, text, 'utf8');
      } catch (e) {
        throw new IOError('cannot write report', { path: opts.output, cause: e });
      }
    } else {
      process.stdout.write(text + '\n');
    }
  });

import { Command } from 'commander';
import { readFile, writeFile } from 'node:fs/promises';
import { parseDbc, writeExcel, validate, IOError } from '@dbc-forge/core';
import { renderIssues } from '../render/issues.js';

interface ExtractOptions {
  output: string;
  validate: boolean;
  quiet?: boolean;
}

export const extractCommand = new Command('extract')
  .description('DBC → Excel 通信矩阵')
  .argument('<input.dbc>', 'input DBC file')
  .requiredOption('-o, --output <file>', 'output Excel file')
  .option('--no-validate', 'skip validation (extract mode is permissive)')
  .option('--quiet', 'suppress warnings')
  .action(async (input: string, opts: ExtractOptions) => {
    let text: string;
    try {
      text = await readFile(input, 'utf8');
    } catch (e) {
      throw new IOError('cannot read input', { path: input, cause: e });
    }
    const net = parseDbc(text);
    if (opts.validate) {
      const r = validate(net, { mode: 'extract' });
      if (r.errors.length > 0) {
        process.stderr.write(renderIssues([...r.errors, ...r.warnings]) + '\n');
        process.exit(1);
      }
      if (!opts.quiet && r.warnings.length > 0) {
        process.stderr.write(renderIssues(r.warnings) + '\n');
      }
    }
    const buf = await writeExcel(net);
    try {
      await writeFile(opts.output, buf);
    } catch (e) {
      throw new IOError('cannot write output', { path: opts.output, cause: e });
    }
  });

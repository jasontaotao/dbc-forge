import { Command } from 'commander';
import { readFile, writeFile } from 'node:fs/promises';
import { parseExcelAsync, writeDbc, validate, IOError } from '@dbc-forge/core';
import { renderIssues } from '../render/issues.js';

interface BuildOptions {
  output: string;
  validate: boolean;
  quiet?: boolean;
}

export const buildCommand = new Command('build')
  .description('Excel 通信矩阵 → DBC')
  .argument('<input.xlsx>', 'input Excel 通信矩阵')
  .requiredOption('-o, --output <file>', 'output DBC file')
  .option('--no-validate', 'skip strict validation')
  .option('--quiet', 'suppress warnings')
  .action(async (input: string, opts: BuildOptions) => {
    let buf: Buffer;
    try {
      buf = await readFile(input);
    } catch (e) {
      throw new IOError('cannot read input', { path: input, cause: e });
    }
    const net = await parseExcelAsync(buf);
    if (opts.validate) {
      const r = validate(net, { mode: 'build' });
      if (r.errors.length > 0) {
        process.stderr.write(renderIssues([...r.errors, ...r.warnings]) + '\n');
        process.exit(1);
      }
      if (!opts.quiet && r.warnings.length > 0) {
        process.stderr.write(renderIssues(r.warnings) + '\n');
      }
    }
    const text = writeDbc(net, { mode: 'build' });
    try {
      await writeFile(opts.output, text, 'utf8');
    } catch (e) {
      throw new IOError('cannot write output', { path: opts.output, cause: e });
    }
  });

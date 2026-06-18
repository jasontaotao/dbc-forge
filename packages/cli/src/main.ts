#!/usr/bin/env node
import { Command } from 'commander';
import { buildCommand } from './commands/build.js';
import { extractCommand } from './commands/extract.js';
import { diffCommand } from './commands/diff.js';
import { validateCommand } from './commands/validate.js';
import { renderError } from './render/errors.js';

const program = new Command();
program
  .name('dbc-forge')
  .description('Strict DBC ↔ Excel communication matrix tool')
  .version('0.0.0');

program.addCommand(buildCommand);
program.addCommand(extractCommand);
program.addCommand(diffCommand);
program.addCommand(validateCommand);

program.parseAsync(process.argv).catch((err: unknown) => {
  const { message, code } = renderError(err);
  process.stderr.write(message + '\n');
  process.exit(code);
});

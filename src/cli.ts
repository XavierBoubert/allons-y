#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import * as fs from 'node:fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as cmds from './index.js';
import { totalTimeReadable } from './commands/index.js';
import type { Command } from './commands/index.js';
import { log, chalk } from './logger/index.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const commands = cmds as { [k: string]: Command<any> };
const cwd = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(cwd, '../package.json'), 'utf8'));

const y = yargs(hideBin(process.argv))
  .scriptName('ay')
  .middleware((argv) => {
    // eslint-disable-next-line no-param-reassign
    argv.startDate = new Date();
  });

Object.keys(commands).forEach((key) => {
  const command = commands[key];
  y.command(command.cmd, command.description, command.builder, async (args) => {
    log([
      chalk.cyan.bold('<'),
      chalk.bgCyan.bold(` Allons-y ${pkg.version} > `),
      chalk.bgCyanBright.bold(` ${command.title} `),
      chalk.cyan.bold('>'),
      '\n',
    ].join(''));
    await command.command(args);
    log(chalk.bgGray(`\n ${totalTimeReadable(args.startDate as Date, true)} `));
  });
});

y.demandCommand(1).strict().parse();

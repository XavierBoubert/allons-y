import { execSync } from 'node:child_process';
import { table } from 'table';
import type { TableUserConfig } from 'table';
import { intervalReadable, type Command } from '../commands/index.js';
import { chalk, log } from '../logger/index.js';

export type CommandArgs = {
  from: string, to: string, day: string, dayHours: number, issueRegex?: string, issueLink?: string, out?: string, outFormat?: string,
  warning: boolean
};

const noop = () => {};

export const report: Command<CommandArgs> = {
  cmd: 'activity report',
  title: 'Activity Report',
  description: [
    'Generate a markdown activity report per day based on your Git checkouts activty on a repository.',
  ].join(''),
  builder: (y) => {
    y
      .option('from', {
        describe: 'Date from where to start the activities list. Format: YYYY-MM-DD, 2025-06-01',
        type: 'string',
        demandOption: true,
        default: new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12).toISOString().substring(0, 10),
      })
      .option('to', {
        describe: 'Date to where to end the activities list. Format: YYYY-MM-DD, 2025-06-30',
        type: 'string',
        demandOption: true,
        default: new Date().toISOString().substring(0, 10),
      })
      .option('day', {
        describe: 'Real working time in a day, in 24h format. Eg. "9:00-18:00".',
        type: 'string',
        default: '9:00-18:00',
        demandOption: true,
      })
      .option('day-hours', { describe: 'Number of working hours in a day.', type: 'number', default: 8, demandOption: true })
      .option('warning', { describe: 'Display or not the warnings messages', type: 'boolean', default: true, demandOption: true })
      .option('issue-regex', { describe: 'Regex to retrieve the issue id from the branch name.', type: 'string' })
      .option('issue-link', {
        describe: 'Issue link pattern. Use {issue} to set the issue id retrieve from the branch name.', type: 'string',
      })
      .check((argv) => {
        if ((argv.issueLink && !argv.issueRegex) || (!argv.issueLink && argv.issueRegex)) {
          throw new Error('Options --issue-regex && --issue-link are used together.');
        }

        return true;
      })
      .example(
        '$0 --issue-regex "(JIRA-\\d+)" --issue-link "http://jira.com/browse/{issue}"',
        'This will generate the ACTIVITY.md file that contains each day from the 2025-06-01 with the Jira issue link and times.',
      );
    // .option('out', { describe: 'File name and path to export the activity report results.', type: 'string' })
    // .option('out-format', { describe: 'Format of the exported activity report.', type: 'string', choices: ['markdown'] });
  },
  command: (args) => {
    // ay activity report --issue-regex "(FR_BC_ALIX-\\d+)" --issue-link "https://mph-jira-01.devops.in.idemia.com/browse/{issue}"
    const realDayHours = args.day.split('-').map((time) => time.trim().split(':').map((part) => parseInt(part, 10)));
    const slotInOut = (dayDate: string) => {
      const dayHoursIn = new Date(dayDate);
      dayHoursIn.setHours(realDayHours[0][0]);
      dayHoursIn.setMinutes(realDayHours[0][1]);
      dayHoursIn.setSeconds(0);
      const dayHoursOut = new Date(dayDate);
      dayHoursOut.setHours(realDayHours[1][0]);
      dayHoursOut.setMinutes(realDayHours[1][1]);
      dayHoursOut.setSeconds(0);

      return { in: dayHoursIn, out: dayHoursOut };
    };
    const realDayWorkingHoursTime = slotInOut('2025-06-02').out.getTime() - slotInOut('2025-06-02').in.getTime();
    const checkouts = execSync(`git reflog --date=local --since="${args.from}" --grep-reflog="checkout:"`)
      .toString()
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => {
        const match = line.match(/^.*?HEAD@\{(.*?)\}: checkout: moving from (.*?) to (.*?)$/);

        return !match ? undefined : {
          date: new Date(match[1]),
          dayHours: slotInOut(match[1]),
          from: match[2],
          to: match[3],
        };
      })
      .filter((checkout) => !!checkout)
      .reverse();

    if (!checkouts.length) {
      log('No Git checkout found.');

      return;
    }

    const errors = {
      checkoutsTimings: [] as string[],
    };

    const days = Array
      .from({ length: ((new Date(args.to).getTime() - new Date(args.from).getTime()) / 3600 / 24 / 1000) + 1 })
      .map((_, i) => {
        const date = new Date(args.from);
        date.setDate(date.getDate() + i);

        return date;
      });

    const issue = (branch: string) => (!args.issueLink
      ? branch
      : args.issueLink.replace('{issue}', (branch.match(new RegExp(args.issueRegex || '')) || ['', branch])[1]));

    const lines: [string, string, string][] = [];
    const spanningCells: TableUserConfig['spanningCells'] = [];
    let lastBranch = checkouts[0].from;

    days.forEach((dayDate) => {
      const dayLabel = dayDate.toISOString().substring(0, 10);
      const day = {
        label: dayLabel,
        activites: [] as { time: number, label: string }[],
        dayHours: slotInOut(dayLabel),
        lastTime: slotInOut(dayLabel).in,
      };

      checkouts.forEach(({ date, to, dayHours }) => {
        const checkoutLabel = date.toISOString().substring(0, 10);

        if (checkoutLabel !== day.label) {
          return;
        }
        if (date.getTime() < dayHours.in.getTime() || date.getTime() > dayHours.out.getTime()) {
          errors.checkoutsTimings.push([
            `- ${checkoutLabel} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')} `,
            'checkout is out of day working hours.',
          ].join(''));
        }
        if (date.getTime() < dayHours.in.getTime()) {
          lastBranch = to;

          return;
        }
        if (date.getTime() > dayHours.out.getTime()) {
          return;
        }
        if (date.getTime() - day.lastTime.getTime() < 60_000) {
          lastBranch = to;

          return;
        }

        day.activites.push({ time: date.getTime() - day.lastTime.getTime(), label: issue(lastBranch) });
        day.lastTime = date;
        lastBranch = to;
      });

      day.activites.push({ time: day.dayHours.out.getTime() - day.lastTime.getTime(), label: issue(lastBranch) });
      const times: { [key: string]: number } = {};
      day.activites.forEach(({ time, label }) => {
        times[label] = (times[label] || 0) + time;
      });
      const timesLabels = Object.keys(times);
      timesLabels.forEach((label) => {
        const realTime = Math.round((times[label] * (args.dayHours * 3600 * 1000)) / realDayWorkingHoursTime);
        lines.push([day.label, intervalReadable(realTime / 1000, true), label]);
      });

      if (timesLabels.length > 1) {
        spanningCells.push({
          col: 0, row: lines.length - timesLabels.length + 1, rowSpan: timesLabels.length, verticalAlignment: 'middle',
        });
      }
    });

    log(table([['DAY', 'TIME', 'ACTIVITY']].concat(lines), {
      header: { alignment: 'center', content: 'Activity Report' },
      columns: [{ alignment: 'left', width: '8888-88-88'.length }],
      spanningCells,
    }));

    if (args.warning) {
      (errors.checkoutsTimings.length ? log : noop)(chalk.bgYellow(' WARNINGS '));
      errors.checkoutsTimings.forEach((msg) => log(chalk.yellow(msg)));
    }
  },
};

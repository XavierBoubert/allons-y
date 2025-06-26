import type { Command } from '../commands/index.js';
import { log } from '../logger/index.js';

export type CommandArgs = { file: string, since: string, dayHours: number, issueRegex?: string, issueLink?: string };

export const report: Command<CommandArgs> = {
  cmd: 'activity report',
  title: 'Activity Report',
  description: [
    'Generate a markdown activity report per day based on your Git checkouts activty',
  ].join(''),
  builder: (y) => {
    y
      .option('file', {
        describe: 'File name and path to generate the markdown activity file', type: 'string', default: './ACTIVITY.md', demandOption: true,
      })
      .option('since', {
        describe: 'Date from where to start the activity. In the git log --since format.',
        type: 'string',
        demandOption: true,
        default: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10),
      })
      .option('day-hours', { describe: 'Number of working hours in a day.', type: 'number', default: 8, demandOption: true })
      .option('issue-regex', { describe: 'Regex to retrieve the issue id from the branch name.', type: 'string' })
      .option('issue-link', { describe: 'Issue link pattern. Use {id} to set the issue id retrieve from the branch name.', type: 'string' })
      .example(
        '$0 --since "2025-06-01" --days-hours 8 --issue-regex "^.*?\\/(JIRA-\\d)-.*?$" --issue-link "http://jira.com/project/{id}"',
        'This will generate the ACTIVITY.md file that contains each day from the 2025-06-01 with the Jira issue link and times.',
      );
  },
  command: (args) => {
    log(`Scanning the code and generating the ${args.file} file...`, args);
    // git reflog --date=iso --since="2025/06/01" --grep-reflog="checkout:" > ok.txt
  },
};

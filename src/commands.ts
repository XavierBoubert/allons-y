import type { ArgumentsCamelCase, BuilderCallback } from 'yargs';

export type Prettify<T> = { [K in keyof T]: T[K] } & unknown;
export type CommandEvents = { sigInt?: (fn: () => void) => void };
export type Command<T extends object = { [argName: string]: unknown }> = {
  cmd: string,
  title: string,
  description: string,
  builder?: BuilderCallback<T, T>,
  command: (argv: Prettify<ArgumentsCamelCase<T & { startDate: Date }>>, on?: CommandEvents) => void | Promise<void>,
};

export const intervalReadable = (sec: number, short = false) => [
  [Math.floor(sec / 31536000), short ? 'y' : 'years'],
  [Math.floor((sec % 31536000) / 86400), short ? 'd' : 'days'],
  [Math.floor(((sec % 31536000) % 86400) / 3600), short ? 'h' : 'hours'],
  [Math.floor((((sec % 31536000) % 86400) % 3600) / 60), short ? 'm' : 'minutes'],
  [Math.round((((sec % 31536000) % 86400) % 3600) % 60), short ? 's' : 'seconds'],
]
  .reduce((value, level) => value.concat(level[0] === 0 ? [] : [`${level[0]}${short ? '' : ' '}${level[1]}`]), [])
  .join(' ') || (short ? '< 1s' : 'less than a second');
export const totalTimeReadable = (startDate: Date, short = false) => intervalReadable(
  (new Date().getTime() - startDate.getTime()) / 1000, short,
);

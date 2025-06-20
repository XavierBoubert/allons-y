import { globSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Command } from '../commands/index.js';
import { chalk, log } from '../logger/index.js';

export type CommandArgs = { source: string, file: string, exclude?: string, npm?: boolean };

export const graph: Command<CommandArgs> = {
  cmd: 'imports graph',
  title: 'Imports Graph',
  description: [
    'Generate a Mermaid graph of the ESM imports in a source directory. This allows to clearly see the dependencies between features.',
  ].join(''),
  builder: (y) => {
    y
      .option('source', {
        alias: 's', describe: 'Absolute or relative folder where all the source folders are.', type: 'string', demandOption: true,
      })
      .option('file', {
        describe: 'File name and path to generate the Mermaid graph', type: 'string', default: './IMPORTS.md', demandOption: true,
      })
      .option('exclude', { describe: 'Source folders or node modules to exclude (separated by a comma).', type: 'string' })
      .option('npm', { describe: 'Include node_modules to the graph.', type: 'boolean', default: true })
      .example(
        '$0 --source ./src --file ./IMPORTS.md',
        'This will retrieve all the source folders located in "src" and generate the IMPORTS.md file with the Mermaid associated graph.',
      )
      .example(
        '$0 --source ./src --exclude "test,node:fs,jest"',
        'This will generate a graph without "test", "node:fs" and "jest" from source folders and node modules.',
      );
  },
  command: (args) => {
    log(`Scanning the code and generating the ${args.file} file...`);
    const source = path.resolve(args.source);
    const excludes = (args.exclude || '').split(',');
    const domains: { [domain: string]: string[] } = {};
    const childrenTimes: { [domain: string]: number } = {};
    const types: { [domain: string]: 'file' | 'feature' | 'npm' } = {};
    const domainFromPath = (filePath: string) => {
      const relativePath = filePath.replace(`${source}${path.sep}`, '');

      return relativePath.indexOf(path.sep) > -1
        ? relativePath.replace(new RegExp(`^(.*?)\\${path.sep}.*?$`), '$1')
        : relativePath.replace('.ts', '.js');
    };

    globSync(`${source}/**/*.{js{,x},ts{,x}}`).forEach((file) => {
      const domain = domainFromPath(file);

      if (excludes.includes(domain)) {
        return;
      }

      const contents = readFileSync(file, 'utf8');
      contents.match(/^\s*(im|ex)port.*?from\s*['|"|`](.*?)['|"|`](.*?)$/gm)?.forEach((line) => {
        const importFile = (line.match(/^\s*(im|ex)port.*?from\s*['|"|`](.*?)['|"|`](.*?)$/) || [''])[2];
        if (/(type \w| type\s*\{)/.test(importFile) || (!args.npm && importFile.indexOf('.') !== 0)) {
          return;
        }

        let importDomain = importFile;
        if (importFile.indexOf('.') === 0) {
          const importPath = path.join(path.dirname(file), importFile);
          importDomain = domainFromPath(importPath);
          types[importDomain] = importDomain.includes('.') ? 'file' : 'feature';
        }
        types[importDomain] = types[importDomain] || 'npm';

        domains[domain] = domains[domain] || [];
        childrenTimes[domain] = childrenTimes[domain] || 0;
        types[domain] = domain.includes('.') ? 'file' : 'feature';
        if (!domains[domain].includes(importDomain) && importDomain !== domain && !excludes.includes(importDomain)) {
          domains[domain].push(importDomain);
          childrenTimes[domain] = (childrenTimes[domain] || 0) + 1;
        }
      });
    });

    const name = (d: string) => `A${Object.keys(types).indexOf(d)}`;
    const link = (d: string) => `-${types[d] === 'npm' ? '.' : ''}->`;
    const sortChildren = (a: string, b: string) => childrenTimes[a] - childrenTimes[b];

    writeFileSync(args.file, `# IMPORTS
\`\`\`mermaid
flowchart TB${
  Object.keys(domains).sort(sortChildren).reduce<string[]>((acc, domain) => acc.concat(
    domains[domain].map((target) => `\n  ${name(target)}["${target}"] ${link(target)} ${name(domain)}["${domain}"]`),
  ), []).join('')
}
${
  Object.keys(types).filter((domain) => !excludes.includes(domain)).map((domain) => `
  ${name(domain)}@{ shape: ${{
  file: 'notch-rect',
  feature: 'rounded',
  npm: 'odd',
}[types[domain]]}, label: "${domain}" }
  style ${name(domain)} ${{
  file: 'color:white,fill:#7D5260,stroke:#7D5260',
  feature: 'color:white,fill:#6750A4,stroke:#6750A4',
  npm: 'color:white,fill:#625B71,stroke:#625B71',
}[types[domain]]}`).join('')
}
\`\`\`
\`\`\`mermaid
flowchart TB
  subgraph Legend
    direction TB
    L1["Root File"]
    L2["Feature/Domain"]
    L3["Node Module"]
  end

  L1@{ shape: notch-rect, label: "Root File" }
  style L1 color:white,fill:#7D5260,stroke:#7D5260
  L2@{ shape: rounded, label: "Feature/Domain" }
  style L2 color:white,fill:#6750A4,stroke:#6750A4
  L3@{ shape: odd, label: "Node Module" }
  style L3 color:white,fill:#625B71,stroke:#625B71
\`\`\`
`);
    log(chalk.greenBright(`File ${args.file} generated.`));
  },
};

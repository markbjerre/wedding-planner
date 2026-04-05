/**
 * Layout file CLI — validate, inspect, normalize, merge patches, read paths.
 * Usage: npm run cli -- <command> [args]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  getAtPath,
  mergeLayoutPatch,
  parseLayoutFromJsonText,
} from '../src/lib/layoutMerge.ts';

function readStdin(): string {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function readFileOrStdin(filePath: string): string {
  if (filePath === '-') return readStdin();
  return readFileSync(resolve(filePath), 'utf8');
}

function writeOut(data: string, outPath: string | undefined): void {
  if (!outPath || outPath === '-') {
    process.stdout.write(data);
    return;
  }
  writeFileSync(resolve(outPath), data, 'utf8');
}

function cmdValidate(file: string): void {
  parseLayoutFromJsonText(readFileOrStdin(file));
  process.stderr.write('OK: layout is valid\n');
}

function cmdInfo(file: string): void {
  const layout = parseLayoutFromJsonText(readFileOrStdin(file));
  const byKind = new Map<string, number>();
  for (const s of layout.shapes) {
    byKind.set(s.kind, (byKind.get(s.kind) ?? 0) + 1);
  }
  const lines = [
    `id: ${layout.id}`,
    `name: ${layout.name}`,
    `venue: ${layout.venueName} (${layout.venueWidthM}m x ${layout.venueHeightM}m)`,
    `version: ${layout.version}`,
    `updatedAt: ${layout.updatedAt}`,
    `shapes: ${layout.shapes.length}`,
    `guests: ${layout.guests.length}`,
    `rooms: ${layout.rooms.length}`,
    `constraints: ${layout.constraints.length}`,
    'shapes by kind:',
    ...[...byKind.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, n]) => `  ${k}: ${n}`),
  ];
  process.stdout.write(lines.join('\n') + '\n');
}

function cmdNormalize(file: string, outPath: string | undefined): void {
  const layout = parseLayoutFromJsonText(readFileOrStdin(file));
  const pretty = JSON.stringify(layout, null, 2) + '\n';
  writeOut(pretty, outPath);
}

function cmdExport(file: string): void {
  cmdNormalize(file, '-');
}

function cmdApply(layoutFile: string, patchFile: string, outPath: string | undefined): void {
  const base = parseLayoutFromJsonText(readFileOrStdin(layoutFile));
  const patchRaw = JSON.parse(readFileOrStdin(patchFile)) as unknown;
  if (typeof patchRaw !== 'object' || patchRaw === null || Array.isArray(patchRaw)) {
    throw new Error('Patch must be a JSON object');
  }
  const merged = mergeLayoutPatch(base, patchRaw as Record<string, unknown>);
  const pretty = JSON.stringify(merged, null, 2) + '\n';
  writeOut(pretty, outPath);
}

function cmdGet(file: string, path: string): void {
  const layout = parseLayoutFromJsonText(readFileOrStdin(file));
  const value = getAtPath(layout, path);
  if (value === undefined) {
    process.stderr.write(`No value at path: ${path}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(JSON.stringify(value, null, 2) + '\n');
}

function printHelp(): void {
  process.stdout.write(`wedding-planner layout CLI

Usage:
  npm run cli -- validate <file.json>
  npm run cli -- info <file.json>
  npm run cli -- normalize <file.json> [-o <out.json>]
  npm run cli -- export <file.json>              (pretty JSON to stdout)
  npm run cli -- apply <layout.json> <patch.json> [-o <out.json>]
  npm run cli -- get <file.json> <dot.path>

Use "-" as file to read JSON from stdin.

Examples:
  npm run cli -- info ./my-layout.json
  npm run cli -- apply ./layout.json ./patch.json -o ./layout.json
  npm run cli -- get ./layout.json guests.0.name
  npm run cli -- normalize ./layout.json -o ./layout.json
`);
}

function parseArgs(argv: string[]): { flags: Record<string, string | boolean>; rest: string[] } {
  const flags: Record<string, string | boolean> = {};
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-o' || a === '--out') {
      const v = argv[i + 1];
      if (!v) throw new Error('Missing value for -o');
      flags.out = v;
      i++;
      continue;
    }
    if (a === '-h' || a === '--help') {
      flags.help = true;
      continue;
    }
    rest.push(a);
  }
  return { flags, rest };
}

function main(): void {
  const argv = process.argv.slice(2);
  const { flags, rest } = parseArgs(argv);

  if (flags.help || rest.length === 0) {
    printHelp();
    process.exitCode = rest.length === 0 ? 1 : 0;
    return;
  }

  const cmd = rest[0];
  const args = rest.slice(1);

  try {
    switch (cmd) {
      case 'validate': {
        if (args.length < 1) throw new Error('validate requires <file>');
        cmdValidate(args[0]!);
        break;
      }
      case 'info': {
        if (args.length < 1) throw new Error('info requires <file>');
        cmdInfo(args[0]!);
        break;
      }
      case 'normalize': {
        if (args.length < 1) throw new Error('normalize requires <file>');
        cmdNormalize(args[0]!, typeof flags.out === 'string' ? flags.out : undefined);
        break;
      }
      case 'export': {
        if (args.length < 1) throw new Error('export requires <file>');
        cmdExport(args[0]!);
        break;
      }
      case 'apply': {
        if (args.length < 2) throw new Error('apply requires <layout.json> <patch.json>');
        cmdApply(
          args[0]!,
          args[1]!,
          typeof flags.out === 'string' ? flags.out : undefined
        );
        break;
      }
      case 'get': {
        if (args.length < 2) throw new Error('get requires <file> <path>');
        cmdGet(args[0]!, args[1]!);
        break;
      }
      default:
        printHelp();
        process.exitCode = 1;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`Error: ${msg}\n`);
    process.exitCode = 1;
  }
}

main();

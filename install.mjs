#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as readline from 'node:readline/promises';

const root = path.dirname(fileURLToPath(import.meta.url));
const home = os.homedir();

const TARGETS = {
  claude: { label: 'Claude Code', bins: ['claude'] },
  gemini: { label: 'Gemini CLI', bins: ['gemini'], globalOnly: true },
  opencode: { label: 'OpenCode', bins: ['opencode'] },
  pi: { label: 'Pi', bins: ['pi'] },
};

function parseArgs(argv) {
  const result = {
    command: argv[0] && !argv[0].startsWith('-') ? argv[0] : 'install',
    agents: [],
    all: false,
    global: false,
    project: false,
    yes: false,
    link: false,
    dryRun: false,
  };

  for (let i = result.command === argv[0] ? 1 : 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--global' || arg === '-g') result.global = true;
    else if (arg === '--project' || arg === '-p') result.project = true;
    else if (arg === '--yes' || arg === '-y') result.yes = true;
    else if (arg === '--all') result.all = true;
    else if (arg === '--link') result.link = true;
    else if (arg === '--copy') result.link = false;
    else if (arg === '--dry-run') result.dryRun = true;
    else if (arg === '--agent' || arg === '-a') result.agents.push(argv[++i]);
    else if (arg.startsWith('--agent=')) result.agents.push(arg.slice('--agent='.length));
    else if (!arg.startsWith('-')) result.agents.push(arg);
  }

  return result;
}

function usage() {
  console.log(`Usage:
  npx daddy-chill install [options]
  npx daddy-chill uninstall [options]
  npx daddy-chill status [--global|--project]

Options:
  -a, --agent <name>  Install one host. Repeat for several hosts.
      --all          Install every supported host.
  -g, --global       Install for the current user.
  -p, --project      Install in the current project.
  -y, --yes          Skip prompts.
      --copy         Copy package files. This is the default.
      --link         Symlink package files.
      --dry-run       Show changes without writing files.

Hosts: claude, gemini, opencode, pi`);
}

function commandExists(command) {
  const lookup = process.platform === 'win32' ? 'where.exe' : 'which';
  return spawnSync(lookup, [command], { stdio: 'ignore' }).status === 0;
}

function detectedAgents() {
  return Object.entries(TARGETS)
    .filter(([, target]) => target.bins.some(commandExists))
    .map(([name]) => name);
}

function exists(target) {
  try {
    fs.lstatSync(target);
    return true;
  } catch {
    return false;
  }
}

function removePath(target, dryRun) {
  if (!exists(target)) return;
  if (!dryRun) fs.rmSync(target, { recursive: true, force: true });
  console.log(`${dryRun ? 'would remove' : 'removed'} ${target}`);
}

function copyPackage(source, target) {
  fs.cpSync(source, target, {
    recursive: true,
    filter: (entry) => {
      const relative = path.relative(source, entry);
      return !relative.split(path.sep).some((part) => [
        '.git', 'node_modules', 'dist', '.flue-vite', '.env', 'vitest-results.json',
      ].includes(part));
    },
  });
}

function installPackage(source, target, link, dryRun) {
  if (dryRun) {
    console.log(`${link ? 'would link' : 'would copy'} ${source} -> ${target}`);
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.rmSync(target, { recursive: true, force: true });
  if (link) fs.symlinkSync(source, target, 'dir');
  else copyPackage(source, target);
  console.log(`${link ? 'linked' : 'copied'} ${target}`);
}

function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function pathsFor(scope, cwd) {
  const base = scope === 'global' ? home : cwd;
  const claudeRoot = scope === 'global'
    ? path.join(base, '.claude', 'skills', 'daddy-chill')
    : path.join(base, '.claude', 'skills', 'daddy-chill');
  const geminiRoot = path.join(base, '.gemini', 'extensions', 'daddy-chill');
  const opencodeRoot = scope === 'global'
    ? path.join(base, '.config', 'opencode', 'daddy-chill')
    : path.join(base, '.daddy-chill', 'opencode');
  const opencodeConfig = scope === 'global'
    ? path.join(base, '.config', 'opencode', 'opencode.json')
    : path.join(base, 'opencode.json');
  const piRoot = scope === 'global'
    ? path.join(base, '.pi', 'agent', 'packages', 'daddy-chill')
    : path.join(base, '.daddy-chill', 'pi');
  const piSettings = scope === 'global'
    ? path.join(base, '.pi', 'agent', 'settings.json')
    : path.join(base, '.pi', 'settings.json');

  return { claudeRoot, geminiRoot, opencodeRoot, opencodeConfig, piRoot, piSettings };
}

function updateOpenCodeConfig(filePath, pluginPath, add, dryRun) {
  const config = readJson(filePath);
  const plugins = Array.isArray(config.plugin) ? config.plugin : [];
  const next = add
    ? [...plugins.filter((item) => item !== pluginPath), pluginPath]
    : plugins.filter((item) => item !== pluginPath);

  if (dryRun) {
    console.log(`${add ? 'would add' : 'would remove'} ${pluginPath} in ${filePath}`);
    return;
  }

  if (next.length) config.plugin = next;
  else delete config.plugin;
  writeJson(filePath, config);
  console.log(`${add ? 'updated' : 'cleaned'} ${filePath}`);
}

function updatePiSettings(filePath, packagePath, add, dryRun) {
  const settings = readJson(filePath);
  const packages = Array.isArray(settings.packages) ? settings.packages : [];
  const next = add
    ? [...packages.filter((item) => item !== packagePath), packagePath]
    : packages.filter((item) => item !== packagePath);

  if (dryRun) {
    console.log(`${add ? 'would add' : 'would remove'} ${packagePath} in ${filePath}`);
    return;
  }

  if (next.length) settings.packages = next;
  else delete settings.packages;
  writeJson(filePath, settings);
  console.log(`${add ? 'updated' : 'cleaned'} ${filePath}`);
}

async function ask(question, defaultValue = '') {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`${question}${defaultValue ? ` [${defaultValue}]` : ''} `)).trim();
    return answer || defaultValue;
  } finally {
    rl.close();
  }
}

async function chooseAgents(options) {
  const valid = new Set(Object.keys(TARGETS));
  const explicit = options.agents.filter((name) => valid.has(name));
  const invalid = options.agents.filter((name) => !valid.has(name));
  if (invalid.length) throw new Error(`Unknown host: ${invalid.join(', ')}`);
  if (options.all) return Object.keys(TARGETS);
  if (explicit.length) return [...new Set(explicit)];

  const detected = detectedAgents();
  if (options.yes || !process.stdin.isTTY || !process.stdout.isTTY) {
    if (detected.length) return detected;
    throw new Error('No supported CLI detected. Use --all or --agent <name>.');
  }

  console.log('\nDetected CLIs:');
  for (const [name, target] of Object.entries(TARGETS)) {
    console.log(`  ${name.padEnd(10)} ${target.bins.some(commandExists) ? 'found' : 'not found'}  ${target.label}`);
  }
  const defaultSelection = detected.length ? detected.join(',') : 'claude';
  const answer = await ask('\nChoose hosts (comma-separated names, or all):', defaultSelection);
  if (answer.toLowerCase() === 'all') return Object.keys(TARGETS);
  const selected = answer.split(',').map((name) => name.trim()).filter(Boolean);
  const unknown = selected.filter((name) => !valid.has(name));
  if (unknown.length) throw new Error(`Unknown host: ${unknown.join(', ')}`);
  return [...new Set(selected)];
}

async function chooseScope(options) {
  if (options.global && options.project) throw new Error('Use only one of --global or --project.');
  if (options.global) return 'global';
  if (options.project) return 'project';
  if (options.yes || !process.stdin.isTTY || !process.stdout.isTTY) return 'global';
  const answer = await ask('Install globally or in this project? (global/project)', 'global');
  if (answer !== 'global' && answer !== 'project') throw new Error('Scope must be global or project.');
  return answer;
}

function installedFor(agent, scope, paths) {
  if (agent === 'claude') return exists(paths.claudeRoot);
  if (agent === 'gemini') return exists(paths.geminiRoot);
  if (agent === 'opencode') return exists(paths.opencodeRoot);
  if (agent === 'pi') return exists(paths.piRoot);
  return false;
}

function installAgent(agent, scope, paths, options) {
  const target = agent === 'claude' ? paths.claudeRoot
    : agent === 'gemini' ? paths.geminiRoot
      : agent === 'opencode' ? paths.opencodeRoot
        : paths.piRoot;

  installPackage(root, target, options.link, options.dryRun);

  if (agent === 'opencode') {
    const pluginPath = scope === 'global'
      ? path.join(paths.opencodeRoot, '.opencode', 'plugins', 'daddy-chill.mjs')
      : './.daddy-chill/opencode/.opencode/plugins/daddy-chill.mjs';
    updateOpenCodeConfig(paths.opencodeConfig, pluginPath, true, options.dryRun);
  }

  if (agent === 'pi') {
    const packagePath = scope === 'global' ? paths.piRoot : '../.daddy-chill/pi';
    updatePiSettings(paths.piSettings, packagePath, true, options.dryRun);
  }
}

function uninstallAgent(agent, scope, paths, options) {
  const target = agent === 'claude' ? paths.claudeRoot
    : agent === 'gemini' ? paths.geminiRoot
      : agent === 'opencode' ? paths.opencodeRoot
        : paths.piRoot;

  if (agent === 'opencode') {
    const pluginPath = scope === 'global'
      ? path.join(paths.opencodeRoot, '.opencode', 'plugins', 'daddy-chill.mjs')
      : './.daddy-chill/opencode/.opencode/plugins/daddy-chill.mjs';
    updateOpenCodeConfig(paths.opencodeConfig, pluginPath, false, options.dryRun);
  }

  if (agent === 'pi') {
    const packagePath = scope === 'global' ? paths.piRoot : '../.daddy-chill/pi';
    updatePiSettings(paths.piSettings, packagePath, false, options.dryRun);
  }

  removePath(target, options.dryRun);
}

function showStatus(scope, cwd) {
  const paths = pathsFor(scope, cwd);
  console.log(`${scope} installation:`);
  for (const [name, target] of Object.entries(TARGETS)) {
    console.log(`  ${name.padEnd(10)} ${installedFor(name, scope, paths) ? 'installed' : 'not installed'}`);
  }
}

const options = parseArgs(process.argv.slice(2));

try {
  if (options.command === 'help' || options.command === '--help') {
    usage();
    process.exit(0);
  }

  const cwd = process.cwd();
  const scope = await chooseScope(options);
  if (options.command === 'status') {
    showStatus(scope, cwd);
    process.exit(0);
  }
  const agents = await chooseAgents(options);
  const paths = pathsFor(scope, cwd);

  if (options.command !== 'install' && options.command !== 'uninstall') {
    usage();
    process.exit(1);
  }

  const unsupported = scope === 'project'
    ? agents.filter((name) => TARGETS[name].globalOnly)
    : [];
  for (const agent of unsupported) {
    console.log(`Skipping ${TARGETS[agent].label}: it supports global extension installs only.`);
  }

  const selected = agents.filter((agent) => !unsupported.includes(agent));
  if (!selected.length) throw new Error('No compatible hosts selected for this scope.');

  if (!options.yes && process.stdin.isTTY && process.stdout.isTTY) {
    const action = options.command === 'install' ? 'Install' : 'Remove';
    const answer = await ask(`${action} Daddy Chill for ${selected.join(', ')} (${scope})? (y/n)`, 'y');
    if (!['y', 'yes'].includes(answer.toLowerCase())) {
      console.log('Cancelled.');
      process.exit(0);
    }
  }

  for (const agent of selected) {
    if (options.command === 'install') installAgent(agent, scope, paths, options);
    else uninstallAgent(agent, scope, paths, options);
  }

  if (!options.dryRun) console.log('\nDone. Restart the selected CLI sessions.');
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}

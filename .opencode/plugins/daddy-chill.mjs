import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatCommandResult, handleCommand, getInstructions } from '../../runtime/command.mjs';
import { getDefaultMode, resolveSessionMode } from '../../runtime/mode.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const statePath = path.join(
  process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
  'daddy-chill',
  'opencode.mode',
);

function readMode() {
  try { return fs.readFileSync(statePath, 'utf8').trim() || getDefaultMode(); } catch { return getDefaultMode(); }
}

function writeMode(mode) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${mode}\n`);
}

export default async () => ({
  config: async (config) => {
    config.command = config.command || {};
    config.command['daddy-chill'] = {
      description: 'Turn Daddy Chill on, turn it off, or show its current status.',
      template: 'Process the Daddy Chill command: $ARGUMENTS. Valid modes are on, off, and status. Report the state briefly.',
    };
    config.skills = config.skills || {};
    config.skills.paths = config.skills.paths || [];
    const skillsPath = path.join(root, 'skills');
    if (!config.skills.paths.includes(skillsPath)) config.skills.paths.push(skillsPath);
  },

  'experimental.chat.system.transform': async (_input, output) => {
    const mode = readMode();
    if (mode === 'on') output.system.push(getInstructions(mode));
  },

  'command.execute.before': async (input) => {
    const text = input?.command === 'daddy-chill' ? `/daddy-chill ${input.arguments || ''}` : '';
    const result = handleCommand(text, 'opencode', 'process');
    if (result?.type === 'set-mode') writeMode(result.mode);
    if (result?.type === 'status') writeMode(resolveSessionMode('opencode', 'process'));
    return result ? { message: formatCommandResult(result) } : undefined;
  },
});

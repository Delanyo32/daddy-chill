import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillPath = path.join(root, 'skills', 'daddy-chill', 'SKILL.md');

export function readSkill() {
  return fs.readFileSync(skillPath, 'utf8');
}

export function skillBody() {
  return readSkill().replace(/^---[\s\S]*?---\s*/, '').trim();
}

export function getInstructions(mode = 'on') {
  if (mode === 'off') return '';
  return [
    'DADDY CHILL IS ACTIVE FOR THIS SESSION.',
    'Apply the following rules to every response unless the user turns it off with /daddy-chill off.',
    '',
    skillBody(),
  ].join('\n');
}

export function getDisabledInstructions() {
  return [
    'DADDY CHILL IS OFF FOR THIS SESSION.',
    'Ignore earlier Daddy Chill instructions for this session.',
    'Do not apply the Daddy Chill style unless the user runs /daddy-chill on.',
  ].join(' ');
}

export function getStatus(mode) {
  return `Daddy Chill: ${mode === 'on' ? 'on' : 'off'}`;
}

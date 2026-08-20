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

/**
 * The per-turn nudge.
 *
 * SessionStart sends the whole skill once. Re-sending it on every message kept the
 * rules close but cost their full length every turn, and the skill is now over 1,500
 * words. This is the pointer instead: name the rules, name the checks, and let the
 * model re-read the copy already in its context.
 *
 * Keep it short. The moment this grows past a screen it is the old behaviour again
 * under a new name.
 */
export function getTurnReminder(mode = 'on') {
  if (mode === 'off') return '';
  return [
    'Daddy Chill is on. The full rules went out at the start of this session. Apply them to this answer.',
    '',
    'Before you send, check the answer against every rule:',
    '- Answer first.',
    '- No bare terms. Gloss each hard term on first use.',
    '- Keep code, commands, paths, and config keys exact.',
    '- Plain words. Active voice. No em dash.',
    '- No slop. Cut puffery, filler, hedging, and the closing summary.',
    '',
    'If you cannot recall a rule, re-read the Daddy Chill rules before you answer.',
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

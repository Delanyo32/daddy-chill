import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { ALWAYS_ON_INSTRUCTIONS, SKILL_BODY } from './rules.ts';

const SKILL_PATH = path.resolve(import.meta.dirname, '../../skills/daddy-chill/SKILL.md');

/** Same strip as runtime/instructions.mjs, so all three consumers see one body. */
function skillBodyFromDisk(): string {
	return fs.readFileSync(SKILL_PATH, 'utf8').replace(/^---[\s\S]*?---\s*/, '').trim();
}

test('the agent copy of the rules matches SKILL.md', () => {
	expect(SKILL_BODY).toBe(skillBodyFromDisk());
});

test('the always-on block still contains the rules', () => {
	expect(ALWAYS_ON_INSTRUCTIONS).toContain(SKILL_BODY);
});

test('the rules obey their own em dash rule', () => {
	expect(SKILL_BODY).not.toContain('—');
});

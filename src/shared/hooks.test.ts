import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, expect, test } from 'vitest';

/**
 * The hooks are the only thing that keeps the rules in context after turn one,
 * so the branch that decides whether to re-send them gets a check.
 */
const ROOT = path.resolve(import.meta.dirname, '../..');
const CONFIG_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'daddy-chill-hooks-'));

afterAll(() => fs.rmSync(CONFIG_DIR, { recursive: true, force: true }));

function run(hook: string, input: object, env: Record<string, string> = {}): string {
	return execFileSync('node', [path.join(ROOT, 'hooks', hook)], {
		input: JSON.stringify(input),
		encoding: 'utf8',
		env: { ...process.env, DADDY_CHILL_CONFIG_DIR: CONFIG_DIR, ...env },
	});
}

test('an ordinary message re-sends the rules when the mode is on', () => {
	run('claude-prompt-submit.mjs', { prompt: '/daddy-chill on', session_id: 'on-session' });
	const out = run('claude-prompt-submit.mjs', { prompt: 'why is the build slow?', session_id: 'on-session' });
	expect(JSON.parse(out).hookSpecificOutput.additionalContext).toContain('Gloss every term');
});

test('an ordinary message sends nothing when the mode is off', () => {
	run('claude-prompt-submit.mjs', { prompt: '/daddy-chill off', session_id: 'off-session' });
	const out = run('claude-prompt-submit.mjs', { prompt: 'why is the build slow?', session_id: 'off-session' });
	// Silence, not an empty object: the hook returns before it writes anything.
	expect(out).toBe('');
});

test('the status command still answers', () => {
	const out = run('claude-prompt-submit.mjs', { prompt: '/daddy-chill status', session_id: 'on-session' });
	expect(JSON.parse(out).hookSpecificOutput.additionalContext).toContain('Daddy Chill: on');
});

test('the codex host announces a command but stays silent on an ordinary message', () => {
	const command = run('claude-prompt-submit.mjs', { prompt: '/daddy-chill on', session_id: 'codex' }, { PLUGIN_DATA: '1' });
	expect(JSON.parse(command).systemMessage).toBe('DADDY_CHILL:ON');

	const ordinary = run('claude-prompt-submit.mjs', { prompt: 'why is the build slow?', session_id: 'codex' }, { PLUGIN_DATA: '1' });
	const parsed = JSON.parse(ordinary);
	expect(parsed.systemMessage).toBeUndefined();
	expect(parsed.hookSpecificOutput.additionalContext).toContain('Gloss every term');
});

test('copilot re-sends the rules on an ordinary message', () => {
	run('copilot-prompt-submit.mjs', { prompt: '/daddy-chill on', session_id: 'copilot' });
	const out = run('copilot-prompt-submit.mjs', { prompt: 'why is the build slow?', session_id: 'copilot' });
	expect(JSON.parse(out).additionalContext).toContain('Gloss every term');
});

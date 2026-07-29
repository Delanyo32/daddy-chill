import { expect, test } from 'vitest';
import { Bash } from 'just-bash';
import { NETWORK } from './sandbox.ts';

// The agents are useless for URL-bearing prompts if curl silently stops working,
// and just-bash registers curl only when a network config is present. This is the
// check that fails when that breaks.
test('curl reaches the public web with our network config', async () => {
	const result = await new Bash({ network: NETWORK }).exec('curl -sS https://example.com');

	expect(result.stderr).toBe('');
	expect(result.exitCode).toBe(0);
	expect(result.stdout).toContain('Example Domain');
}, 30_000);

test('html-to-markdown is available for reading pages', async () => {
	const result = await new Bash({ network: NETWORK }).exec(
		'curl -sS https://example.com | html-to-markdown',
	);

	expect(result.exitCode).toBe(0);
	expect(result.stdout).toContain('Example Domain');
});

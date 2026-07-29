import { expect, test } from 'vitest';
import { measure, toProse } from './metrics.ts';

const HARD = `## Authentication overview

Subsequent to the initialization of the authorization sequence, the resource
owner is redirected to the authorization server, whereupon the aforementioned
server authenticates the principal and subsequently issues an authorization
code which is exchangeable for a bearer token via the token endpoint.`;

const EASY = `## How login works

- You click "log in".
- The site sends you to the login page.
- You type your password there.
- The site sends you back with a code.
- Your app swaps that code for a token.`;

test('markdown scaffolding does not count as prose', () => {
	expect(toProse('## Title\n- `npm i` runs it\n[docs](http://x.com)')).toBe('Title. Runs it. Docs.');
});

test('bullets are graded as separate sentences', () => {
	// text-readability only ends a sentence before a capital letter, so without
	// toProse these 5 bullets count as one ~35-word sentence.
	expect(measure(EASY).avgSentenceLength).toBeLessThan(12);
});

test('plain writing scores below dense writing on every metric', () => {
	const hard = measure(HARD);
	const easy = measure(EASY);

	expect(easy.grade).toBeLessThan(hard.grade);
	expect(easy.words).toBeLessThan(hard.words);
	expect(easy.difficultRatio).toBeLessThan(hard.difficultRatio);
	expect(easy.avgSentenceLength).toBeLessThan(hard.avgSentenceLength);
	expect(easy.grade).toBeLessThanOrEqual(8);
});

test('empty output does not divide by zero', () => {
	expect(measure('')).toMatchObject({ grade: 0, words: 0, avgSentenceLength: 0 });
});

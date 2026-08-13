import { expect, test } from 'vitest';
import {
	bareIdentifiers,
	difficultRatio,
	identifiers,
	looksTechnical,
	maxParagraphSentences,
	measure,
	median,
	numberDensity,
	synonymDrift,
	tenseViolations,
	toProse,
} from './metrics.ts';

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

test('one long sentence fails even when the average passes', () => {
	// Four short bullets pull the average down to ~7, so only the max catches this.
	const sneaky = `${EASY}\n- The service then reconciles every pending write across all three regions before it finally acknowledges the original request to the caller.`;
	const m = measure(sneaky);

	expect(m.avgSentenceLength).toBeLessThan(12);
	expect(m.maxSentenceLength).toBeGreaterThan(20);
});

test('bullets are not paragraphs', () => {
	// Six bullets are fine. Six sentences jammed into one block are not.
	expect(maxParagraphSentences(EASY)).toBe(0);
	expect(maxParagraphSentences('A. B. C. D. E. F. G.')).toBe(7);
});

test('paragraphs are counted separately', () => {
	expect(maxParagraphSentences('One. Two.\n\nThree. Four. Five.')).toBe(3);
});

test('code blocks do not count as paragraph prose', () => {
	expect(maxParagraphSentences('Run it.\n\n```\na. b. c. d. e. f. g.\n```')).toBe(1);
});

test('present perfect and progressive verbs are flagged', () => {
	expect(tenseViolations('We have received the reports.')).toBe(1);
	expect(tenseViolations('The build is running now.')).toBe(1);
	expect(tenseViolations('We received the reports. The build runs now.')).toBe(0);
});

test('synonyms for one idea are counted', () => {
	expect(synonymDrift('Verify the input, then check the output, then confirm it.')).toBe(2);
	expect(synonymDrift('Check the input, then check the output.')).toBe(0);
});

test('repeating a hard word no longer improves the jargon score', () => {
	// The shipped version divided a SET of hard words by total words, so the same
	// sentence ten times scored 0.050 against 0.500. This is that regression.
	expect(difficultRatio('Quantization matters.')).toBeCloseTo(0.5);
	expect(difficultRatio('Quantization matters. '.repeat(10))).toBeCloseTo(0.5);
});

test('identifier shapes are recognised, English words are not', () => {
	for (const token of ['RSS', 'PCIe', 'NVMe', 'MADV_WILLNEED', 'vmhwm_mb', 'assignLayers', 'x86'])
		expect(looksTechnical(token), token).toBe(true);
	for (const token of ['login', 'cache', 'the', 'buffer', 'Set']) expect(looksTechnical(token), token).toBe(false);
	// English words in caps are not terms. The first full run flagged a SQL example.
	for (const token of ['SELECT', 'FROM', 'WHERE', 'ON', 'ORDER', 'JOIN']) expect(looksTechnical(token), token).toBe(false);
	// Units a reader already knows. p99 and rps are still jargon.
	for (const token of ['MB', 'GB', 'ms']) expect(looksTechnical(token), token).toBe(false);
	for (const token of ['p99', 'QPS']) expect(looksTechnical(token), token).toBe(true);
});

test('a sentence-ending period is not part of the identifier', () => {
	// "TARGET_DIRECTORY." used to be its own token, so no gloss could ever match it.
	expect(identifiers('Set TARGET_DIRECTORY. It is the folder the script empties.')).toEqual(['TARGET_DIRECTORY']);
	expect(bareIdentifiers('Set TARGET_DIRECTORY. It is the folder that the script empties for you.')).toEqual([]);
});

test('a one-word inline code span is an identifier even when its shape is plain', () => {
	expect(identifiers('Run `pnpm` first.')).toEqual(['pnpm']);
	// Multi-word spans are commands, not terms being named.
	expect(identifiers('Run `git rebase main` first.')).toEqual([]);
});

test('an explained identifier passes and a bare one fails', () => {
	const explained = 'Set `revisionHistoryLimit`. It is the number of old versions that the cluster keeps on disk.';
	expect(bareIdentifiers(explained)).toEqual([]);
	expect(bareIdentifiers('Set `revisionHistoryLimit`. Then redeploy.')).toEqual(['revisionHistoryLimit']);
});

test('column labels that never leave the code fence are bare', () => {
	// This is the exact shape that failed the reader: a results table, no gloss.
	expect(bareIdentifiers('Results below.\n\n```\nread_mb 356.3\nvmhwm_mb 129.9\n```')).toEqual([
		'read_mb',
		'vmhwm_mb',
	]);
});

test('numbers are counted per 100 words, including inside tables', () => {
	expect(numberDensity('The build failed twice today.')).toBe(0);
	// 2 numbers over 2 words: a bare results table is as dense as text gets.
	expect(numberDensity('read_mb 356.3\nvmhwm_mb 129.9')).toBe(100);
	// The same two numbers carried by a sentence.
	expect(numberDensity('The stream arm held 129.9 MB and read 356.3 MB.')).toBeLessThan(30);
});

test('a table of measurements scores harder than the same claim in words', () => {
	const table = measure('Results.\n\n```\nread_mb 356.3 359.5 341.3\nvmhwm_mb 129.9 46.0 73.1\n```');
	const words = measure('The stream arm held less memory than the full arm, and read fewer bytes.');

	expect(table.numberDensity).toBeGreaterThan(words.numberDensity);
	expect(table.bare.length).toBeGreaterThan(words.bare.length);
});

test('median ignores one runaway value', () => {
	expect(median([1, 2, 3, 400])).toBe(2.5);
	expect(median([5, 1, 3])).toBe(3);
	expect(median([])).toBe(0);
});

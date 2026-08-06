import { expect, test } from 'vitest';
import {
	maxParagraphSentences,
	measure,
	median,
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

test('median ignores one runaway value', () => {
	expect(median([1, 2, 3, 400])).toBe(2.5);
	expect(median([5, 1, 3])).toBe(3);
	expect(median([])).toBe(0);
});

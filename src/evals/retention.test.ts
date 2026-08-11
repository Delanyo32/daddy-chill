import { expect, test } from 'vitest';
import { buildJudgeInput, parseJudgeOutput } from './retention.ts';

test('the judge sees the question and both answers', () => {
	const input = buildJudgeInput('Why?', 'Long answer.', 'Short.');
	expect(input).toContain('QUESTION:\nWhy?');
	expect(input).toContain('REFERENCE ANSWER:\nLong answer.');
	expect(input).toContain('SHORT ANSWER:\nShort.');
});

test('JSON wrapped in fences and prose still parses', () => {
	const raw =
		'Here is my score:\n```json\n{"total": 10, "covered": 6, "needed": 5, "neededCovered": 5, "missing": [], "unexplained": []}\n```\nDone.';
	expect(parseJudgeOutput(raw)).toEqual({
		total: 10,
		covered: 6,
		needed: 5,
		neededCovered: 5,
		neededRatio: 1,
		missing: [],
		unexplained: [],
	});
});

test('dropping background does not count against the gate', () => {
	// The whole reason the gate is on neededRatio: this answer kept everything the
	// reader needed to act and left out the background. That is fine, not a failure.
	const scored = parseJudgeOutput('{"total": 15, "covered": 9, "needed": 9, "neededCovered": 9}');
	expect(scored.covered).toBe(9);
	expect(scored.neededRatio).toBe(1);
});

test('a dropped needed fact lowers the ratio', () => {
	const scored = parseJudgeOutput('{"total": 12, "covered": 7, "needed": 8, "neededCovered": 6}');
	expect(scored.neededRatio).toBe(0.75);
});

test('covered cannot exceed total, and needed cannot exceed either', () => {
	expect(parseJudgeOutput('{"total": 5, "covered": 9, "needed": 5, "neededCovered": 5}')).toMatchObject({
		covered: 5,
	});
	expect(parseJudgeOutput('{"total": 5, "covered": 5, "needed": 8, "neededCovered": 8}')).toMatchObject({
		needed: 5,
		neededCovered: 5,
	});
});

test('unexplained terms come through, and are optional', () => {
	expect(
		parseJudgeOutput('{"total": 4, "covered": 4, "needed": 4, "neededCovered": 4, "unexplained": ["pg_restore", "PITR"]}').unexplained,
	).toEqual(['pg_restore', 'PITR']);
	// A judge that omits the field must not throw. It is reported, not gated.
	expect(parseJudgeOutput('{"total": 4, "covered": 4, "needed": 4, "neededCovered": 4}').unexplained).toEqual([]);
});

test('a garbled judge reply throws instead of scoring zero', () => {
	// A silent 0 would read as "the skill dropped every fact", failing the wrong thing.
	expect(() => parseJudgeOutput('I could not do that.')).toThrow(/no JSON object/);
	expect(() => parseJudgeOutput('{"note": "hi"}')).toThrow(/no counts/);
	expect(() => parseJudgeOutput('{"total": 0, "covered": 0}')).toThrow(/no facts/);
	expect(() => parseJudgeOutput('{"total": 10, "covered": 4}')).toThrow(/no needed counts/);
});

import { expect, test } from 'vitest';
import { buildJudgeInput, factDensity, parseJudgeOutput } from './retention.ts';

test('the judge sees the question and both answers', () => {
	const input = buildJudgeInput('Why?', 'Long answer.', 'Short.');
	expect(input).toContain('QUESTION:\nWhy?');
	expect(input).toContain('REFERENCE ANSWER:\nLong answer.');
	expect(input).toContain('SHORT ANSWER:\nShort.');
});

test('JSON wrapped in fences and prose still parses', () => {
	const raw =
		'Here is my score:\n```json\n{"total": 10, "covered": 6, "core": 5, "coreCovered": 5, "missing": []}\n```\nDone.';
	expect(parseJudgeOutput(raw)).toEqual({
		total: 10,
		covered: 6,
		ratio: 0.6,
		core: 5,
		coreCovered: 5,
		coreRatio: 1,
		missing: [],
	});
});

test('dropping padding scores worse on ratio than on coreRatio', () => {
	// The whole reason the gate is on coreRatio: this answer kept everything the
	// reader needed and threw away the tangents. That is the goal, not a failure.
	const scored = parseJudgeOutput('{"total": 15, "covered": 9, "core": 9, "coreCovered": 9}');
	expect(scored.ratio).toBe(0.6);
	expect(scored.coreRatio).toBe(1);
});

test('covered cannot exceed total, and core cannot exceed either', () => {
	expect(parseJudgeOutput('{"total": 5, "covered": 9, "core": 5, "coreCovered": 5}')).toMatchObject({
		covered: 5,
		ratio: 1,
	});
	expect(parseJudgeOutput('{"total": 5, "covered": 5, "core": 8, "coreCovered": 8}')).toMatchObject({
		core: 5,
		coreCovered: 5,
	});
});

test('a garbled judge reply throws instead of scoring zero', () => {
	// A silent 0 would read as "the skill dropped every fact", failing the wrong thing.
	expect(() => parseJudgeOutput('I could not do that.')).toThrow(/no JSON object/);
	expect(() => parseJudgeOutput('{"note": "hi"}')).toThrow(/no counts/);
	expect(() => parseJudgeOutput('{"total": 0, "covered": 0}')).toThrow(/no facts/);
	expect(() => parseJudgeOutput('{"total": 10, "covered": 4}')).toThrow(/no core counts/);
});

test('density rewards keeping facts in fewer words', () => {
	expect(factDensity(8, 200)).toBe(4);
	expect(factDensity(8, 100)).toBe(8);
	expect(factDensity(8, 0)).toBe(0);
});

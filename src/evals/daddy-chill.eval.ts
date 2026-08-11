import { afterAll, expect } from 'vitest';
import { describeEval } from 'vitest-evals';
import { createFlueAgentHarness, promptJudgeAgent, promptPlainAgent } from './harness.ts';
import { measure, median, type Metrics } from './metrics.ts';
import { buildJudgeInput, parseJudgeOutput, type Retention } from './retention.ts';
import prompts from './prompts.json' with { type: 'json' };

const GRADE_CEILING = 8;
const SENTENCE_CEILING = 20;
const PARAGRAPH_CEILING = 6;
const ACTIONABLE_FLOOR = 0.8;

interface Sample {
	before: Metrics;
	after: Metrics;
	retention: Retention;
}

const samples: Sample[] = [];

const harness = createFlueAgentHarness({ agentName: process.env.EVAL_AGENT ?? 'daddy-chill' });

describeEval('daddy-chill simplifies without dropping what the reader needs', { harness }, (it) => {
	for (const prompt of prompts) {
		it(prompt, async ({ run, signal }) => {
			const [skilled, baselineText] = await Promise.all([
				run(prompt),
				promptPlainAgent(prompt, signal),
			]);

			const after = measure(skilled.output);
			const before = measure(baselineText);
			const retention = parseJudgeOutput(
				await promptJudgeAgent(buildJudgeInput(prompt, baselineText, skilled.output), signal),
			);

			samples.push({ before, after, retention });

			// Reported in the JSON eval report, and printed when an assert fails.
			// Word count is reported, never gated: a clear answer is allowed to be longer.
			console.log(
				`\n${prompt}\n` +
					`  grade    ${before.grade.toFixed(1)} -> ${after.grade.toFixed(1)}\n` +
					`  standard ${before.standard.toFixed(1)} -> ${after.standard.toFixed(1)}\n` +
					`  words    ${before.words} -> ${after.words}\n` +
					`  jargon   ${(before.difficultRatio * 100).toFixed(1)}% -> ${(after.difficultRatio * 100).toFixed(1)}%\n` +
					`  sent len ${before.avgSentenceLength.toFixed(1)} -> ${after.avgSentenceLength.toFixed(1)} (max ${before.maxSentenceLength} -> ${after.maxSentenceLength})\n` +
					`  para max ${before.maxParagraphSentences} -> ${after.maxParagraphSentences}\n` +
					`  tense    ${before.tenseViolations} -> ${after.tenseViolations}\n` +
					`  synonyms ${before.synonymDrift} -> ${after.synonymDrift}\n` +
					`  needed   ${retention.neededCovered}/${retention.needed} kept (${retention.covered}/${retention.total} of all facts)` +
					(retention.missing.length ? `, dropped: ${retention.missing.join('; ')}` : '') +
					'\n' +
					`  bare     ${retention.unexplained.length ? retention.unexplained.join('; ') : 'none'}`,
			);

			// Per prompt: things one answer either does or does not do. No baseline needed.
			expect(after.maxSentenceLength, 'longest sentence').toBeLessThanOrEqual(SENTENCE_CEILING);
			expect(after.maxParagraphSentences, 'longest paragraph').toBeLessThanOrEqual(PARAGRAPH_CEILING);
			expect(skilled.output, 'no em dashes').not.toContain('—');
			// Gated on what a reader needs to act, not on every fact. The baseline
			// volunteers tangents the question never asked for, so grading against all
			// of them would mean the only way to pass is to repeat the baseline.
			//
			// One dropped fact is tolerated, because a ratio gate has a denominator
			// problem: with 4 needed facts the only scores are 1.0, 0.75, and 0.5, so
			// `>= 0.8` silently becomes zero-misses whenever the judge finds few facts.
			// Two dropped facts is a real miss at any size, and the median gate below
			// still catches loss spread thinly across every prompt.
			if (retention.needed - retention.neededCovered > 1) {
				expect(
					retention.neededRatio,
					`facts needed to act${retention.missing.length ? `, dropped: ${retention.missing.join('; ')}` : ''}`,
				).toBeGreaterThanOrEqual(ACTIONABLE_FLOOR);
			}
		});
	}

	// Medians, not per prompt. Reading level swings with the question, so a single
	// answer proves nothing. The skill's effect shows across the set.
	afterAll(() => {
		if (samples.length === 0) return;

		const med = (pick: (sample: Sample) => number) => median(samples.map(pick));
		const bare = samples.reduce((n, s) => n + s.retention.unexplained.length, 0);

		console.log(
			`\nmedians over ${samples.length} prompts\n` +
				`  grade    ${med((s) => s.before.grade).toFixed(2)} -> ${med((s) => s.after.grade).toFixed(2)}\n` +
				`  standard ${med((s) => s.before.standard).toFixed(2)} -> ${med((s) => s.after.standard).toFixed(2)}\n` +
				`  words    ${med((s) => s.before.words).toFixed(1)} -> ${med((s) => s.after.words).toFixed(1)}  (reported, not gated)\n` +
				`  jargon   ${(med((s) => s.before.difficultRatio) * 100).toFixed(2)}% -> ${(med((s) => s.after.difficultRatio) * 100).toFixed(2)}%\n` +
				`  sent len ${med((s) => s.before.avgSentenceLength).toFixed(2)} -> ${med((s) => s.after.avgSentenceLength).toFixed(2)}\n` +
				`  tense    ${med((s) => s.before.tenseViolations).toFixed(1)} -> ${med((s) => s.after.tenseViolations).toFixed(1)}\n` +
				`  synonyms ${med((s) => s.before.synonymDrift).toFixed(1)} -> ${med((s) => s.after.synonymDrift).toFixed(1)}\n` +
				`  needed   ${(med((s) => s.retention.neededRatio) * 100).toFixed(1)}% kept, all facts ${(med((s) => s.retention.total ? s.retention.covered / s.retention.total : 1) * 100).toFixed(1)}%\n` +
				`  bare     ${bare} unexplained terms across ${samples.length} answers (reported, not gated)`,
		);

		expect(med((s) => s.after.grade), 'median reading level ceiling').toBeLessThanOrEqual(GRADE_CEILING);
		expect(med((s) => s.after.grade), 'median reading level vs baseline').toBeLessThan(med((s) => s.before.grade));
		expect(med((s) => s.after.difficultRatio), 'median jargon vs baseline').toBeLessThan(med((s) => s.before.difficultRatio));
		expect(med((s) => s.after.avgSentenceLength), 'median sentence length ceiling').toBeLessThanOrEqual(SENTENCE_CEILING);
		expect(med((s) => s.after.tenseViolations), 'median tense violations vs baseline').toBeLessThanOrEqual(med((s) => s.before.tenseViolations));
		expect(med((s) => s.after.synonymDrift), 'median synonym drift vs baseline').toBeLessThanOrEqual(med((s) => s.before.synonymDrift));

		// Catches loss spread thinly enough that no single prompt trips the per-prompt
		// gate. Without this, one dropped step everywhere would pass.
		expect(med((s) => s.retention.neededRatio), 'median facts needed to act').toBeGreaterThanOrEqual(ACTIONABLE_FLOOR);
	});
});

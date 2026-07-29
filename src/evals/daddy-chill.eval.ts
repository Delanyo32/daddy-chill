import { expect } from 'vitest';
import { describeEval } from 'vitest-evals';
import { createFlueAgentHarness, promptPlainAgent } from './harness.ts';
import { measure } from './metrics.ts';
import prompts from './prompts.json' with { type: 'json' };

const GRADE_CEILING = 8;
const SENTENCE_CEILING = 20;

const harness = createFlueAgentHarness({ agentName: 'daddy-chill' });

describeEval('daddy-chill lowers reading level without losing the answer', { harness }, (it) => {
	for (const prompt of prompts) {
		it(prompt, async ({ run, signal }) => {
			const [skilled, baselineText] = await Promise.all([
				run(prompt),
				promptPlainAgent(prompt, signal),
			]);

			const after = measure(skilled.output);
			const before = measure(baselineText);

			// Reported in the JSON eval report, and printed when an assert fails.
			console.log(
				`\n${prompt}\n` +
					`  grade    ${before.grade.toFixed(1)} -> ${after.grade.toFixed(1)}\n` +
					`  standard ${before.standard.toFixed(1)} -> ${after.standard.toFixed(1)}\n` +
					`  words    ${before.words} -> ${after.words}\n` +
					`  jargon   ${(before.difficultRatio * 100).toFixed(1)}% -> ${(after.difficultRatio * 100).toFixed(1)}%\n` +
					`  sent len ${before.avgSentenceLength.toFixed(1)} -> ${after.avgSentenceLength.toFixed(1)}`,
			);

			expect(after.grade, 'reading level ceiling').toBeLessThanOrEqual(GRADE_CEILING);
			expect(after.grade, 'reading level vs baseline').toBeLessThan(before.grade);
			expect(after.words, 'concision vs baseline').toBeLessThan(before.words);
			expect(after.difficultRatio, 'jargon vs baseline').toBeLessThan(before.difficultRatio);
			expect(after.avgSentenceLength, 'sentence length ceiling').toBeLessThanOrEqual(SENTENCE_CEILING);
		});
	}
});

import { afterAll, expect } from 'vitest';
import { describeEval } from 'vitest-evals';
import { createFlueAgentHarness, promptJudgeAgent, promptPlainAgent } from './harness.ts';
import { measure, median, type Metrics } from './metrics.ts';
import { buildJudgeInput, parseJudgeOutput, type Retention } from './retention.ts';
import rawPrompts from './prompts.json' with { type: 'json' };

const GRADE_CEILING = 8;
const ACTIONABLE_FLOOR = 0.8;

/**
 * Five form gates were removed when the `unslop` rules landed, because the two sets
 * of rules told the answer to do opposite things:
 *
 * | Removed gate            | The rule it fought                                    |
 * | ----------------------- | ----------------------------------------------------- |
 * | longest sentence <= 20  | "Vary rhythm. Then longer ones that take their time." |
 * | avg sentence <= 20      | the same rule, across the set                          |
 * | longest paragraph <= 6  | "Let some mess in. Perfect structure looks machine-made." |
 * | numbers per 100 words   | "significantly improves becomes the measured delta"    |
 * | reading grade floor 6   | every rule that swaps a long word for a plain one      |
 *
 * Every one of those numbers is still measured and still printed. Nothing fails a
 * run for hitting one. What is left gates meaning instead of form: zero bare terms,
 * a non-expert can act on it, and the facts needed to act survive. A long sentence
 * a reader understands was never the failure this skill exists to stop.
 *
 * The grade floor is the one worth watching. It existed because a very low score
 * meant the explanations were cut, not that the prose got clear. The bare-term gates
 * and the actionable gate now cover that from the meaning side.
 */

/** A prompt is one question, or a conversation whose last answer gets scored. */
const prompts = rawPrompts as (string | string[])[];

interface Sample {
	before: Metrics;
	after: Metrics;
	retention: Retention;
}

const samples: Sample[] = [];

const harness = createFlueAgentHarness({ agentName: process.env.EVAL_AGENT ?? 'daddy-chill' });

describeEval('daddy-chill simplifies without dropping what the reader needs', { harness }, (it) => {
	for (const entry of prompts) {
		const turns = Array.isArray(entry) ? entry : [entry];
		const question = turns[turns.length - 1]!;
		const label = turns.length === 1 ? question : `[turn ${turns.length}/${turns.length}] ${question}`;

		it(label, async ({ run, signal }) => {
			// Both arms hear the same conversation. Only the last answer is scored,
			// because that is where a session-start instruction has had time to drift.
			const [skilled, baselineText] = await Promise.all([run(turns), promptPlainAgent(turns, signal)]);

			const after = measure(skilled.output);
			const before = measure(baselineText);
			const retention = parseJudgeOutput(
				await promptJudgeAgent(buildJudgeInput(question, baselineText, skilled.output), signal),
			);

			samples.push({ before, after, retention });

			// Reported in the JSON eval report, and printed when an assert fails.
			// Word count is reported, never gated: a clear answer is allowed to be longer.
			console.log(
				`\n${label}\n` +
					`  grade    ${before.grade.toFixed(1)} -> ${after.grade.toFixed(1)}\n` +
					`  standard ${before.standard.toFixed(1)} -> ${after.standard.toFixed(1)}\n` +
					`  words    ${before.words} -> ${after.words}\n` +
					`  jargon   ${(before.difficultRatio * 100).toFixed(1)}% -> ${(after.difficultRatio * 100).toFixed(1)}%\n` +
					`  numbers  ${before.numberDensity.toFixed(1)} -> ${after.numberDensity.toFixed(1)} per 100 words\n` +
					`  sent len ${before.avgSentenceLength.toFixed(1)} -> ${after.avgSentenceLength.toFixed(1)} (max ${before.maxSentenceLength} -> ${after.maxSentenceLength})\n` +
					`  para max ${before.maxParagraphSentences} -> ${after.maxParagraphSentences}\n` +
					`  tense    ${before.tenseViolations} -> ${after.tenseViolations}\n` +
					`  synonyms ${before.synonymDrift} -> ${after.synonymDrift}\n` +
					`  slop     ${before.slop.length} -> ${after.slop.length}${after.slop.length ? ` (${after.slop.join(', ')})` : ''}\n` +
					`  needed   ${retention.neededCovered}/${retention.needed} kept (${retention.covered}/${retention.total} of all facts)` +
					(retention.missing.length ? `, dropped: ${retention.missing.join('; ')}` : '') +
					'\n' +
					`  bare     regex: ${after.bare.length ? after.bare.join(', ') : 'none'}\n` +
					`           judge: ${retention.unexplained.length ? retention.unexplained.join(', ') : 'none'}\n` +
					`  usable   ${retention.actionable ? 'yes' : `NO: ${retention.blocker}`}`,
			);

			// Per prompt: things one answer either does or does not do. No baseline needed.
			expect(skilled.output, 'no em dashes').not.toContain('—');

			// The rule the skill kept breaking, now gated from both sides. The regex
			// proves the floor case (a name shown with no plain words anywhere near it);
			// the judge catches the lowercase coinages no regex can spot. Six runs
			// reported these and gated neither, so nobody ever had to fix one.
			expect(after.bare, 'identifiers shown but never explained').toEqual([]);
			expect(retention.unexplained, 'hard terms the judge found unexplained').toEqual([]);

			// The only gate that scores understanding instead of form.
			expect(retention.actionable, `usable by a non-expert${retention.blocker ? `: ${retention.blocker}` : ''}`).toBe(
				true,
			);

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
		const bare = samples.reduce((n, s) => n + s.after.bare.length + s.retention.unexplained.length, 0);
		const slop = samples.reduce((n, s) => n + s.after.slop.length, 0);
		const unusable = samples.filter((s) => !s.retention.actionable).length;

		console.log(
			`\nmedians over ${samples.length} prompts\n` +
				`  grade    ${med((s) => s.before.grade).toFixed(2)} -> ${med((s) => s.after.grade).toFixed(2)}  (ceiling ${GRADE_CEILING})\n` +
				`  standard ${med((s) => s.before.standard).toFixed(2)} -> ${med((s) => s.after.standard).toFixed(2)}\n` +
				`  words    ${med((s) => s.before.words).toFixed(1)} -> ${med((s) => s.after.words).toFixed(1)}  (reported, not gated)\n` +
				`  jargon   ${(med((s) => s.before.difficultRatio) * 100).toFixed(2)}% -> ${(med((s) => s.after.difficultRatio) * 100).toFixed(2)}%\n` +
				`  numbers  ${med((s) => s.before.numberDensity).toFixed(1)} -> ${med((s) => s.after.numberDensity).toFixed(1)} per 100 words\n` +
				`  sent len ${med((s) => s.before.avgSentenceLength).toFixed(2)} -> ${med((s) => s.after.avgSentenceLength).toFixed(2)}\n` +
				`  tense    ${med((s) => s.before.tenseViolations).toFixed(1)} -> ${med((s) => s.after.tenseViolations).toFixed(1)}\n` +
				`  synonyms ${med((s) => s.before.synonymDrift).toFixed(1)} -> ${med((s) => s.after.synonymDrift).toFixed(1)}\n` +
				`  slop     ${med((s) => s.before.slop.length).toFixed(1)} -> ${med((s) => s.after.slop.length).toFixed(1)}  (${slop} phrases across ${samples.length} answers)\n` +
				`  needed   ${(med((s) => s.retention.neededRatio) * 100).toFixed(1)}% kept, all facts ${(med((s) => (s.retention.total ? s.retention.covered / s.retention.total : 1)) * 100).toFixed(1)}%\n` +
				`  bare     ${bare} unexplained terms across ${samples.length} answers\n` +
				`  unusable ${unusable}/${samples.length} answers a non-expert could not act on`,
		);

		expect(med((s) => s.after.grade), 'median reading level ceiling').toBeLessThanOrEqual(GRADE_CEILING);
		expect(med((s) => s.after.difficultRatio), 'median jargon vs baseline').toBeLessThan(med((s) => s.before.difficultRatio));
		expect(med((s) => s.after.tenseViolations), 'median tense violations vs baseline').toBeLessThanOrEqual(med((s) => s.before.tenseViolations));
		expect(med((s) => s.after.synonymDrift), 'median synonym drift vs baseline').toBeLessThanOrEqual(med((s) => s.before.synonymDrift));

		// Slop is the one failure every other metric scores as a pass: "a pivotal
		// moment in the evolving landscape" reads at grade 5.9 with no hard term in
		// it. Gated against the baseline, not at 0, for the same reason as tense and
		// synonyms: the list has false positives ("realm", "landscape"), and both
		// arms get the same ruler, so a shared false-positive rate cancels out.
		//
		// ponytail: retune to a flat ceiling after the first full run, once we know
		// what the plain agent actually scores.
		expect(med((s) => s.after.slop.length), 'median slop phrases vs baseline').toBeLessThanOrEqual(med((s) => s.before.slop.length));

		// Catches loss spread thinly enough that no single prompt trips the per-prompt
		// gate. Without this, one dropped step everywhere would pass.
		expect(med((s) => s.retention.neededRatio), 'median facts needed to act').toBeGreaterThanOrEqual(ACTIONABLE_FLOOR);
	});
});

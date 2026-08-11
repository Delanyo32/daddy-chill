/**
 * Can the reader act on the short answer, or did it leave out what they needed?
 *
 * Every other metric here rewards saying less, so "I could not fetch that page"
 * scores perfectly while answering nothing. This is the only gate that can tell a
 * simpler answer from an incomplete one: a judge lists the facts in the baseline
 * answer, marks the ones a reader needs in order to act, then counts how many
 * survive in the daddy-chill answer.
 */
export interface Retention {
	/** Facts the judge found in the baseline answer. */
	total: number;
	/** How many of those the short answer still states. Reported, never gated. */
	covered: number;
	/** Of `total`, the facts a reader needs in order to act. */
	needed: number;
	/** How many needed facts the short answer still states. */
	neededCovered: number;
	/**
	 * neededCovered / needed. This is the gate.
	 *
	 * The baseline is verbose by design, so it volunteers tangents nobody asked
	 * for. Grading against every scrap of it would mean the only way to pass is to
	 * repeat the baseline. What a reader needs to act is the part that has to survive.
	 */
	neededRatio: number;
	/** Needed facts the short answer dropped. Printed on failure. */
	missing: string[];
	/**
	 * Hard terms the short answer used but never explained.
	 *
	 * Some terms cannot be swapped for an easy word: a command, a flag, a config
	 * key. The rule is to keep them and explain them, so this reports the ones that
	 * arrived bare. Reported, not gated: the judge is loose about what counts as hard.
	 */
	unexplained: string[];
}

export function buildJudgeInput(question: string, reference: string, candidate: string): string {
	return [
		`QUESTION:\n${question}`,
		`REFERENCE ANSWER:\n${reference}`,
		`SHORT ANSWER:\n${candidate}`,
	].join('\n\n---\n\n');
}

/**
 * Parse the judge reply. Models wrap JSON in prose or fences no matter what the
 * instructions say, so pull the first object out rather than trusting the shape.
 * Throws on garbage: a silent zero would read as "the skill dropped everything".
 */
export function parseJudgeOutput(raw: string): Retention {
	const match = raw.replace(/```(?:json)?/g, '').match(/\{[\s\S]*\}/);
	if (!match) throw new Error(`judge returned no JSON object: ${raw.slice(0, 200)}`);

	const parsed = JSON.parse(match[0]) as Record<string, unknown>;
	const total = Number(parsed.total);
	const covered = Number(parsed.covered);
	if (!Number.isFinite(total) || !Number.isFinite(covered)) {
		throw new Error(`judge returned no counts: ${match[0].slice(0, 200)}`);
	}
	if (total <= 0) throw new Error('judge found no facts in the reference answer');

	const rawNeeded = Number(parsed.needed);
	const rawNeededCovered = Number(parsed.neededCovered);
	if (!Number.isFinite(rawNeeded) || !Number.isFinite(rawNeededCovered)) {
		// Same reason as above: defaulting neededCovered to 0 would read as "the skill
		// dropped everything a reader needed", and fail the skill for a judge slip.
		throw new Error(`judge returned no needed counts: ${match[0].slice(0, 200)}`);
	}

	// A needed count above the total means the judge miscounted, so clamp both ways.
	const needed = Math.min(rawNeeded, total);
	const neededCovered = Math.min(rawNeededCovered, needed);

	return {
		total,
		covered: Math.min(covered, total),
		needed,
		neededCovered,
		neededRatio: needed === 0 ? 1 : neededCovered / needed,
		missing: Array.isArray(parsed.missing) ? parsed.missing.map(String) : [],
		// ponytail: optional. It is reported, not gated, so a judge that omits it
		// should not throw the way a missing count does.
		unexplained: Array.isArray(parsed.unexplained) ? parsed.unexplained.map(String) : [],
	};
}

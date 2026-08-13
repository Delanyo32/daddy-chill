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
	 * key. The rule is to keep them and explain them, so this lists the ones that
	 * arrived bare. This is now gated. It was reported and ignored for six runs,
	 * which is how a session shipped 40 undefined terms at a grade-2.5 reading level.
	 */
	unexplained: string[];
	/**
	 * Could a non-expert act on this answer without asking a follow-up?
	 *
	 * The only gate that scores understanding rather than form. Every other metric
	 * here can be satisfied by an answer that is short, plain, complete, and still
	 * unusable, because it names things it never explains.
	 */
	actionable: boolean;
	/** Why not, in one sentence. Printed on failure. */
	blocker: string;
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
		unexplained: Array.isArray(parsed.unexplained) ? parsed.unexplained.map(String) : [],
		// Default true, unlike the counts, which throw when absent. Both gates fail
		// closed on a real judgement and open on a judge slip: a missing count would
		// read as "dropped everything", a missing verdict as "nobody could use this".
		// Neither is a fact about the skill, so neither should fail it.
		actionable: parsed.actionable === undefined ? true : parsed.actionable === true,
		blocker: typeof parsed.blocker === 'string' ? parsed.blocker : '',
	};
}

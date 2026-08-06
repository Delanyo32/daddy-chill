/**
 * Did the short answer keep the meaning, or just say less?
 *
 * Every other metric here rewards brevity, so "I could not fetch that page"
 * scores perfectly while answering nothing. This is the only gate that can tell
 * compression from deletion: a judge lists the facts in the baseline answer, then
 * counts how many survive in the daddy-chill answer.
 */
export interface Retention {
	/** Facts the judge found in the baseline answer. */
	total: number;
	/** How many of those the short answer still states. */
	covered: number;
	/** covered / total. 1 means nothing was lost, padding included. */
	ratio: number;
	/** Of `total`, the facts a reader needs to answer the question. */
	core: number;
	/** How many core facts the short answer still states. */
	coreCovered: number;
	/**
	 * coreCovered / core. This is the gate, not `ratio`.
	 *
	 * The baseline is verbose by design, so it volunteers tangents nobody asked
	 * for. Grading compression against every scrap of it means the only way to
	 * pass is to not compress. Core facts are the part that has to survive.
	 */
	coreRatio: number;
	/** Core facts the short answer dropped. Printed on failure. */
	missing: string[];
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

	const parsed = JSON.parse(match[0]) as Partial<Retention>;
	const total = Number(parsed.total);
	const covered = Number(parsed.covered);
	if (!Number.isFinite(total) || !Number.isFinite(covered)) {
		throw new Error(`judge returned no counts: ${match[0].slice(0, 200)}`);
	}
	if (total <= 0) throw new Error('judge found no facts in the reference answer');

	const rawCore = Number(parsed.core);
	const rawCoreCovered = Number(parsed.coreCovered);
	if (!Number.isFinite(rawCore) || !Number.isFinite(rawCoreCovered)) {
		// Same reason as above: defaulting coreCovered to 0 would read as "the skill
		// dropped every fact a reader needed", and fail the skill for a judge slip.
		throw new Error(`judge returned no core counts: ${match[0].slice(0, 200)}`);
	}

	// A core count above the total means the judge miscounted, so clamp both ways.
	const core = Math.min(rawCore, total);
	const coreCovered = Math.min(rawCoreCovered, core);

	return {
		total,
		covered: Math.min(covered, total),
		ratio: Math.min(covered, total) / total,
		core,
		coreCovered,
		coreRatio: core === 0 ? 1 : coreCovered / core,
		missing: Array.isArray(parsed.missing) ? parsed.missing.map(String) : [],
	};
}

/** Facts kept per 100 words. The real semantic compression number. */
export function factDensity(covered: number, words: number): number {
	return words === 0 ? 0 : (covered / words) * 100;
}

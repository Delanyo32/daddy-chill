// text-readability@1.1.1 ships without TypeScript declarations.
// Keep this suppression next to the import so it can be removed if that changes.
// @ts-expect-error -- untyped third-party package
import rs from 'text-readability';

export interface Metrics {
	/** Flesch-Kincaid grade level. 8 means an 8th grader can read it. */
	grade: number;
	/** Readability consensus across every formula, as a grade level. */
	standard: number;
	/** Total words. Our concision measure. */
	words: number;
	/** Share of words outside the Dale-Chall easy-word list. Our jargon measure. */
	difficultRatio: number;
	/** Words per sentence. */
	avgSentenceLength: number;
}

/**
 * Turn markdown into plain prose the formulas can actually read.
 *
 * This is not cosmetic. text-readability splits sentences on
 * `/ *[.?!]['")\]]*[ |\n](?=[A-Z])/` (main.js:62), so a sentence only ends when
 * the next character is a capital letter. A bullet list therefore counts as ONE
 * sentence, and the grade level explodes. Since the skill under test is supposed
 * to produce bullets, leaving this alone would punish exactly the output we want.
 *
 * So: strip the markup, then give every line a terminal period and a leading
 * capital. Word and syllable counts are untouched, so only the sentence split changes.
 */
export function toProse(raw: string): string {
	return raw
		.replace(/```[\s\S]*?```/g, '\n') // fenced code blocks
		.replace(/`[^`\n]*`/g, ' ') // inline code
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links, keep the text
		.replace(/^\s{0,3}#{1,6}\s+/gm, '') // heading markers
		.replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, '') // bullet and numbered list markers
		.replace(/^\s*>\s?/gm, '') // blockquotes
		.replace(/[*_~|]/g, '') // emphasis and table pipes
		.split('\n')
		.map((line) => line.replace(/\s+/g, ' ').trim())
		.filter((line) => /[a-z]/i.test(line))
		.map((line) => {
			// ponytail: only a leading lowercase letter. A line starting with a digit
			// or quote still merges into the previous sentence; rare enough to ignore.
			const capitalized = line.replace(/^[a-z]/, (c) => c.toUpperCase());
			return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
		})
		.join(' ');
}

export function measure(raw: string): Metrics {
	const text = toProse(raw);
	const words = rs.lexiconCount(text);
	const sentences = rs.sentenceCount(text);

	// ponytail: guard only the divide-by-zero. Short-text noise is real, but the
	// benchmark prompts all produce multi-sentence answers.
	if (words === 0 || sentences === 0) {
		return { grade: 0, standard: 0, words, difficultRatio: 0, avgSentenceLength: 0 };
	}

	return {
		grade: rs.fleschKincaidGrade(text),
		standard: rs.textStandard(text, true),
		words,
		difficultRatio: rs.difficultWords(text) / words,
		avgSentenceLength: words / sentences,
	};
}

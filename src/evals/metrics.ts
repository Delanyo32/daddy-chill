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
	/** Words in the longest sentence. STE caps a procedure sentence at 20. */
	maxSentenceLength: number;
	/** Sentences in the longest prose paragraph. STE caps it at 6. */
	maxParagraphSentences: number;
	/** Present perfect and progressive verbs. STE allows simple tenses only. */
	tenseViolations: number;
	/** Extra words used for one idea. STE: one word, one meaning. */
	synonymDrift: number;
}

/**
 * Sentence split for the rules that care about the worst case, not the mean.
 *
 * Deliberately not rs.sentenceCount: that splits on a following capital letter,
 * so it cannot tell us where each sentence ends. Run this on toProse output,
 * where every line already ends in a terminal period.
 */
export function splitSentences(prose: string): string[] {
	return prose
		.split(/[.!?]+(?=\s|$)/)
		.map((s) => s.trim())
		.filter((s) => /[a-z]/i.test(s));
}

function wordCount(sentence: string): number {
	return sentence.split(/\s+/).filter(Boolean).length;
}

/**
 * Sentences in the longest prose paragraph.
 *
 * Runs on raw markdown, not toProse, which joins every block into one string.
 * Bullets, headings, and table rows are dropped: the skill asks for bullets, and
 * a bullet is one idea by rule, so a long list is not a wall of text.
 */
export function maxParagraphSentences(raw: string): number {
	const blocks = raw.replace(/```[\s\S]*?```/g, '\n\n').split(/\n\s*\n/);
	let longest = 0;

	for (const block of blocks) {
		const prose = block
			.split('\n')
			.filter((line) => !/^\s*(?:[-*+]|\d+[.)]|#{1,6}\s|>|\|)/.test(line))
			.join(' ')
			.trim();
		if (prose) longest = Math.max(longest, splitSentences(prose).length);
	}

	return longest;
}

// ponytail: regex, not a parser. False positives exist ("is interesting" reads as
// a progressive), so the eval gates this against the baseline rather than at 0.
// Both texts get the same ruler, so a shared false-positive rate cancels out.
const PRESENT_PERFECT = /\b(?:has|have|had)\s+(?:not\s+|never\s+|already\s+)?(?:been\s+)?[a-z]+(?:ed|en)\b/gi;
const PROGRESSIVE = /\b(?:is|are|was|were|be|been|being|am)\s+(?:not\s+)?[a-z]+ing\b/gi;

export function tenseViolations(prose: string): number {
	return (prose.match(PRESENT_PERFECT) ?? []).length + (prose.match(PROGRESSIVE) ?? []).length;
}

/**
 * One word, one meaning. Each set is one idea; using two members of a set in one
 * answer makes the reader ask whether you meant two different things.
 */
const SYNONYM_SETS = [
	['verify', 'check', 'confirm', 'ensure', 'validate'],
	['start', 'begin', 'initiate', 'launch'],
	['stop', 'end', 'halt', 'terminate', 'quit'],
	['make', 'create', 'build', 'generate', 'produce'],
	['fix', 'repair', 'correct', 'resolve', 'patch'],
	['delete', 'remove', 'erase', 'drop'],
	['change', 'modify', 'alter', 'update', 'edit'],
	['show', 'display', 'present', 'render'],
	['use', 'utilize', 'employ', 'leverage'],
	['fast', 'quick', 'rapid', 'swift'],
];

/** Sum of extra synonyms per set. Two members of one set score 1, three score 2. */
export function synonymDrift(prose: string): number {
	// ponytail: exact word forms only. "verifies" and "verified" are missed;
	// widening to stems matches "checkout" for "check", which is worse.
	const words = new Set(prose.toLowerCase().match(/[a-z]+/g) ?? []);
	return SYNONYM_SETS.reduce((total, set) => {
		const hits = set.filter((word) => words.has(word)).length;
		return total + Math.max(0, hits - 1);
	}, 0);
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

/** Median, not mean: one refusal or one runaway answer should not move the number. */
export function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = sorted.length >> 1;
	return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export function measure(raw: string): Metrics {
	const text = toProse(raw);
	const words = rs.lexiconCount(text);
	const sentences = rs.sentenceCount(text);

	// ponytail: guard only the divide-by-zero. Short-text noise is real, but the
	// benchmark prompts all produce multi-sentence answers.
	if (words === 0 || sentences === 0) {
		return {
			grade: 0,
			standard: 0,
			words,
			difficultRatio: 0,
			avgSentenceLength: 0,
			maxSentenceLength: 0,
			maxParagraphSentences: 0,
			tenseViolations: 0,
			synonymDrift: 0,
		};
	}

	return {
		grade: rs.fleschKincaidGrade(text),
		standard: rs.textStandard(text, true),
		words,
		difficultRatio: rs.difficultWords(text) / words,
		avgSentenceLength: words / sentences,
		maxSentenceLength: Math.max(...splitSentences(text).map(wordCount)),
		maxParagraphSentences: maxParagraphSentences(raw),
		tenseViolations: tenseViolations(text),
		synonymDrift: synonymDrift(text),
	};
}

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
	/**
	 * Technical identifiers the answer shows but never speaks about.
	 *
	 * The skill is allowed to keep a command, key, or column label exact. It is not
	 * allowed to leave it bare. See `bareIdentifiers`.
	 */
	bare: string[];
	/** Numbers per 100 words. A wall of measurements reads as hard whatever the grade says. */
	numberDensity: number;
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
 * Words that are not English words: the shape gives them away.
 *
 * Deliberately shape-based, not a hand-written list of tech terms. A list would
 * only ever contain the jargon we already thought of, and would date instantly.
 * Catches `RSS`, `PCIe`, `NVMe`, `MADV_WILLNEED`, `vmhwm_mb`, `assignLayers`.
 *
 * ponytail: misses all-lowercase coinages (`mmap`, `pread`, `repack`). No regex
 * separates those from ordinary words. The judge's `unexplained` list covers them,
 * and that is now gated, so the two checks together close the gap.
 */
/**
 * Units a reader already knows. Everything else stays in.
 *
 * Deliberately tiny. `p99`, `rps`, and `QPS` are real jargon and stay flagged.
 */
const KNOWN_UNITS = new Set(['B', 'KB', 'MB', 'GB', 'TB', 'ms', 's', 'kb', 'mb', 'gb', 'tb']);

/** True when Dale-Chall knows the word, so SHOUTING it does not make it a term. */
function isOrdinaryWord(token: string): boolean {
	return (rs.difficultWordsSet(token.toLowerCase(), 1) as Set<string>).size === 0;
}

export function looksTechnical(token: string): boolean {
	if (token.length < 2 || KNOWN_UNITS.has(token)) return false;
	// Measured on the first full run: an ALL-CAPS test flagged SELECT, FROM, WHERE,
	// ON, ORDER, and JOIN out of one SQL example. They are English words in caps, not
	// terms owing the reader a gloss. Dale-Chall separates them from RSS and GGUF.
	if (/^[A-Z]{2,}$/.test(token)) return !isOrdinaryWord(token);
	if (token.includes('_')) return true; // vmhwm_mb, MADV_WILLNEED
	if (/\d/.test(token)) return true; // x86, OAuth2
	if (/^[a-z]+[A-Z]/.test(token)) return true; // assignLayers
	if (/^[A-Z][a-z]*[A-Z]/.test(token)) return true; // PCIe, NVMe
	return false;
}

const FENCED = /```[\s\S]*?```/g;
const INLINE = /`([^`\n]+)`/g;
const TOKEN = /[A-Za-z_][\w.]*/g;

/**
 * The answer with its code read out loud: fences dropped, inline code unwrapped.
 *
 * This is where an explanation would live, so it is what the gloss window reads.
 */
function speech(raw: string): string {
	return (
		raw
			.replace(FENCED, ' ')
			.replace(INLINE, '$1')
			// Note the missing underscore. Stripping it as markdown emphasis split every
			// snake_case name in half, so DATABASE_URL and pg_stat_activity could never
			// be found in the prose and were flagged bare no matter how well explained.
			// That was most of the false positives in the first full run.
			.replace(/[*~|#>]/g, ' ')
			.replace(/\s+/g, ' ')
	);
}

/** Every identifier the answer puts in front of the reader, in first-use order. */
export function identifiers(raw: string): string[] {
	const found: string[] = [];
	// A sentence-ending period is not part of the name. Without this strip, "5 GB."
	// and "TARGET_DIRECTORY." became their own tokens, and no gloss could ever match
	// them. Measured on the first full run: 4 of the flagged terms were this bug.
	const add = (token: string) => {
		const name = token.replace(/\.+$/, '');
		if (name && !found.includes(name)) found.push(name);
	};

	// A one-word inline code span is a term being named, so it always needs a gloss.
	for (const [, body] of raw.matchAll(INLINE)) {
		const words = body!.trim().split(/\s+/);
		if (words.length === 1) {
			const name = words[0]!.replace(/[^\w.\/-]+$/, '');
			if (!KNOWN_UNITS.has(name)) add(name);
		}
	}
	// Anywhere else, only the ones whose shape proves they are not English.
	for (const token of raw.match(TOKEN) ?? []) if (looksTechnical(token.replace(/\.+$/, ''))) add(token);

	return found;
}

/**
 * Identifiers shown but never explained, by the only test a regex can actually pass.
 *
 * A regex cannot tell a real definition from a sentence that merely uses the term.
 * The judge does that. What a regex CAN prove is the floor case: the reader is shown
 * a name and gets no plain words about it at all. Two ways that happens:
 *
 * 1. The identifier appears only inside code and never once in the prose.
 * 2. It appears in prose, but fewer than `minGloss` plain words follow it inside
 *    the next `window` words. Naming a key and moving on is not explaining it.
 *
 * Verified against the failing session: this flags `vmhwm_mb`, `stall_ms`, `read_mb`,
 * `MADV_WILLNEED`, `n_gpu_layers`, and `assignLayers`, every one of which the answer
 * printed and never defined.
 */
export function bareIdentifiers(raw: string, window = 15, minGloss = 6): string[] {
	const spoken = speech(raw);

	return identifiers(raw).filter((term) => {
		// Word boundaries only. An earlier version excluded a trailing "." to keep
		// dotted names whole, which made every term that ends a sentence look bare.
		const at = spoken.search(new RegExp(`(?<!\\w)${term.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&')}(?!\\w)`));
		if (at < 0) return true; // never left the code block

		const after = spoken
			.slice(at)
			.split(/\s+/)
			.slice(1, window + 1)
			.filter((word) => /^[A-Za-z][a-z]*$/.test(word) && !looksTechnical(word));

		return after.length < minGloss;
	});
}

/** Numbers per 100 words, counted on the raw text so tables are included. */
export function numberDensity(raw: string): number {
	const words = (raw.match(/[A-Za-z][\w-]*/g) ?? []).length;
	if (words === 0) return 0;
	return ((raw.match(/(?<![\w.])\d[\d,]*(?:\.\d+)?/g) ?? []).length / words) * 100;
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

/**
 * Share of words that are not on the Dale-Chall easy list.
 *
 * Not `rs.difficultWords(text) / words`. That was the shipped version and it is
 * wrong: `difficultWordsSet` returns UNIQUE words, so repeating one hard word made
 * the score better the longer the answer got. Measured on the old code:
 * "Quantization matters." scored 0.500, the same sentence ten times scored 0.050.
 * This counts every occurrence instead, so the number stays flat at 0.500.
 *
 * ponytail: keeps text-readability's 2-syllable floor, which lets `mmap`, `RSS`,
 * and `PCIe` through. Dropping the floor was tried and rejected: it scores plain
 * modern prose at 30.6% (the Dale-Chall list predates "app", "login", "click"),
 * which is worse than the technical answers we are trying to catch. Short jargon
 * is caught by shape in `bareIdentifiers` and by the judge instead.
 */
export function difficultRatio(prose: string): number {
	const hard: Set<string> = rs.difficultWordsSet(prose);
	// Same tokenizer as difficultWordsSet (main.js:202), so membership lines up.
	const tokens = prose.match(/[\w=‘’]+/g) ?? [];
	if (tokens.length === 0) return 0;
	return tokens.filter((token) => hard.has(token)).length / tokens.length;
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
			bare: [],
			numberDensity: 0,
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
		difficultRatio: difficultRatio(text),
		// Both read the raw markdown: the identifiers and the number tables live in
		// the code fences that toProse strips, which is exactly why they went unchecked.
		bare: bareIdentifiers(raw),
		numberDensity: numberDensity(raw),
		avgSentenceLength: words / sentences,
		maxSentenceLength: Math.max(...splitSentences(text).map(wordCount)),
		maxParagraphSentences: maxParagraphSentences(raw),
		tenseViolations: tenseViolations(text),
		synonymDrift: synonymDrift(text),
	};
}

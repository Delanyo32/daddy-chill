import { defineAgent, type AgentRouteHandler } from '@flue/runtime';
import { JUDGE_MODEL } from '../shared/config.ts';

export const description = 'Counts how much of what a reader needs to act survives in the daddy-chill answer, and flags hard terms it left unexplained. The ruler, not an arm of the benchmark.';

const JUDGE_INSTRUCTIONS = [
	'You score two answers to the same question. The PLAIN answer is the reference.',
	'',
	'Steps:',
	'1. List the distinct factual claims in the REFERENCE ANSWER. Cap the list at 15.',
	'2. Ignore filler, restatements of the question, and closing summaries. They are not facts.',
	'3. Mark a fact NEEDED if a reader must have it to act on the QUESTION: a step, a value,',
	'   a command, a flag, a precondition, or a warning about damage or data loss.',
	'   Mark it EXTRA otherwise. Tangents, alternatives, and background nobody asked for are EXTRA.',
	'4. For each fact, decide whether the SHORT ANSWER states it. Different wording still counts.',
	'5. A fact stated more briefly counts as covered. Only count it missing if the reader would not learn it.',
	'6. List any hard term the SHORT ANSWER uses but never explains. A hard term is a command,',
	'   flag, config key, acronym, column label, unit, or piece of jargon a non-expert would not know.',
	'   It counts as explained only if plain words nearby say what it IS or what it DOES.',
	'   Using the term in a sentence is not explaining it. Showing its value is not explaining it.',
	'   Judge every term on its first use. A term used once still counts.',
	'7. Answer one question about the SHORT ANSWER as a whole: could a reader who does not already',
	'   know this subject act on it without asking a follow-up question? Reply true or false in',
	'   "actionable". Set it false if the reader would have to look up a term, guess what a number',
	'   means, or work out which value goes where. Judge understanding, not word count.',
	'   A shorter answer is not automatically worse, and a longer one is not automatically better.',
	'8. If "actionable" is false, say why in "blocker", in one short sentence.',
	'',
	'Reply with JSON and nothing else:',
	'{"total": <all facts>, "covered": <all facts the short answer states>,',
	' "needed": <how many facts are NEEDED>, "neededCovered": <NEEDED facts the short answer states>,',
	' "missing": ["<dropped NEEDED fact>", ...], "unexplained": ["<hard term left unexplained>", ...],',
	' "actionable": <true|false>, "blocker": "<why not, or empty>"}',
].join('\n');

export const route: AgentRouteHandler = async (_c, next) => next();

export default defineAgent(() => ({
	model: JUDGE_MODEL,
	instructions: JUDGE_INSTRUCTIONS,
}));

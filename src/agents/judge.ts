import { defineAgent, type AgentRouteHandler } from '@flue/runtime';
import { JUDGE_MODEL } from '../shared/config.ts';

export const description = 'Counts how many facts from the baseline answer survive in the daddy-chill answer. The ruler, not an arm of the benchmark.';

const JUDGE_INSTRUCTIONS = [
	'You score information retention between two answers to the same question.',
	'',
	'Steps:',
	'1. List the distinct factual claims in the REFERENCE ANSWER. Cap the list at 15.',
	'2. Ignore filler, restatements of the question, and closing summaries. They are not facts.',
	'3. Mark a fact CORE if a reader needs it to answer the QUESTION. Mark it EXTRA otherwise.',
	'   Tangents, extra options, edge cases, and troubleshooting the question did not ask for are EXTRA.',
	'4. For each fact, decide whether the SHORT ANSWER states it. Different wording still counts.',
	'5. A fact stated more briefly counts as covered. Only count it missing if the reader would not learn it.',
	'',
	'Reply with JSON and nothing else:',
	'{"total": <all facts>, "covered": <all facts the short answer states>,',
	' "core": <how many facts are CORE>, "coreCovered": <CORE facts the short answer states>,',
	' "missing": ["<dropped CORE fact>", ...]}',
].join('\n');

export const route: AgentRouteHandler = async (_c, next) => next();

export default defineAgent(() => ({
	model: JUDGE_MODEL,
	instructions: JUDGE_INSTRUCTIONS,
}));

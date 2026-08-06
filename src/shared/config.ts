/** Both benchmark agents share these so the skill is the only variable. */
export const EVAL_MODEL = process.env.EVAL_MODEL ?? 'openrouter/anthropic/claude-sonnet-5';

/**
 * The judge is pinned on purpose. It scores both arms, so changing EVAL_MODEL to
 * benchmark a different model must not also move the ruler.
 */
export const JUDGE_MODEL = process.env.JUDGE_MODEL ?? 'openrouter/anthropic/claude-sonnet-5';

export const BASE_INSTRUCTIONS = [
	'You are a helpful software engineering assistant. Answer the user question.',
	'You have a shell with network access. Use `curl` to fetch a URL the user names,',
	'and to look things up when the question needs current information.',
	'Pipe HTML through `html-to-markdown` to read it. There is no `git`, so read',
	'repositories through raw.githubusercontent.com or the GitHub API.',
	'If a fetch fails, say so plainly rather than guessing at the contents.',
].join(' ');

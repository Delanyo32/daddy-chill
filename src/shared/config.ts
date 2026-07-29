/** Both benchmark agents share these so the skill is the only variable. */
export const EVAL_MODEL = process.env.EVAL_MODEL ?? 'openrouter/anthropic/claude-sonnet-5';

export const BASE_INSTRUCTIONS = 'You are a helpful software engineering assistant. Answer the user question.';

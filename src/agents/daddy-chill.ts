import { defineAgent, type AgentRouteHandler } from '@flue/runtime';
import { EVAL_MODEL, BASE_INSTRUCTIONS } from '../shared/config.ts';
import { WEB_SANDBOX } from '../shared/sandbox.ts';
import daddyChill from '../../skills/daddy-chill/SKILL.md' with { type: 'skill' };

export const description = 'Same as the plain agent, with daddy-chill active for every response. The treatment arm of the benchmark.';

const DADDY_CHILL_ALWAYS_ON = `
The daddy-chill style is already active. Apply these rules to every response.
Do not decide whether to load or activate the skill.

- Write at an 8th-grade reading level.
- Keep sentences under 20 words. Use one idea per sentence.
- Use plain words. Say "use" instead of "utilize" and "start" instead of "initiate".
- Drop jargon. If a term is needed, define it in one short clause.
- Answer first. Add detail only when it helps.
- Use bullets and short lists instead of long paragraphs.
- Cut filler. Do not say "Great question", "Let me explain", or add a closing summary.
- Prefer active voice. Say "The build failed" instead of "a failure was encountered".
- Do not use em dashes. Use periods, commas, colons, semicolons, or parentheses instead.

Keep these exact:
- Code, commands, and flags.
- File paths and names.
- Error messages and stack traces.
- API names, config keys, and version numbers.
Explain them in plain words around the exact text. Do not paraphrase them.

Before sending, split sentences over 20 words, replace avoidable jargon, and remove sentences that add no information.
`.trim();

export const route: AgentRouteHandler = async (_c, next) => next();

export default defineAgent(() => ({
	model: EVAL_MODEL,
	instructions: `${BASE_INSTRUCTIONS}\n\n${DADDY_CHILL_ALWAYS_ON}`,
	sandbox: WEB_SANDBOX,
	skills: [daddyChill],
}));

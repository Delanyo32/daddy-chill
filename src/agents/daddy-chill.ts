import { defineAgent, type AgentRouteHandler } from '@flue/runtime';
import { EVAL_MODEL, BASE_INSTRUCTIONS } from '../shared/config.ts';
import { ALWAYS_ON_INSTRUCTIONS } from '../shared/rules.ts';
import { WEB_SANDBOX } from '../shared/sandbox.ts';
import daddyChill from '../../skills/daddy-chill/SKILL.md' with { type: 'skill' };

export const description = 'Same as the plain agent, with daddy-chill active for every response. The treatment arm of the benchmark.';

export const route: AgentRouteHandler = async (_c, next) => next();

export default defineAgent(() => ({
	model: EVAL_MODEL,
	instructions: `${BASE_INSTRUCTIONS}\n\n${ALWAYS_ON_INSTRUCTIONS}`,
	sandbox: WEB_SANDBOX,
	skills: [daddyChill],
}));

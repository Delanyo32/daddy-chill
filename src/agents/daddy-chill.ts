import { defineAgent, type AgentRouteHandler } from '@flue/runtime';
import { EVAL_MODEL, BASE_INSTRUCTIONS } from '../shared/config.ts';
import daddyChill from '../skills/daddy-chill/SKILL.md' with { type: 'skill' };

export const description = 'Same as the plain agent, plus the daddy-chill skill. The treatment arm of the benchmark.';

export const route: AgentRouteHandler = async (_c, next) => next();

export default defineAgent(() => ({
	model: EVAL_MODEL,
	instructions: BASE_INSTRUCTIONS,
	skills: [daddyChill],
}));

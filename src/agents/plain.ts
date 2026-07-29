import { defineAgent, type AgentRouteHandler } from '@flue/runtime';
import { EVAL_MODEL, BASE_INSTRUCTIONS } from '../shared/config.ts';
import { WEB_SANDBOX } from '../shared/sandbox.ts';

export const description = 'Baseline assistant with no style skill. The control arm of the benchmark.';

export const route: AgentRouteHandler = async (_c, next) => next();

export default defineAgent(() => ({
	model: EVAL_MODEL,
	instructions: BASE_INSTRUCTIONS,
	sandbox: WEB_SANDBOX,
}));

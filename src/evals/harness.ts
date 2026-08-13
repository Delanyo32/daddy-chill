// flue-blueprint: tooling/vitest-evals@1
// Adapted: the blueprint's tool-call collection is dropped. These agents have no
// tools, and its `AgentConversationMessage` / `SimpleToolCallRecord` imports do
// not exist in @flue/sdk 1.0.0-beta.9 or vitest-evals 0.15.
import { createFlueClient } from '@flue/sdk';
import { createHarness } from 'vitest-evals';

export const BASE_URL = process.env.FLUE_BASE_URL ?? 'http://127.0.0.1:3583';

const client = createFlueClient({ baseUrl: BASE_URL });

/**
 * Run a whole conversation and return the last answer.
 *
 * Every turn reuses one instance id on purpose. Flue gives each agent instance one
 * canonical conversation stream and rebuilds context from it, so turn 3 sees turns
 * 1 and 2. A fresh id per turn would make a multi-turn prompt three unrelated
 * questions, which is exactly the drift these prompts exist to catch.
 */
async function converse(agentName: string, turns: string[], signal?: AbortSignal) {
	const instanceId = `eval-${crypto.randomUUID()}`;
	let last!: Awaited<ReturnType<typeof client.agents.prompt>>;
	for (const message of turns) {
		last = await client.agents.prompt(agentName, instanceId, { message, signal });
	}
	return last.result;
}

export function createFlueAgentHarness(options: { agentName: string }) {
	return createHarness<string[], string>({
		name: `flue-${options.agentName}-agent`,
		run: async ({ input, signal }) => {
			const result = await converse(options.agentName, input, signal);
			return {
				output: result.text,
				messages: [
					...input.map((content) => ({ role: 'user' as const, content })),
					{ role: 'assistant' as const, content: result.text },
				],
				usage: {
					provider: result.model.provider,
					model: result.model.id,
					inputTokens: result.usage.input,
					outputTokens: result.usage.output,
					totalTokens: result.usage.totalTokens,
				},
			};
		},
	});
}

/** Control arm. Called directly, not through a harness, because it is the baseline. */
export async function promptPlainAgent(turns: string[], signal?: AbortSignal): Promise<string> {
	return (await converse('plain', turns, signal)).text;
}

/** The ruler. Not an arm of the benchmark, so it does not run through a harness either. */
export async function promptJudgeAgent(input: string, signal?: AbortSignal): Promise<string> {
	return (await converse('judge', [input], signal)).text;
}

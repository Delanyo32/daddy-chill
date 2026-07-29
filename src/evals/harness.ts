// flue-blueprint: tooling/vitest-evals@1
// Adapted: the blueprint's tool-call collection is dropped. These agents have no
// tools, and its `AgentConversationMessage` / `SimpleToolCallRecord` imports do
// not exist in @flue/sdk 1.0.0-beta.9 or vitest-evals 0.15.
import { createFlueClient } from '@flue/sdk';
import { createHarness } from 'vitest-evals';

export const BASE_URL = process.env.FLUE_BASE_URL ?? 'http://127.0.0.1:3583';

const client = createFlueClient({ baseUrl: BASE_URL });

async function prompt(agentName: string, input: string, signal?: AbortSignal) {
	const instanceId = `eval-${crypto.randomUUID()}`;
	const invocation = await client.agents.prompt(agentName, instanceId, { message: input, signal });
	return invocation.result;
}

export function createFlueAgentHarness(options: { agentName: string }) {
	return createHarness<string, string>({
		name: `flue-${options.agentName}-agent`,
		run: async ({ input, signal }) => {
			const result = await prompt(options.agentName, input, signal);
			return {
				output: result.text,
				messages: [
					{ role: 'user' as const, content: input },
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
export async function promptPlainAgent(input: string, signal?: AbortSignal): Promise<string> {
	return (await prompt('plain', input, signal)).text;
}

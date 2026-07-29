import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['src/evals/**/*.eval.ts'],
		reporters: ['default', 'vitest-evals/reporter'],
		// Both arms may fetch several pages per prompt before answering.
		testTimeout: 300_000,
	},
});

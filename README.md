# daddy-chill

An Agent Skill that keeps AI answers at an 8th-grade reading level: short, plain, concise.
Ships with a benchmark that measures whether it actually works.

## Install the skill

Copy the skill folder into any Agent Skills host:

```sh
cp -r src/skills/daddy-chill ~/.claude/skills/
```

For a Flue agent, import it:

```ts
import daddyChill from './skills/daddy-chill/SKILL.md' with { type: 'skill' };

export default defineAgent(() => ({
	model: 'openrouter/anthropic/claude-sonnet-5',
	skills: [daddyChill],
}));
```

## How the benchmark works

Two agents, identical except for one thing:

| Agent         | Skill        | Role      |
| ------------- | ------------ | --------- |
| `plain`       | none         | control   |
| `daddy-chill` | daddy-chill  | treatment |

Each of the 10 prompts in `src/evals/prompts.json` runs through both. Then
[`text-readability`](https://github.com/clearnote01/readability) scores each answer.

| Metric              | Gate                          | What it catches           |
| ------------------- | ----------------------------- | ------------------------- |
| Flesch-Kincaid grade | `<= 8` and below baseline     | reading level             |
| Word count          | below baseline                | padding                   |
| Difficult-word ratio | below baseline                | jargon                    |
| Avg sentence length  | `<= 20` words                 | run-on sentences          |

The difficult-word ratio is the share of words outside the Dale-Chall list of
3,000 easy words. A short sentence stuffed with jargon fails on that even though
it passes on length.

## Run it

```sh
cp .env.example .env      # then add your OPENROUTER_API_KEY
pnpm install
pnpm dev                  # terminal 1: starts the Flue server
pnpm evals                # terminal 2: runs the benchmark
```

Other commands:

```sh
pnpm test                 # unit tests for the scoring code, no API key needed
pnpm typecheck
pnpm evals:json           # writes vitest-results.json
pnpm exec vitest-evals serve vitest-results.json   # browse the report
EVAL_MODEL=openrouter/anthropic/claude-opus-4.8 pnpm dev   # benchmark a different model
```

Models run through [OpenRouter](https://openrouter.ai), so `EVAL_MODEL` is
`openrouter/` plus an OpenRouter slug — `openrouter/openai/gpt-5.5`,
`openrouter/moonshotai/kimi-k2.6`, and so on. One key, many models.

One caveat: the slug must be in the model catalog Flue bundles via
`@earendil-works/pi-ai`, and that catalog lags OpenRouter's live list.
`anthropic/claude-opus-5` is on OpenRouter today but is not in the bundled
catalog, so it will not resolve. Verified working slugs at the pinned version
include `anthropic/claude-sonnet-5`, `anthropic/claude-opus-4.8`, and
`anthropic/claude-haiku-4.5`. See [Pi's provider docs](https://pi.dev/docs/latest/providers)
for the full catalog.

## Notes on the measurement

- **Markdown is stripped before scoring.** `src/evals/metrics.ts` converts markdown to
  plain prose first. This is not cosmetic: `text-readability` only ends a sentence when
  the next character is a capital letter, so an unprocessed bullet list counts as one
  giant sentence. Left alone, it would punish exactly the bulleted output the skill
  is meant to produce.
- **Code is excluded.** Code blocks and inline code are removed before scoring, so
  the skill is never rewarded for dumbing down a command or a stack trace.
- **The agent chooses when to load the skill.** Flue does not force it. If the numbers
  do not move, check the skill's `description` before blaming its rules.
- **Per-prompt asserts on LLM output can be flaky.** If they prove noisy, switch the
  gates to medians across all 10 prompts rather than loosening the thresholds.

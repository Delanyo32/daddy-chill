# daddy-chill

<img src="daddy-chill.gif" alt="Daddy chill" width="360">

Skill that tells your agent to relax with all those big words and cognitive overload.
Ships with a benchmark that measures whether it actually works.

## Install the skill

Copy the skill folder into any Agent Skills host:

```sh
cp -r src/skills/daddy-chill ~/.claude/skills/
```

## How the benchmark works

Two agents, identical except for one thing:

| Agent         | Skill        | Role      |
| ------------- | ------------ | --------- |
| `plain`       | none         | control   |
| `daddy-chill` | daddy-chill  | treatment |

Each of the 15 prompts in `src/evals/prompts.json` runs through both. Then
[`text-readability`](https://github.com/clearnote01/readability) scores each answer.
The last five prompts test writing: emails, updates, guides, rewrites, and review comments.

| Metric              | Gate                          | What it catches           |
| ------------------- | ----------------------------- | ------------------------- |
| Flesch-Kincaid grade | `<= 8` and below baseline     | reading level             |
| Word count          | below baseline                | padding                   |
| Difficult-word ratio | below baseline                | jargon                    |
| Avg sentence length  | `<= 20` words                 | run-on sentences          |
| Em dash count         | `0`                           | banned punctuation        |

The difficult-word ratio is the share of words outside the Dale-Chall list of
3,000 easy words. A short sentence stuffed with jargon fails on that even though
it passes on length.

### Latest benchmark results

15 prompts, mean scores, `openrouter/anthropic/claude-opus-4.8`:

| Metric | Plain | daddy-chill | Change |
| ------ | ----: | ----------: | ------: |
| Flesch-Kincaid grade | 9.73 | 4.99 | -48.7% |
| Readability standard | 10.73 | 6.53 | -39.1% |
| Word count | 388.7 | 225.5 | -42.0% |
| Difficult-word ratio | 23.03% | 16.19% | -29.7% |
| Avg sentence length | 13.49 | 8.77 | -35.0% |

10 of 15 prompts passed in the latest run.

The five failures show where the eval needs more work:

- Two technical answers stayed above the grade-level ceiling.
- One customer update used an em dash.
- Two writing prompts were longer than the plain baseline.

The last failure shows that the word-count gate is too strict for some rewrite tasks.
A clearer rewrite can be longer than a poor baseline. The next version should use
writing-specific length limits or aggregate checks.

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
`openrouter/` plus an OpenRouter slug, such as `openrouter/openai/gpt-5.5`,
`openrouter/moonshotai/kimi-k2.6`, and so on. One key, many models.


## Web access

Both agents share one virtual sandbox (`src/shared/sandbox.ts`), so the skill stays
the only difference between them. Several prompts name a repo URL or need current
information, so the sandbox has the network switched on.

What the agents actually get:

- `curl` and `wget`, usually piped through `html-to-markdown` to read a page
- the rest of just-bash: `cat`, `grep`, `rg`, `sed`, `awk`, `jq`, `python3`, `sqlite3`
- an empty in-memory workspace at `/workspace`, gone when the session ends

What they do **not** get: no web search command, and no `git`. Repositories have to
be read through `raw.githubusercontent.com` or the GitHub API.


## Notes on the measurement

- **Markdown is stripped before scoring.** `src/evals/metrics.ts` converts markdown to
  plain prose first. This is not cosmetic: `text-readability` only ends a sentence when
  the next character is a capital letter, so an unprocessed bullet list counts as one
  giant sentence. Left alone, it would punish exactly the bulleted output the skill
  is meant to produce.
- **Code is excluded.** Code blocks and inline code are removed before scoring, so
  the skill is never rewarded for dumbing down a command or a stack trace.
- **The skill is always on in the treatment agent.** The agent receives the style rules
  as core instructions, while the packaged skill remains available for compatibility.
- **Per-prompt asserts on LLM output can be flaky.** The current run uses strict
  per-prompt gates. If they prove noisy, switch the gates to medians across all 15
  prompts rather than loosening the thresholds.
- **A refusal scores well.** "I could not fetch that page" is short, plain, and grades
  low, so it passes every gate while answering nothing. The gates measure readability,
  not correctness. If fetches start failing, the benchmark may look healthy. Read the
  logged before/after text, not just the pass count.

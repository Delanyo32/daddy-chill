# daddy-chill

<img src="daddy-chill.gif" alt="Daddy chill" width="360">

Skill that tells your agent to relax with all those big words and cognitive overload.
Ships with a benchmark that measures whether it actually works.

Built by [Virgil Labs](https://virgillabs.ai).

## What it does

Pins agent output to an 8th-grade reading level. Short sentences, plain words, no
filler. The rules come from Simplified Technical English, the standard behind
aircraft maintenance manuals.

Latest run, 20 prompts, median, against an unskilled control:

| | Plain | daddy-chill |
| --- | ---: | ---: |
| Flesch-Kincaid grade | 9.15 | **4.10** |
| Word count | 374 | **138** |
| Facts per 100 words | 3.59 | **6.55** |

It keeps 96.2% of the facts a reader needed, in a third of the words.
[Full results](docs/results.md).

## Install

```sh
npx daddy-chill install
```

The installer detects supported CLIs and asks which ones to install. It asks for
global or project scope too. Supported adapters are Claude Code, Gemini CLI,
OpenCode, and pi. Restart each CLI after installing.

Non-interactive, or one host at a time:

```sh
npx daddy-chill install --global --all --yes
npx daddy-chill install --global --agent claude --yes
npx daddy-chill uninstall --global --all --yes
```

Use `--link` for a symlink. Copies are the default. For local development, swap
`npx daddy-chill` for `node install.mjs`.

### Portable skill

Install the skill alone with the [Vercel Skills CLI](https://github.com/vercel-labs/skills):

```sh
npx skills add Delanyo32/daddy-chill --skill daddy-chill
```

Add `-g` for a global install. This gives you the skill, but not always-on
activation or the slash command.

## Run the benchmark

```sh
cp .env.example .env      # then add your OPENROUTER_API_KEY
pnpm install
pnpm dev                  # terminal 1: starts the Flue server
pnpm evals                # terminal 2: runs the benchmark
```

Warning: `pnpm dev` reloads on any file change, and a reload mid-run kills every
in-flight prompt with a 503. Do not edit files while `pnpm evals` is running.

```sh
pnpm test                 # unit tests for the scoring code, no API key needed
pnpm typecheck
pnpm evals:json           # writes vitest-results.json
pnpm exec vitest-evals serve vitest-results.json   # browse the report
```

Models run through [OpenRouter](https://openrouter.ai). `EVAL_MODEL` is
`openrouter/` plus a slug, such as `openrouter/openai/gpt-5.5`. `JUDGE_MODEL` sets
the judge separately and does not follow `EVAL_MODEL`.

## Repo layout

| Path | What it is |
| --- | --- |
| `skills/daddy-chill/` | the skill itself, and what ships to users |
| `src/shared/rules.ts` | the same rules, for the benchmark agent |
| `src/agents/` | `plain` (control), `daddy-chill` (treatment), `judge` (the ruler) |
| `src/evals/` | prompts, metrics, and the benchmark |
| `hooks/`, `commands/`, `runtime/` | always-on activation, per CLI |
| `install.mjs` | the cross-CLI installer |

## Docs

- [The rules](docs/rules.md): what the skill enforces and where each rule came from
- [The benchmark](docs/benchmark.md): how it measures, and what each gate catches
- [Results](docs/results.md): latest numbers, run history, known defects

## Publishing

```sh
npm run package:check     # inspect package contents first
npm login
npm version patch
npm publish
```

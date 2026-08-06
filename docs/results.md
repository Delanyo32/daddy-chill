# Results

20 prompts, median scores, `openrouter/anthropic/claude-opus-4.8` under test, judged
by `openrouter/anthropic/claude-sonnet-5`.

## Latest run

| Metric | Plain | daddy-chill | Change |
| --- | ---: | ---: | ---: |
| Flesch-Kincaid grade | 9.15 | 4.10 | -55.2% |
| Readability standard | 11.00 | 5.50 | -50.0% |
| Word count | 374.0 | 138.0 | -63.1% |
| Difficult-word ratio | 24.03% | 14.24% | -40.7% |
| Avg sentence length | 12.00 | 6.69 | -44.3% |
| Tense violations | 0.5 | 0.0 | -100% |
| Synonym drift | 0.0 | 0.0 | none either way |
| **Facts per 100 words** | **3.59** | **6.55** | **+82.5%** |

Facts kept: 96.2% of core facts, 67.9% of all facts.

Read those two numbers together. daddy-chill answers in a third of the words and
throws away a third of what the plain agent said, but keeps 19 in 20 of the facts a
reader needed. The gap between 96.2% and 67.9% is padding, not answer.

15 of 20 prompts passed. All 8 median gates passed.

## Run history

Three runs while fixing the compression rule. Same prompts, same models.

| Median | Run 1 | Run 2 | Run 3 |
| --- | ---: | ---: | ---: |
| Core facts kept | 88.9% | 95.0% | **96.2%** |
| All facts kept | 64.6% | 72.4% | 67.9% |
| Word count | 109 | 146.5 | 138 |
| Grade | 3.80 | 3.60 | 4.10 |
| Facts per 100 words | 6.96 | 6.27 | 6.55 |
| Prompts passed | 17/20 | 16/20 | 15/20 |

Run 1 used the first version of the `Compress, do not cut` rule. Run 2 used the
rewrite. Run 3 added the one-dropped-fact carve-out to the per-prompt gate.

Two things to read off this table.

**The rule fix worked.** Core retention went 88.9% to 96.2%. It cost 29 median words,
which is the trade we wanted.

**The pass count is noise.** Runs 2 and 3 differ only in a gate that cannot affect
agent output, yet different prompts failed each time. 17, 16, 15, with only two
prompts repeating across runs. Treat the per-prompt gates as a smoke detector for one
bad answer, not as a score. Every median held steady across all three.

## Known defects

**On "list the things" questions, the skill still drops items.** The AI hallucination
prompt failed in all three runs, dropping items like MIT RLCR, the verifier layer, and
the sycophancy work. It is the only prompt that failed consistently, so it is the only
one worth chasing. The rest did not repeat.

**Sentences run one or two words long.** The last run produced sentences of 21 and 22
words against the 20-word limit. Real, but marginal. Note that a bullet counts as one
sentence after markdown stripping, so a 21-word bullet fails by one word.

**Tense violations and synonym drift are not earning their place.** Both sat at or near
a median of 0 for both arms across every run. They cost nothing to keep, but they have
not caught anything either. Delete them if they stay flat.

## Reproducing

```sh
cp .env.example .env      # then add your OPENROUTER_API_KEY
pnpm install
pnpm dev                  # terminal 1
pnpm evals                # terminal 2
```

Do not edit files while `pnpm evals` runs. `pnpm dev` reloads on any file change, and
a reload mid-run kills every in-flight prompt with a 503. An early run lost 18 of 20
prompts that way.

A refusal used to score well on every readability gate while answering nothing. The
facts-kept gate closes that hole, but still read the logged before/after text rather
than only the pass count. If page fetches start failing, the numbers can look healthy
while the answers are empty.

# Results

20 prompts, median scores, `openrouter/anthropic/claude-opus-4.8` under test, judged
by `openrouter/anthropic/claude-sonnet-5`.

## Latest run

| Metric | Plain | daddy-chill | Change |
| --- | ---: | ---: | ---: |
| Flesch-Kincaid grade | 8.80 | 3.60 | -59.1% |
| Readability standard | 11.00 | 5.00 | -54.5% |
| Difficult-word ratio | 23.58% | 12.16% | -48.4% |
| Avg sentence length | 11.94 | 7.66 | -35.8% |
| Tense violations | 0.5 | 0.0 | -100% |
| Synonym drift | 0.5 | 0.0 | -100% |
| Word count (not gated) | 387.5 | 201.0 | -48.1% |
| **Facts needed to act, kept** | | **100.0%** | |

All facts kept: 70.0%. Unexplained hard terms: 5 across 20 answers.

Read the two fact numbers together. The skill answers in about half the words and
leaves out 30% of what the plain agent said, while keeping everything a reader needs
in order to act. The gap between 100% and 70% is background, not answer.

11 of 20 prompts kept 100% of the facts needed to act.

13 of 20 prompts passed. All 7 median gates passed.

## Run history

Runs 1 to 3 measured semantic compression: facts kept per 100 words, with a gate that
the skill write fewer words than the control. Runs 4 to 6 dropped that goal.

| Median | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | **Run 6** |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Grade | 3.80 | 3.60 | 4.10 | 3.70 | 3.75 | **3.60** |
| Difficult-word ratio | | | 14.24% | 13.13% | 12.84% | **12.16%** |
| Word count | 109 | 146.5 | 138 | 123 | 151 | **201** |
| Facts kept, gated measure | 88.9% | 95.0% | 96.2% | 87.3% | 87.5% | **100.0%** |
| Prompts passed | 17/20 | 16/20 | 15/20 | 13/20 | 14/20 | **13/20** |

What changed each run:

| Run | Rules |
| --- | --- |
| 1 | first version of `Compress, do not cut` |
| 2 | rewrite of that rule, naming items instead of facts |
| 3 | added the one-dropped-fact carve-out to the per-prompt gate |
| 4 | removed the compression section entirely |
| 5 | tried one line, `Keep every fact, step, risk, and caveat` |
| 6 | removed compression as a goal, added explain-the-term and act-completeness |

The gated measure is not the same across runs. Runs 1 to 5 gated core facts, meaning
facts a reader needs to *answer* the question. Run 6 gates facts a reader needs to
*act*. The judge prompt changed with it, so do not read 87.3% and 100.0% as the same
ruler. Read the direction, not the gap.

Three things to read off this table.

**Compression was costing reading level.** Run 3 held the highest retention and also
the worst grade (4.10) and worst jargon (14.24%). The facts it forced back in are
harder than the text around them. Measured: the facts run 4 dropped score 31.8% on the
difficult-word ratio, against 13.13% for the answers themselves.

**One line did not replace the section.** Run 5 added 28 words over run 4 and moved
retention 0.2 points. Concrete rules worked, an abstract one did not.

**Dropping the length goal is what fixed retention.** Run 6 writes 201 median words,
the longest of any run, and keeps 100% of what a reader needs. Runs 1 to 5 were all
trading completeness for brevity because brevity was a pass condition.

**The pass count is noise.** Three runs of identical code gave 17, 16, and 15 with
different prompts failing each time. Treat per-prompt gates as a smoke detector for
one bad answer, not as a score.

## Known defects

**Long sentences got worse.** Run 6 failed three prompts on the 20-word cap, at 21,
22, and 36 words. The 36-word case is the colibri repo prompt. Explaining a term in
the same sentence that uses it is the likely cause. Splitting the explanation into its
own sentence is the fix to try.

**On "list the things" questions, the skill still drops items.** The five-step setup
guide kept 5 of 10 needed facts, dropping access requests, two-factor auth, the test
baseline, and the pull request step. This prompt has failed in every run.

**Five hard terms shipped unexplained**: `$dist`, `compare-and-swap`, `npm run dev`,
`Git`, and `Trustworthy Language Model`. This is reported, not gated. The judge is
loose about what counts as hard, so gating it now would fail on noise.

**Tense violations and synonym drift barely move.** Both sat at a baseline median of
0.5 and a skilled median of 0. They cost nothing to keep but rarely catch anything.

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

Set `EVAL_AGENT` to score a different agent against the same prompts and gates. This
is how a candidate rule gets tested before it lands in `SKILL.md`:

```sh
EVAL_AGENT=my-variant pnpm evals
```

A refusal used to score well on every readability gate while answering nothing. The
facts-needed-to-act gate closes that hole, but still read the logged before/after text
rather than only the pass count. If page fetches start failing, the numbers can look
healthy while the answers are empty.

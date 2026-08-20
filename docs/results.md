# Results

25 prompts, median scores, `openrouter/anthropic/claude-opus-4.8` under test, judged
by `openrouter/anthropic/claude-sonnet-5`.

## Latest run

Run 7 is an A/B on one prompt set. Both arms ran the same 25 prompts and the same
model. The only change is the skill text: `gloss` and `bare` replaced nine scattered
rules, and the 422-word list was deleted.

| Metric | Run 6 skill | Run 7 skill | Change |
| --- | ---: | ---: | ---: |
| Unexplained terms across 25 answers | 11 | 5 | -54.5% |
| Answers a non-expert could not act on | 2 | 0 | -100% |
| Difficult-word ratio | 16.69% | 14.94% | -10.5% |
| Flesch-Kincaid grade | 4.00 | 3.40 | -15.0% |
| Avg sentence length | 9.84 | 9.42 | -4.3% |
| Word count (not gated) | 368.0 | 305.0 | -17.1% |
| Facts needed to act, kept | 91.7% | 91.7% | none |
| Prompts passed | 11/25 | 11/25 | none |

Against the plain control, Run 7 scores grade 9.00 to 3.40 and jargon 28.82% to 14.94%.

**The word list was a no-op.** `SKILL.md` told the agent to read a 422-word verb and
adjective list before every answer. Deleting it made word choice better, not worse:
16.69% to 14.94%. No agent was reading it, and reading it would have cost about six
times the whole skill in tokens.

**One gate still fails, from before this change.** The median grade must land between 6
and 8. Run 6's skill scored 4.00 and Run 7's scores 3.40. The floor exists to catch
answers that got "simpler" by cutting explanations. That is not what happened here:
unexplained terms halved and unusable answers went to zero over the same set. The floor
gate and the thing it proxies for now disagree, so the gate needs its own look.

## Run history

Runs 1 to 6 used a 20-prompt set. Run 7 uses 25, so only Run 7 rows compare directly.

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

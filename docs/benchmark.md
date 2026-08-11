# The benchmark

How the repo measures whether the skill works, and what each gate catches.

## Three agents

Two arms, identical except for one thing, plus a judge that scores both.

| Agent | Skill | Role |
| --- | --- | --- |
| `plain` | none | control |
| `daddy-chill` | daddy-chill | treatment |
| `judge` | none | the ruler |

Each of the 20 prompts in `src/evals/prompts.json` runs through both arms. Then
[`text-readability`](https://github.com/clearnote01/readability) scores each answer
and the judge scores what survived.

Prompts 1 to 10 are technical questions. Prompts 11 to 15 test writing: emails,
updates, guides, rewrites, and review comments. Prompts 16 to 20 test procedures,
which is what STE was built for.

The judge model is pinned separately. `JUDGE_MODEL` defaults to Sonnet 5 and does not
follow `EVAL_MODEL`, because benchmarking a different model must not also move the
ruler.

The judge does two jobs. It counts the facts a reader needs in order to act, and it
lists any hard term the answer used but never explained.

The treatment arm is swappable. `EVAL_AGENT` defaults to `daddy-chill`, and pointing
it at another agent scores that agent against the same prompts and the same gates:

```sh
EVAL_AGENT=my-variant pnpm evals
```

That is how a candidate rule gets measured before it lands in `SKILL.md`. Add an agent
under `src/agents/` that carries the change, run it, and compare. Two rule changes were
rejected this way before the current rules shipped.

## Per-prompt gates

Things a single answer either does or does not do. No baseline needed.

| Metric | Gate | What it catches |
| --- | --- | --- |
| Longest sentence | `<= 20` | one run-on hiding behind a good average |
| Longest paragraph | `<= 6` | walls of text |
| Em dash count | `0` | banned punctuation |
| Facts needed to act | `>= 80%`, or 1 dropped | a step the reader cannot proceed without |

The needed-facts gate tolerates a single dropped fact on purpose. A ratio gate has a
denominator problem: with 4 needed facts the only reachable scores are 1.0, 0.75, and
0.5, so `>= 80%` silently becomes "zero misses" whenever the judge finds few facts.
Two dropped facts fails at any size, and the median gate below catches loss spread
thinly across every prompt.

Longest sentence matters more than the average. Four short bullets pull an average
down to 7 words, so a single 40-word sentence passes an average gate untouched.

## Median gates

Reading level swings with the question, so these run across all 20 prompts at once.

| Metric | Gate | What it catches |
| --- | --- | --- |
| Flesch-Kincaid grade | `<= 8` and below baseline | reading level |
| Difficult-word ratio | below baseline | jargon |
| Avg sentence length | `<= 20` words | long sentences |
| Tense violations | at or below baseline | non-simple tenses |
| Synonym drift | at or below baseline | many words, one idea |
| Facts needed to act | `>= 80%` | steady, thin loss of steps |

The difficult-word ratio is the share of words outside the Dale-Chall list of 3,000
easy words. A short sentence stuffed with jargon fails on that even though it passes
on length.

Median, not mean. One refusal or one runaway answer should not move the number.

## Reported, never gated

| Metric | Why it is not a gate |
| --- | --- |
| Word count | brevity is not a goal. A clear answer is allowed to be longer. |
| All facts kept | the control is verbose by design, so its tangents are not a target. |
| Unexplained hard terms | the judge is loose about what counts as hard. Gating it now would fail on noise. |

The benchmark used to gate word count and "facts per 100 words". Both are gone.
Measurement showed the compression goal was raising the reading level, because the
facts it forced back in are the hardest words in the answer. See
[the rules](rules.md#what-we-removed).

## Facts needed to act

This is the headline number, and the only gate that can tell a simpler answer from an
incomplete one.

Every other metric rewards saying less. "I could not fetch that page" is short,
plain, and grades low, so it used to pass every readability gate while answering
nothing.

So the `judge` agent lists the facts in the plain answer, then counts how many the
daddy-chill answer still states. A refusal keeps 0 and scores 0.

**Needed, not all.** The judge marks a fact NEEDED if the reader must have it to act:
a step, a value, a command, a flag, a precondition, or a warning about damage or data
loss. Everything else is EXTRA. Only needed facts are gated.

The plain agent is verbose by design. That is what makes it a control. Grading against
every scrap of it would mean the only way to pass is to repeat it. Both numbers are
reported, so you can see the gap: the space between "facts needed to act" and "all
facts kept" is background the skill correctly left out.

## Unexplained terms

Some terms have no easy synonym. The skill keeps them exact and explains them in plain
words. The judge lists any hard term the answer used but never explained, so you can
see when the skill kept a `pg_restore` or a `PITR` bare.

This is reported only. It is a new measure and the judge is inconsistent about what
counts as hard, so it does not fail a run yet.

## Notes on the measurement

- **Markdown is stripped before scoring.** `src/evals/metrics.ts` converts markdown to
  plain prose first. This is not cosmetic: `text-readability` only ends a sentence when
  the next character is a capital letter, so an unprocessed bullet list counts as one
  giant sentence. Left alone, it would punish exactly the bulleted output the skill is
  meant to produce.
- **Code is excluded.** Code blocks and inline code are removed before scoring, so the
  skill is never rewarded for dumbing down a command or a stack trace.
- **Bullets are not paragraphs.** The paragraph gate skips bullets, headings, and table
  rows. The skill asks for bullets, and a bullet is one idea by rule, so a long list is
  not a wall of text.
- **Tense violations and synonym drift are regex, not a parser.** "is interesting" reads
  as a progressive verb, and "verifies" is missed because only exact word forms match.
  Both arms get the same ruler, so a shared error rate cancels out. That is why they are
  gated against the baseline and never against zero.
- **Do not read the pass count as a score.** Three runs of identical code gave 17, 16,
  and 15 passes with different prompts failing each time. A prompt has to fail across
  several runs before it means anything.
- **The skill is always on in the treatment agent.** It receives the style rules as core
  instructions, so the benchmark never tests whether a model decides to load a skill.
  The packaged skill stays attached for compatibility.

## Unit tests

`pnpm test` runs 23 tests against the scoring code with no API key and no model calls.
Every metric is a pure function with a fixture. It covers the markdown-to-prose
conversion, each new STE metric, the median, the judge output parser, and the
rules-drift check.

A garbled judge reply throws rather than scoring zero, because a silent 0 would read
as "the skill dropped every fact" and fail the wrong thing.

## Web access

Both agents share one virtual sandbox (`src/shared/sandbox.ts`), so the skill stays the
only difference between them. Several prompts name a repo URL or need current
information, so the sandbox has the network switched on.

What the agents get:

- `curl` and `wget`, usually piped through `html-to-markdown` to read a page
- the rest of just-bash: `cat`, `grep`, `rg`, `sed`, `awk`, `jq`, `python3`, `sqlite3`
- an empty in-memory workspace at `/workspace`, gone when the session ends

What they do not get: no web search command, and no `git`. Repositories have to be read
through `raw.githubusercontent.com` or the GitHub API.

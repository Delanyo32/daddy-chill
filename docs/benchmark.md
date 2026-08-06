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

## Per-prompt gates

Things a single answer either does or does not do. No baseline needed.

| Metric | Gate | What it catches |
| --- | --- | --- |
| Longest sentence | `<= 20` | one run-on hiding behind a good average |
| Longest paragraph | `<= 6` | walls of text |
| Em dash count | `0` | banned punctuation |
| Core facts kept | `>= 80%`, or 1 dropped | facts dropped instead of shortened |

The core-facts gate tolerates a single dropped fact on purpose. A ratio gate has a
denominator problem: with 4 core facts the only reachable scores are 1.0, 0.75, and
0.5, so `>= 80%` silently becomes "zero misses" whenever the judge finds few facts.
Two dropped facts fails at any size, and the median gate below catches loss spread
thinly across every prompt.

Longest sentence matters more than the average. Four short bullets pull an average
down to 7 words, so a single 40-word sentence passes an average gate untouched.

## Median gates

Reading level and length swing with the question, so these run across all 20 prompts
at once.

| Metric | Gate | What it catches |
| --- | --- | --- |
| Flesch-Kincaid grade | `<= 8` and below baseline | reading level |
| Word count | below baseline | padding |
| Difficult-word ratio | below baseline | jargon |
| Avg sentence length | `<= 20` words | long sentences |
| Tense violations | at or below baseline | non-simple tenses |
| Synonym drift | at or below baseline | many words, one idea |
| Core facts kept | `>= 80%` | steady, thin fact loss |
| Facts per 100 words | above baseline | the whole point |

The difficult-word ratio is the share of words outside the Dale-Chall list of 3,000
easy words. A short sentence stuffed with jargon fails on that even though it passes
on length.

Median, not mean. One refusal or one runaway answer should not move the number.

## Facts per 100 words

This is the headline number, and the only one that can tell compression from
deletion.

Every other metric rewards saying less. "I could not fetch that page" is short,
plain, and grades low, so it used to pass every readability gate while answering
nothing.

So the `judge` agent lists the facts in the plain answer, then counts how many the
daddy-chill answer still states. Density is facts kept divided by words used. A
refusal keeps 0 facts and scores 0.

**Core facts, not all facts.** The judge splits each fact into core (a reader needs it
to answer the question) and extra (tangents, options, and troubleshooting nobody asked
for). Only core facts are gated.

The plain agent is verbose by design. That is what makes it a control. Grading
compression against every scrap of it would mean the only way to pass is to not
compress. Both numbers are reported, so you can see the gap: the space between "core
facts kept" and "all facts kept" is padding the skill correctly threw away.

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

`pnpm test` runs 22 tests against the scoring code with no API key and no model calls.
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

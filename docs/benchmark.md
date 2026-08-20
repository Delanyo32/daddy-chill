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
| Bare identifiers | `0` | a command, key, or column label shown with no plain words near it |
| Unexplained hard terms | `0` | the same failure, caught by the judge instead of a regex |
| Usable by a non-expert | `true` | an answer the reader cannot act on without a follow-up question |
| Em dash count | `0` | banned punctuation |
| Facts needed to act | `>= 80%`, or 1 dropped | a step the reader cannot proceed without |

Every gate here scores meaning. The form gates that used to sit alongside them are
gone. See [what stopped being a gate](#what-stopped-being-a-gate).

The needed-facts gate tolerates a single dropped fact on purpose. A ratio gate has a
denominator problem: with 4 needed facts the only reachable scores are 1.0, 0.75, and
0.5, so `>= 80%` silently becomes "zero misses" whenever the judge finds few facts.
Two dropped facts fails at any size, and the median gate below catches loss spread
thinly across every prompt.

## Median gates

Reading level swings with the question, so these run across all 20 prompts at once.

| Metric | Gate | What it catches |
| --- | --- | --- |
| Flesch-Kincaid grade | `<= 8` | reading level |
| Difficult-word ratio | below baseline | jargon |
| Tense violations | at or below baseline | non-simple tenses |
| Synonym drift | at or below baseline | many words, one idea |
| Slop phrases | at or below baseline | AI tells every other metric scores as easy |
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
| Longest sentence | the `unslop` rules ask for varied rhythm. See below. |
| Avg sentence length | same rule, measured across the set. |
| Longest paragraph | "let some mess in" is now a rule the skill ships. |
| Numbers per 100 words | two `unslop` rules tell the answer to replace a vague word with a number. |
| Reading grade floor | every `unslop` rule pushes the score down. A floor would fight all of them. |

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
words. Leaving one bare is the failure that costs a reader the answer, so it is gated
twice, from two directions.

| Check | Where | Catches | Misses |
| --- | --- | --- | --- |
| `bareIdentifiers` | `src/evals/metrics.ts` | shape-detected names: `RSS`, `PCIe`, `MADV_WILLNEED`, `vmhwm_mb`, `assignLayers`, and any one-word inline code span | all-lowercase coinages like `mmap` |
| `unexplained` | the `judge` agent | anything a non-expert would not know, including the lowercase ones | whatever the judge is loose about |

Both gate at zero. Neither is reliable alone. The regex cannot tell a real definition
from a sentence that merely uses the term, so it only proves the floor case: a name shown
with no plain words anywhere near it. The judge reads for meaning but is inconsistent.
Together they cover each other.

This was reported and not gated for six runs. That is how a session shipped 40 undefined
terms while passing every median gate.

## Could a non-expert act on it?

The judge answers one question about the whole answer: could a reader who does not
already know the subject act on it without a follow-up question? It says false if the
reader would have to look up a term, guess what a number means, or work out which value
goes where.

This is the only gate that scores understanding instead of form. Every other number here
can be satisfied by an answer that is short, plain, complete, and unusable.

## What stopped being a gate

`SKILL.md` now ships the `unslop` rules word for word, and five gates told the answer
the opposite of what those rules ask for. All five were removed. Every one of them is
still measured and still printed.

| Removed gate | The rule it fought |
| --- | --- |
| longest sentence `<= 20` | "Vary rhythm. Short sentences. Then longer ones that take their time." |
| avg sentence length `<= 20` | the same rule, across the set |
| longest paragraph `<= 6` | "Let some mess in. Perfect structure looks machine-made." |
| numbers per 100 words, `20` and `12` | "significantly improves becomes the measured delta", and "the fix names the mechanism or a number" |
| reading grade floor `>= 6` | rules 7, 23, 28, 30, and 31, which all swap a long word for a plain one |

A long sentence a reader understands was never the failure this skill exists to stop.
What is left gates meaning: zero bare terms, a non-expert can act on it, and the facts
needed to act survive.

### The grade floor is the one to watch

The floor existed for a reason. The gate used to be `grade <= 8` alone, so lower always
won, and a real session held a median grade of 2.50 while leaving 40 terms undefined.
The floor caught that.

Three gates now cover the same failure from the meaning side: `bareIdentifiers`, the
judge's `unexplained` list, and `actionable`. All three were added after that session,
and none of them existed when the floor was written. If a run scores a very low grade
and still passes those three, the floor was measuring the wrong thing. If it scores low
and fails them, put the floor back.

## Numbers per 100 words

A wall of measurements reads as hard whatever the grade says. `numberDensity` counts
numbers per 100 words on the raw markdown, so tables count. It is reported, not gated.

The old caps, 20 per answer and a median of 12, were calibrated on one failing session.
The two answers that made the reader ask for something simpler scored 25.3 and 23.6.
The answer they accepted scored 4.4. Those numbers are the reason to keep printing it.

## Notes on the measurement

- **Markdown is stripped before scoring.** `src/evals/metrics.ts` converts markdown to
  plain prose first. This is not cosmetic: `text-readability` only ends a sentence when
  the next character is a capital letter, so an unprocessed bullet list counts as one
  giant sentence. Left alone, it would punish exactly the bulleted output the skill is
  meant to produce.
- **Code is excluded from the reading-level formulas, not from the run.** `toProse`
  removes code blocks and inline code, so the skill is never rewarded for dumbing down a
  command or a stack trace. `bareIdentifiers` and `numberDensity` read the raw markdown
  instead, because the identifiers and the number tables live in exactly the blocks
  `toProse` throws away.
- **The difficult-word ratio counts occurrences.** It used to divide `difficultWords` by
  total words, but that function returns a SET, so repeating one hard word improved the
  score as the answer grew. Measured on the old code: "Quantization matters." scored
  0.500 and the same sentence ten times scored 0.050. Dropping `text-readability`'s
  2-syllable floor was tried too, and rejected: it rates plain modern prose at 30.6%,
  because the Dale-Chall easy list predates "app", "login", and "click".
- **Some prompts are conversations.** An entry in `prompts.json` can be an array of
  turns. Every turn reuses one agent instance id, so the agent sees the whole thing, and
  only the last answer is scored. A session-start instruction has had time to drift by
  then, which single-turn prompts never test.
- **Bullets are not paragraphs.** The paragraph gate skips bullets, headings, and table
  rows. The skill asks for bullets, and a bullet is one idea by rule, so a long list is
  not a wall of text.
- **Slop is the gap every other metric leaves open.** "This is a pivotal moment in the
  evolving landscape" scores a grade of 5.9, has no long sentence, and hides no bare
  identifier. It passes every gate above and tells the reader nothing. `slopPhrases` in
  `src/evals/metrics.ts` counts a fixed list of AI tells instead. The list is the
  countable half of the rules; the ones that need judgement stay with the judge.
- **The skill now carries a rule that fights its own gates.** `SKILL.md` ships the
  `unslop` section word for word, and that section asks for varied rhythm and "let some
  mess in". The sentence cap and the gloss rule outrank it, and
  `skills/daddy-chill/references/slop.md` records every clash. The gates that fought
  those rules are gone, so watch the printed numbers instead: `maxSentenceLength`,
  `maxParagraphSentences`, `numberDensity`, and `grade`.
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

`pnpm test` runs 43 tests against the scoring code with no API key and no model calls.
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

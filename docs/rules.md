# The rules

What the skill enforces, where each rule came from, and what we chose not to take.

The rules ship in `skills/daddy-chill/SKILL.md`. The agent-facing reference lives in
`skills/daddy-chill/references/ste.md`, which the agent loads only when it needs the
reasoning behind a rule.

## One source

**Simplified Technical English (ASD-STE100)** is the standard behind aircraft
maintenance manuals. Issue 9 (January 2025) has 53 writing rules and a dictionary of
about 900 approved words. It exists because a mechanic misreading a step is a safety
problem, so every rule is aimed at removing ambiguity.

The skill borrows the rules that help any reader, and skips the dictionary.

**Brevity is not a goal.** The skill used to chase semantic compression, meaning the
most meaning per word. That is gone. See [what we removed](#what-we-removed) for the
measurements that killed it. The goal now is that a reader can act on the answer
without asking a follow-up question. A shorter answer is a side effect of plain words,
not a target.

## What we took from STE

| Rule | STE limit | Why it helps any reader |
| --- | --- | --- |
| Short sentences | 20 words in a procedure, 25 in a description | one idea per sentence |
| Short paragraphs | 6 sentences, one topic | no walls of text |
| No noun stacks | 3 nouns max in a row | past 3, nobody can tell what modifies what |
| One word, one meaning | each word has one meaning and one part of speech | switching between "verify", "check", and "confirm" makes the reader ask if you meant three things |
| Simple tenses only | imperative, infinitive, simple present/past/future | no present perfect, no "-ing" as a verb |
| Active voice | required in procedures | "Replace the screws" beats "The screws should be replaced" (by whom?) |
| One instruction per sentence | required | steps you can follow without re-reading |
| Warning first | safety before the step | a warning after the step is a warning too late |

## What we did not take

- **The 900-word dictionary.** Too big for a prompt, and most of it is aerospace
  vocabulary. The skill says "use plain words" and lists a few common swaps instead.
  Add the dictionary if word choice turns out to be what fails.
- **The 20 vs 25 word split.** The skill uses one flat 20-word limit. Two limits are
  harder to follow than one, and the agent would have to classify its own sentences
  first.
- **The other 45 rules.** Most of them are specific to maintenance manuals: how to
  write a torque value, when to use a figure callout. They do not transfer.

## What we added

Three things STE does not cover, because STE assumes you already decided what to say.

**Answer first.** STE governs how you write a sentence, not what order the sentences
go in. An agent that buries the answer under three paragraphs of context has followed
every STE rule and still wasted the reader's time.

**Give the reader everything they need to act.** Every step, value, flag, and warning.
This is the completeness rule, and it is what the benchmark gates on.

**Some terms cannot be swapped.** A command name, a config key, an error string. There
is no easy synonym, and dropping the term leaves the reader unable to act. The rule is
to keep the term exact and explain it in plain words next to it:

```
- No: "Set the revision history limit."
- Yes: "Set `revisionHistoryLimit`. It is the number of old versions Kubernetes keeps."
```

## What we removed

The skill used to carry a `Compress, do not cut` section. It said to keep every item
from the longer answer while making each item shorter. It worked on its own terms:
core fact retention went from 88.9% to 96.2%.

It was removed anyway, because the benchmark showed it fighting the reading level.

**The evidence.** Run 3 held the best retention and also the worst grade (4.10) and
worst jargon (14.24%) of any run. Removing the section moved both the right way.

The mechanism is vocabulary, not sentence length. Sentences got *shorter* with the
rule. Pull the 53 facts the no-compression run dropped, and score them with the same
Dale-Chall ruler the benchmark uses:

| Text | Difficult-word ratio |
| --- | ---: |
| the facts that got dropped | 31.8% |
| the plain agent's own writing | 24.03% |
| the daddy-chill answers | 13.13% |

The dropped facts are 2.4 times harder than the answers they came from. They are
things like `REINDEX/VACUUM`, `PITR`, and named research papers. Proper nouns,
acronyms, and command names.

So the two rules were fighting over the same words. The simplicity rules said drop the
hard word. The compression rule said keep the item that word belongs to. Whichever won,
one metric got worse.

**The fix was not a compromise, it was a third option.** Keep the term, and explain it.
That satisfies both rules. A one-line version of the old rule was tested first and
failed: it added 28 median words and moved retention 0.2 points.

**Brevity stopped being a pass condition** at the same time. The benchmark no longer
asserts the skill writes fewer words than the control, and no longer scores facts per
100 words. Retention went to 100% and median length went to 201 words.

## Never simplify

Some text has to survive character for character, because rewriting it breaks
things:

- Code, commands, and flags
- File paths and names
- Error messages and stack traces
- API names, config keys, and version numbers

The skill explains these in plain words around the exact text. It does not paraphrase
the text itself. The benchmark enforces the same rule from the other side: code blocks
and inline code are stripped before scoring, so the skill is never rewarded for
dumbing down a command.

## One copy, two places

The rules live in `skills/daddy-chill/SKILL.md`. `src/shared/rules.ts` holds a
verbatim copy, because the benchmark agent cannot import `SKILL.md` as text: Flue
resolves that path to a `SkillReference`, which carries only an id, name, and
description.

`src/shared/rules.test.ts` fails if the two drift apart. Edit `SKILL.md`, then paste
into `rules.ts`, and the test tells you if you missed.

## Sources

- https://www.asd-ste100.org/
- https://en.wikipedia.org/wiki/Simplified_Technical_English
- https://www.techscribe.co.uk/techw/asd-simplified-technical-english.htm

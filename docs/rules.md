# The rules

What the skill enforces, where each rule came from, and what we chose not to take.

The rules ship in `skills/daddy-chill/SKILL.md`. The agent-facing reference lives in
`skills/daddy-chill/references/ste.md`, which the agent loads only when it needs the
reasoning behind a rule.

## Two sources

**Simplified Technical English (ASD-STE100)** is the standard behind aircraft
maintenance manuals. Issue 9 (January 2025) has 53 writing rules and a dictionary of
about 900 approved words. It exists because a mechanic misreading a step is a safety
problem, so every rule is aimed at removing ambiguity.

**Semantic compression** is rewriting for the most meaning per word. It is rewriting,
not truncating. The research finding that shapes this whole repo: faithfulness drops
as the compression ratio rises. A shorter answer is only better if nothing was lost,
so the benchmark has to measure what survived.

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

Two things STE does not cover, because STE assumes you already decided what to say.

**Answer first.** STE governs how you write a sentence, not what order the sentences
go in. An agent that buries the answer under three paragraphs of context has followed
every STE rule and still wasted the reader's time.

**Compress, do not cut.** This is the semantic compression half, and it took two
tries to get right.

The first version said "every fact in the long answer stays in the short one". That
failed, and the benchmark showed exactly how: the skill silently deleted list items.
It dropped 2 of 5 code review findings including a crash, and 4 items from a
five-step setup guide. The wording pointed at "the long answer", an artifact that
does not exist, because the agent writes fresh rather than rewriting something.
"Answer first, detail only if asked" made it worse by giving permission to treat
finding #4 as detail.

The current version names items instead of facts:

```
Make each point shorter. Do not make fewer points.

- List every item you would have listed. Shorten each one. Drop none.
- If the question asks for five steps, give five steps.
- Keep every finding, step, risk, and caveat. Cut words, not items.
```

That moved core fact retention from 88.9% to 96.2%, at the cost of longer answers
(109 to 138 median words). See [results](results.md).

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
- https://arxiv.org/pdf/2501.00269 (faithfulness metrics survey)

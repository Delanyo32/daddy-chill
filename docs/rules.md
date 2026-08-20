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
  A 422-word verb and adjective subset shipped for one version and was removed. The
  skill told the agent to read it before every answer, which no agent did, and which
  would have cost six times the whole skill in tokens if one had.
- **The 20 vs 25 word split.** The skill uses one flat 20-word limit. Two limits are
  harder to follow than one, and the agent would have to classify its own sentences
  first.
- **The other 45 rules.** Most of them are specific to maintenance manuals: how to
  write a torque value, when to use a figure callout. They do not transfer.

## Two tiers, not one list

The rules used to be one flat list of 17 bullets. Everything had equal weight, so the
em dash rule sat next to the jargon rule and read the same size.

That is how the rules lost a fight to each other. "Keep sentences under 20 words" has a
number and a checklist entry. "Define it the first time in one short clause" has neither.
Defining a term inside the sentence that uses it makes a long sentence, so the model kept
the countable rule and dropped the definition. Run 6 recorded the same collision from the
other side: three prompts failed the 20-word cap, and the longest was 36 words because
the answer explained a term in the sentence that used it.

`SKILL.md` now has two tiers:

| Tier | Contains | Rank |
| --- | --- | --- |
| **Gloss every term** | answer first, gloss every hard term, idea before number, gloss column labels, warning first, everything needed to act | wins every conflict |
| **Cut the slop** | the 31 `unslop` rules, verbatim, plus `Adding soul` | loses to the tier above, beats the tier below |
| **Style** | sentence length, paragraph length, tenses, synonyms, noun stacks, active voice, em dashes | the default, not the ceiling |

One line makes the tie-break explicit: **write two sentences rather than drop a gloss.**

## The checklist used to undercut the rule

Two lines disagreed, and the looser one ran last:

| Where | Text | Terms it covers |
| --- | --- | --- |
| Rules | "define it the first time" | all |
| Check before sending | "any hard term used **more than once**" | 2 or more |

Every term used once got a free pass. In the failing session that pass covered 16 terms,
including `MADV_WILLNEED`, `GEMM`, `mlock`, and `TFLOP`. The checklist is the last thing
the model reads, so the loose version won. The phrase is gone.

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

## Always simple, except these

The section used to be called **Never simplify**, and the name was doing damage. It read
as a licence. Four bullets said "keep this exact", and one trailing sentence said
"explain it", so the model took the permission and skipped the duty.

It now leads with the default and frames the list as the one exception. The exception
covers the text itself, never the explanation of the text. Show, then explain, in that
order. The closing line names the failure directly: copying a command and moving on
fails the rule as badly as rewriting it.

Some text has to survive character for character, because rewriting it breaks
things:

- Code, commands, and flags
- File paths and names
- Error messages and stack traces
- API names, config keys, and version numbers

The skill keeps the text exact, then explains it in the next sentence. Both halves are
required. A bare command with no explanation fails this rule as badly as a rewritten one.

The benchmark used to enforce only one half. `toProse` strips code blocks and inline
code before scoring, so the skill is never rewarded for dumbing down a command. But the
strip cuts both ways: for six runs nothing punished the skill for dumping one raw either.

A real session shipped this and passed every median gate:

```
read_mb      356.3      359.5      341.3      341.3
vmhwm_mb     129.9      129.9       46.0       73.1
stall_ms       0.0        0.0        0.0        5.8
```

`vmhwm_mb` is never defined. The whole block was stripped, so the answer still scored a
Flesch-Kincaid grade of 2.5. The reader could not use it.

`bareIdentifiers` in `src/evals/metrics.ts` now reads the raw markdown and closes that
half. See [what the benchmark checks](./benchmark.md).

## The per-turn nudge

Session start sends the whole skill. Every turn after that sends this instead:

> Daddy Chill is on. The full rules went out at the start of this session. Apply them
> to this answer. Before you send, check the answer against every rule: answer first,
> no bare terms, exact code, plain words, active voice, no em dash, no slop.

The hooks used to re-send the rules on every message, because after ten tool calls the
session-start copy is tens of thousands of tokens back in the transcript and the style
drifts. That worked, and it cost the full rules every message.

The nudge is 461 characters. The rules are 9,480. The copy is still in the transcript,
so the nudge points at it instead of repeating it.

`getTurnReminder` in `runtime/instructions.mjs` holds the text. Three hooks call it:
`claude-prompt-submit.mjs`, `copilot-prompt-submit.mjs`, and `gemini-before-agent.mjs`.
Session start, subagent start, and `/daddy-chill on` still send the whole skill.

Keep it short. `src/shared/hooks.test.ts` fails if the nudge ever carries a section
heading from the rules, or grows past 1,000 characters. Past that it is the old
behaviour again under a new name.

## One copy, two places

The rules live in `skills/daddy-chill/SKILL.md`. `src/shared/rules.ts` holds a
verbatim copy, because the benchmark agent cannot import `SKILL.md` as text: Flue
resolves that path to a `SkillReference`, which carries only an id, name, and
description.

`src/shared/rules.test.ts` fails if the two drift apart. Edit `SKILL.md`, then paste
into `rules.ts`, and the test tells you if you missed.

## The second source

**unslop** is a skill in Cursor's plugin set. It lists 31 patterns that mark text as
AI-written, and the fix for each.

- https://github.com/cursor/plugins/blob/main/pstack/skills/unslop/SKILL.md

STE and unslop solve different halves of the same problem. STE makes a sentence easy to
parse: short, active, one idea, simple tense. It says nothing about whether the sentence
carries information. unslop is the other half. "This is a pivotal moment in the evolving
landscape of builds" obeys every STE rule and every daddy-chill gate. It reads at a
Flesch-Kincaid grade of 5.9, runs 11 words, uses active voice, and stacks no nouns. It
also tells the reader nothing.

That answer used to pass the benchmark clean. Now it fails on `slop`.

### What we took

All 31 rules, plus the `Adding soul` section, copied word for word into `SKILL.md`.
Nothing was summarised, and nothing was left out.

The copy is checked, not trusted. Undo the heading demotion and the section is character
for character identical to the source file.

### Rank, not exclusion

`SKILL.md` already ranked its rules, so the new section slots in at the bottom:

| Rank | Section | Wins against |
| --- | --- | --- |
| 1 | Gloss every term | everything |
| 2 | Cut the slop | Style |
| 3 | Style | nothing |

That settles the collisions without editing a word of the source.

`Cut the slop` sits above `Style` on purpose. Ranking it below would have left the
20-word cap and the bullets-first rule beating "vary rhythm" and "let some mess in"
every time, so the section would have shipped and changed nothing. Style is now the
default, not the ceiling.

`Gloss every term` still wins over both. Mess in the rhythm is never a licence for a
bare term. Every clash and its ruling is written down in
`skills/daddy-chill/references/slop.md`, including the colon rule, the parentheses ban,
and the inline-header rule that would otherwise read as an attack on glosses.

Five of the 31 restate rules the skill already had: em dashes, active voice, plain
words, split dense sentences, and one word one meaning. The repeat stays, because the
section is verbatim.

### What it costs

`SKILL.md` went from 484 words to 1,541.

At the time, the hooks re-sent the whole file on every turn, so that was about 1,400
extra tokens per message. That is what killed the 422-word approved-words list once
before.

It is not what happens now. Session start sends the rules once, and every turn after
that sends a nudge of about 90 words instead. See [the per-turn nudge](#the-per-turn-nudge).

The token argument is settled, so the section has to earn its place a different way.
`slop` is gated. If the rules do not move that number, they have the same defence the
word list had, which is none.

### The gates that fought it are gone

`Adding soul` asks for varied rhythm and deliberate mess. Five gates asked for the
opposite, so five gates were removed:

| Removed gate | The rule it fought |
| --- | --- |
| longest sentence `<= 20` | "Vary rhythm. Then longer ones that take their time." |
| avg sentence length `<= 20` | the same rule, across the set |
| longest paragraph `<= 6` | "Let some mess in." |
| numbers per 100 words | "significantly improves becomes the measured delta" |
| reading grade floor `>= 6` | every rule that swaps a long word for a plain one |

All five are still measured and still printed. Nothing fails a run for hitting one.
What is left gates meaning instead of form: zero bare terms, a non-expert can act on
it, and the facts needed to act survive. See
[what stopped being a gate](./benchmark.md#what-stopped-being-a-gate).

The grade floor is the one to watch. It was added because a session scored a median
grade of 2.50 while leaving 40 terms undefined. Three gates now catch that same failure
from the meaning side, and none of them existed when the floor was written. If a run
scores low and still passes them, the floor was measuring the wrong thing.

### The rank had to move too

Removing a gate stops the benchmark failing a long sentence. It does not tell the model
to write one. `Style` said 20 words and outranked `Cut the slop`, so "vary rhythm" would
have lost every time and the section would have shipped without changing a word of the
output.

So the rank moved. `Cut the slop` now beats `Style`, and `Style` is the default rather
than the ceiling.

### How it is measured

`slopPhrases` in `src/evals/metrics.ts` counts the countable rules: the vocabulary in
rules 1, 4, 7, 8, 20, 23, 25, 26, and 31, plus the "not just X, but Y" shape. The rules
that need judgement stay with the judge agent.

The gate is a comparison against the plain baseline, not a flat zero. The list has known
false positives, `realm` and `landscape` have literal uses, and both arms get the same
ruler, so a shared false-positive rate cancels out. That is the same reasoning already
used for tense violations and synonym drift. Retune to a flat ceiling after the first
full run.

Five ambiguous metaphor nouns unslop lists are left out of the counter on purpose:
`surface`, `vector`, `primitive`, `harness`, and `wedge`. Each has a common literal
sense. They stay in `SKILL.md`, because the model can tell the senses apart and a regex
cannot.

## Sources

- https://github.com/cursor/plugins/blob/main/pstack/skills/unslop/SKILL.md
- https://www.asd-ste100.org/
- https://en.wikipedia.org/wiki/Simplified_Technical_English
- https://www.techscribe.co.uk/techw/asd-simplified-technical-english.htm

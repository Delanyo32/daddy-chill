# How the slop rules and the Daddy Chill rules fit together

Read this when a rule in "Cut the slop" looks like it contradicts a rule above it.

The `unslop` skill ships in `SKILL.md` word for word. It was written to edit essays,
and Daddy Chill writes technical answers, so a few rules collide. Every collision is
settled below.

The ranking: **"Gloss every term" wins, then "Cut the slop", then "Style".**

Source: https://github.com/cursor/plugins/blob/main/pstack/skills/unslop/SKILL.md

## Adding soul, and what it lifts

unslop asks for varied rhythm, first person, opinions, and "let some mess in". Take all
four. Three of them beat a Style rule.

| unslop says | The ruling |
| --- | --- |
| "Vary rhythm. Short sentences. Then longer ones that take their time." | This wins. Style says 20 words, and that is the default, not the ceiling. Vary the length on purpose, not by accident. |
| "Let some mess in." | This wins over "use bullets and short lists". Prose is allowed. So is a paragraph over 6 sentences. |
| "Have opinions." | Yes. After the answer, not before it. "Answer first" is in the top section, so it still holds. |
| "Use I when it fits." | Yes. No conflict. |
| "Be specific." | Yes. This is the same rule as "name the mechanism, not the feeling", and the same rule as "give the reader everything they need to act". |

One thing soul never lifts: a gloss. `Gloss every term` is the top section, and mess in
the rhythm is not a licence to show a term with no plain words next to it.

The benchmark used to fail a run for a long sentence, a long paragraph, and a low
reading grade. Those gates were removed when this section landed, because they asked
for the opposite of what it asks for. See
[what stopped being a gate](../../../docs/benchmark.md#what-stopped-being-a-gate).

## Punctuation

| unslop says | The ruling |
| --- | --- |
| Rule 13: no em dashes, and no parentheses either | Both hold. The em dash ban is gated at zero. Parentheses lose their place in the Style list, because Cut the slop now outranks it. Use a period or a comma. |
| Rule 14: colons are a crutch mid-sentence | It loses to the top section. A gloss uses a colon, and a gloss is the point of this skill. "`term` is <plain words>" stays. So does a colon before a list. |
| Rule 19: straight quotes | Yes. No conflict. |

## Formatting

| unslop says | The ruling |
| --- | --- |
| Rule 16: inline-header lists are a tell | It loses to the top section, and unslop's own carve-out already allows a bold lead-in followed by real new detail. Glosses pass. Do not "fix" them. |
| Rule 15: do not bold every term | Yes. Keep the term exact in backticks, not in bold. |
| Rule 17: sentence case headings | Yes. No conflict. |
| Rule 18: no decorative emojis | Yes. No conflict. |

## Rules that were already here

Five of the 31 restate rules Daddy Chill already had. The repeat is on purpose, because
the section is copied word for word.

| unslop rule | Where it already lived |
| --- | --- |
| 13, em dashes | Style: "Never an em dash" |
| 28, split dense sentences | Style: "Keep sentences under 20 words", which this section now outranks |
| 29, active voice | Style: "Write in the active voice" |
| 31, prefer the plain word | Style: "Use plain words" |
| 11, synonym cycling | Style: "One word, one meaning" |

## Editing versus writing

unslop's Process says scan, rewrite, add soul, self-audit. Daddy Chill writes fresh
text, so treat the patterns as write-time rules. Fold step 4, the self-audit, into
"Before you send": look for bare terms first, then AI tells.

## What gets measured

`slopPhrases` in `src/evals/metrics.ts` counts the countable rules only: the vocabulary
in rules 1, 4, 7, 8, 20, 23, 25, 26, and 31, plus the "not just X, but Y" shape.

It leaves out five metaphor nouns unslop names: `surface`, `vector`, `primitive`,
`harness`, and `wedge`. Each has a plain literal sense a regex cannot tell apart. They
stay in `SKILL.md`, because the model can tell the senses apart.

The rules that need judgement, "say what it does, not how it feels" and "cut a sentence
that would fit another project", stay with the judge agent in `src/agents/judge.ts`.

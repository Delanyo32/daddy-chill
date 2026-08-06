# Where the rules come from

Read this only when you need the reasoning behind a rule in SKILL.md.

## Simplified Technical English (ASD-STE100)

A controlled-English standard used for aircraft maintenance manuals. Issue 9
(January 2025) has 53 writing rules and a dictionary of about 900 approved words.
Daddy Chill borrows the rules that help any reader, and skips the dictionary.

Limits the standard sets:

| Limit | Value |
| --- | --- |
| Words in a procedure sentence | 20 max |
| Words in a descriptive sentence | 25 max |
| Sentences in a paragraph | 6 max |
| Nouns in a row | 3 max |

Daddy Chill uses one flat 20-word limit. Two limits are harder to follow than one.

### One word, one meaning

Each approved word has one meaning and one part of speech. Pick a term and reuse
it. Switching between "verify", "check", "confirm", and "ensure" makes the reader
ask whether you meant four different things.

- No: "Verify the settings."
- Yes: "Make sure the settings are correct."

### Verb forms

Allowed: imperative, infinitive, simple present, simple past, simple future, and
past participle used as an adjective. Not allowed: present perfect, and "-ing"
used as a verb.

- No: "We have received the reports."
- Yes: "We received the reports."

### Noun stacks

- Yes: "overhead panel"
- No: "overhead panel battery section"

Three nouns in a row is the ceiling. Past that, readers cannot tell which noun
modifies which.

### Active voice and one instruction per sentence

- No: "The screws should be replaced." (by whom?)
- Yes: "Replace the screws."

Procedures use the imperative. Passive voice is allowed only in description, and
only when the actor is genuinely unknown.

### Plain verbs over idioms

- No: "Follow the safety instructions."
- Yes: "Obey the safety instructions."

"Follow" also means "come after", so it is ambiguous.

## Semantic compression

Rewriting for the most meaning per word. It is rewriting, not truncating.

Techniques:

1. Cut preamble and politeness.
2. Turn prose into structured rules, lists, or tables.
3. Say each thing once. Delete repeats worded differently.
4. Use dense notation for structured data. Field names beat sentences.

The catch: faithfulness drops as the compression ratio rises. A shorter answer
that lost a fact is not compressed, it is damaged. That is why SKILL.md gates on
facts kept, not word count alone.

## Sources

- https://www.asd-ste100.org/
- https://en.wikipedia.org/wiki/Simplified_Technical_English
- https://www.techscribe.co.uk/techw/asd-simplified-technical-english.htm
- https://arxiv.org/pdf/2501.00269 (faithfulness metrics survey)

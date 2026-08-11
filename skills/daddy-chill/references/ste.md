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

## Terms you cannot swap

STE swaps a hard word for an easy one. Some words have no easy version. A command
name, a config key, and an error string are the text itself. Change them and the
reader runs the wrong thing.

The rule for those: keep the term exact, then explain it in plain words next to it.

- No: "Set the revision history limit." (there is no such setting by that name)
- Yes: "Set `revisionHistoryLimit`. It is the number of old versions Kubernetes keeps."

Dropping the term is not simplifying. The reader cannot act without it.

## Sources

- https://www.asd-ste100.org/
- https://en.wikipedia.org/wiki/Simplified_Technical_English
- https://www.techscribe.co.uk/techw/asd-simplified-technical-english.htm

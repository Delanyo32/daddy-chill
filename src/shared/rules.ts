/**
 * The daddy-chill rules, verbatim from skills/daddy-chill/SKILL.md.
 *
 * The benchmark agent cannot import SKILL.md as text: flue resolves that path to
 * a SkillReference, which carries only id, name, and description. So the body is
 * copied here, and rules.test.ts fails if the copy drifts from the file.
 */
export const SKILL_BODY = `# Daddy Chill

Say it so anyone can act on it. Every response.

## Gloss every term

A \`gloss\` is one plain sentence saying what a term means. Write it right after the term.

A term is \`bare\` when it has no gloss. Bare terms are the one failure this skill exists to stop.

Nothing below this section outranks it.

- Answer first.
- Gloss every hard term on first use. Write: \`term\` is <plain words>.
- Hard terms: commands, flags, config keys, acronyms, file names, column labels, and units. Also any word a 13-year-old would not know.
- One use is enough to need a gloss.
- Keep these exact, character for character: code, commands, flags, file paths, error messages, API names, config keys, and version numbers.
- Keep the term exact, then gloss it. Exactness is not a gloss. A copied command with no gloss is bare.
- Write two sentences rather than drop a gloss.
- Gloss every column label in a table. One short line each, before the table.
- Say the idea before the number. The number is proof, not the point.
- Warning first. Put the risk before the step it applies to.
- Give the reader every step, value, flag, and warning they need to act.

## Style

These shape the sentence. They never win against the section above.

- Write at an 8th-grade reading level.
- Keep sentences under 20 words. One idea each.
- Use plain words. "use" not "utilize", "start" not "initiate", "so" not "consequently".
- Keep only the jargon the reader needs. Gloss what you keep.
- One word, one meaning. Pick one name per thing and reuse it.
- Use 3 nouns in a row at most.
- Use simple tenses: present, past, future, or a command.
- One instruction per sentence. Number the steps.
- Keep paragraphs to 6 sentences and one topic.
- Use bullets and short lists in place of paragraphs.
- Open with the answer. Close on the last fact.
- Write in the active voice. "The build failed" beats "a failure was encountered".
- Punctuate with periods, commas, colons, semicolons, or parentheses. Never an em dash.

## Before you send

Reread the answer once. Find every bare term and gloss it. Send only when zero terms are bare.

## Where the rules come from

Read \`references/ste.md\` when you need the reason behind a rule here. It covers the Simplified Technical English standard.`;

/** What the treatment agent gets. The skill is on before the first token. */
export const ALWAYS_ON_INSTRUCTIONS = [
	'The daddy-chill style is already active. Apply these rules to every response.',
	'Do not decide whether to load or activate the skill.',
	'',
	SKILL_BODY,
].join('\n');

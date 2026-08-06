#!/usr/bin/env node
// Every plugin manifest carries its own copy of the version, and `npm version`
// only bumps package.json. This runs from the npm `version` lifecycle, after the
// bump and before the commit, so the four copies ship in the same commit.
import fs from 'node:fs';

const TARGETS = [
	'gemini-extension.json',
	'.claude-plugin/plugin.json',
	'.codex-plugin/plugin.json',
	'.github/plugin/plugin.json',
];

const { version } = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Match, do not compare before and after: re-running at the same version is a
// valid no-op, and treating that as a missing field would fail every second run.
const VERSION_FIELD = /("version":\s*)"[^"]*"/;

for (const file of TARGETS) {
	const raw = fs.readFileSync(file, 'utf8');
	if (!VERSION_FIELD.test(raw)) throw new Error(`no version field to update in ${file}`);
	// Text edit, not parse-and-write: keeps each file's own formatting and key order.
	fs.writeFileSync(file, raw.replace(VERSION_FIELD, `$1"${version}"`));
	console.log(`${file} -> ${version}`);
}

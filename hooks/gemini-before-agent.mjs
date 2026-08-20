#!/usr/bin/env node
import fs from 'node:fs';
import { formatCommandResult, handleCommand, getDisabledInstructions, getInstructions, getTurnReminder } from '../runtime/command.mjs';
import { resolveSessionMode } from '../runtime/mode.mjs';

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}

const sessionId = process.env.GEMINI_SESSION_ID || input.session_id || 'process';
const result = handleCommand(input.prompt, 'gemini', sessionId);
const mode = resolveSessionMode('gemini', sessionId);

let context = '';
if (result) {
  context = result.type === 'set-mode'
    ? (result.mode === 'on' ? getInstructions('on') : getDisabledInstructions())
    : formatCommandResult(result);
} else if (mode === 'on') {
  // Ordinary message: nudge, do not re-send the rules. See getTurnReminder.
  context = getTurnReminder(mode);
}

if (context) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'BeforeAgent',
      additionalContext: context,
    },
  }));
}

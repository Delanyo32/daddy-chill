#!/usr/bin/env node
import fs from 'node:fs';
import { formatCommandResult, handleCommand, getDisabledInstructions, getInstructions, getTurnReminder } from '../runtime/command.mjs';
import { resolveSessionMode } from '../runtime/mode.mjs';

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
const sessionId = process.env.COPILOT_SESSION_ID || input.session_id || 'process';
const result = handleCommand(input.prompt, 'copilot', sessionId);

let context = '';
if (result) {
  context = result.type === 'set-mode'
    ? (result.mode === 'on' ? getInstructions('on') : getDisabledInstructions())
    : formatCommandResult(result);
} else if (resolveSessionMode('copilot', sessionId) === 'on') {
  // Ordinary message, rules on: nudge, do not re-send. See getTurnReminder.
  context = getTurnReminder('on');
}

process.stdout.write(context ? JSON.stringify({ additionalContext: context }) : '{}');

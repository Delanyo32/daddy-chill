#!/usr/bin/env node
import fs from 'node:fs';
import { formatCommandResult, handleCommand, getDisabledInstructions, getInstructions } from '../runtime/command.mjs';
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
  // Ordinary message, rules on: re-send them so the style survives long sessions.
  context = getInstructions('on');
}

process.stdout.write(context ? JSON.stringify({ additionalContext: context }) : '{}');

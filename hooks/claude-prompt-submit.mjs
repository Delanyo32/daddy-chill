#!/usr/bin/env node
import fs from 'node:fs';
import { formatCommandResult, handleCommand, getDisabledInstructions, getInstructions, getTurnReminder } from '../runtime/command.mjs';
import { resolveSessionMode } from '../runtime/mode.mjs';
import { writeHookOutput } from '../runtime/hook-output.mjs';

/**
 * Nudge on every turn, do not re-send the rules.
 *
 * SessionStart injects the rules once. Ten tool calls later they are tens of
 * thousands of tokens back in the transcript and the style drifts. Re-sending the
 * whole skill fixed the drift and paid its full length every message, which is now
 * over 1,500 words. `getTurnReminder` is the pointer instead: it names the rules and
 * the checks, and the copy is already in the transcript to re-read.
 */
function main() {
  let input = {};
  try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}

  const sessionId = input.session_id || 'process';
  const result = handleCommand(input.prompt, 'claude', sessionId);

  if (result) {
    const context = result.type === 'set-mode'
      ? (result.mode === 'on' ? getInstructions('on') : getDisabledInstructions())
      : formatCommandResult(result);
    writeHookOutput('UserPromptSubmit', context, true);
    return;
  }

  // An ordinary message. `off` stays off: the user turned the rules down and
  // nudging here would undo the command they just ran.
  if (resolveSessionMode('claude', sessionId) !== 'on') return;
  writeHookOutput('UserPromptSubmit', getTurnReminder('on'));
}

try { main(); } catch (error) {
  process.stderr.write(`Daddy Chill hook failed: ${error.message}\n`);
}

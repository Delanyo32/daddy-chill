#!/usr/bin/env node
import fs from 'node:fs';
import { formatCommandResult, handleCommand, getDisabledInstructions, getInstructions } from '../runtime/command.mjs';
import { resolveSessionMode } from '../runtime/mode.mjs';
import { writeHookOutput } from '../runtime/hook-output.mjs';

/**
 * Re-send the rules on every turn, not just on a `/daddy-chill` command.
 *
 * SessionStart injects them once. Ten tool calls later they are tens of
 * thousands of tokens back in the transcript and the style drifts. Gemini
 * already re-injects per turn in gemini-before-agent.mjs; this is that branch.
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
  // re-sending them here would undo the command they just ran.
  if (resolveSessionMode('claude', sessionId) !== 'on') return;
  writeHookOutput('UserPromptSubmit', getInstructions('on'));
}

try { main(); } catch (error) {
  process.stderr.write(`Daddy Chill hook failed: ${error.message}\n`);
}

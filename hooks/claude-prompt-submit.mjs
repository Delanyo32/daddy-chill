#!/usr/bin/env node
import fs from 'node:fs';
import { formatCommandResult, handleCommand, getDisabledInstructions, getInstructions } from '../runtime/command.mjs';
import { writeHookOutput } from '../runtime/hook-output.mjs';

function main() {
  let input = {};
  try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}

  const result = handleCommand(input.prompt, 'claude', input.session_id || 'process');
  if (!result) return;

  const context = result.type === 'set-mode'
    ? (result.mode === 'on' ? getInstructions('on') : getDisabledInstructions())
    : formatCommandResult(result);

  writeHookOutput('UserPromptSubmit', context);
}

try { main(); } catch (error) {
  process.stderr.write(`Daddy Chill hook failed: ${error.message}\n`);
}

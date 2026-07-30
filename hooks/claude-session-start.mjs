#!/usr/bin/env node
import fs from 'node:fs';
import { getInstructions } from '../runtime/instructions.mjs';
import { getDefaultMode, resolveSessionMode, writeSessionMode } from '../runtime/mode.mjs';
import { writeHookOutput } from '../runtime/hook-output.mjs';

function main() {
  let input = {};
  try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}

  const sessionId = input.session_id || 'process';
  const mode = resolveSessionMode('claude', sessionId, getDefaultMode());
  if (!mode) return;
  writeSessionMode('claude', sessionId, mode);

  const context = getInstructions(mode);
  if (!context) return;
  writeHookOutput('SessionStart', context);
}

try { main(); } catch (error) {
  process.stderr.write(`Daddy Chill hook failed: ${error.message}\n`);
}

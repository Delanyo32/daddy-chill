#!/usr/bin/env node
import fs from 'node:fs';
import { getInstructions } from '../runtime/instructions.mjs';
import { resolveSessionMode } from '../runtime/mode.mjs';
import { writeHookOutput } from '../runtime/hook-output.mjs';

function main() {
  let input = {};
  try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}

  const mode = resolveSessionMode('claude', input.session_id || 'process');
  const context = getInstructions(mode);
  if (!context) return;

  writeHookOutput('SubagentStart', context);
}

try { main(); } catch (error) {
  process.stderr.write(`Daddy Chill hook failed: ${error.message}\n`);
}

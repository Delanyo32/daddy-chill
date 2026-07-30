#!/usr/bin/env node
import fs from 'node:fs';
import { getInstructions } from '../runtime/instructions.mjs';
import { getDefaultMode, resolveSessionMode, writeSessionMode } from '../runtime/mode.mjs';

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}

const sessionId = process.env.GEMINI_SESSION_ID || input.session_id || 'process';
const mode = resolveSessionMode('gemini', sessionId, getDefaultMode());
writeSessionMode('gemini', sessionId, mode);

if (mode === 'on') {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: getInstructions(mode),
    },
  }));
}

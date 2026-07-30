#!/usr/bin/env node
import fs from 'node:fs';
import { formatCommandResult, handleCommand, getDisabledInstructions, getInstructions } from '../runtime/command.mjs';

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
const sessionId = process.env.COPILOT_SESSION_ID || input.session_id || 'process';
const result = handleCommand(input.prompt, 'copilot', sessionId);
if (!result) process.stdout.write('{}');
else process.stdout.write(JSON.stringify({ additionalContext: result.type === 'set-mode' ? (result.mode === 'on' ? getInstructions('on') : getDisabledInstructions()) : formatCommandResult(result) }));

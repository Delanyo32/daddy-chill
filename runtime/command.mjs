import {
  getDefaultMode,
  parseCommand,
  resolveSessionMode,
  writeDefaultMode,
  writeSessionMode,
} from './mode.mjs';
import { getDisabledInstructions, getInstructions, getStatus } from './instructions.mjs';

export function handleCommand(text, host, sessionId) {
  const command = parseCommand(text);
  if (!command) return null;

  if (command.type === 'status') {
    return {
      ...command,
      mode: resolveSessionMode(host, sessionId),
      defaultMode: getDefaultMode(),
    };
  }

  const mode = writeSessionMode(host, sessionId, command.mode);
  return { ...command, mode, defaultMode: getDefaultMode() };
}

export function formatCommandResult(result) {
  if (result.type === 'status') {
    return `${getStatus(result.mode)}. Default: ${result.defaultMode}.`;
  }
  return `${getStatus(result.mode)}.`;
}

export function setDefaultMode(mode) {
  return writeDefaultMode(mode);
}

export { getDisabledInstructions, getInstructions };

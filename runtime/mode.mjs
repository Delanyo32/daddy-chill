import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const DEFAULT_MODE = 'on';
export const MODES = ['on', 'off'];

export function normalizeMode(value) {
  if (typeof value !== 'string') return null;
  const mode = value.trim().toLowerCase();
  return MODES.includes(mode) ? mode : null;
}

export function getConfigDir() {
  if (process.env.DADDY_CHILL_CONFIG_DIR) return process.env.DADDY_CHILL_CONFIG_DIR;
  if (process.env.XDG_CONFIG_HOME) return path.join(process.env.XDG_CONFIG_HOME, 'daddy-chill');
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'daddy-chill');
  }
  return path.join(os.homedir(), '.config', 'daddy-chill');
}

export function getConfigPath() {
  return path.join(getConfigDir(), 'config.json');
}

export function getDefaultMode() {
  const envMode = normalizeMode(process.env.DADDY_CHILL_DEFAULT);
  if (envMode) return envMode;

  try {
    const config = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8').replace(/^\uFEFF/, ''));
    const configured = normalizeMode(config.default ?? config.defaultMode);
    if (configured) return configured;
  } catch {
    // Missing or invalid config falls back to the safe default.
  }

  return DEFAULT_MODE;
}

export function writeDefaultMode(mode) {
  const normalized = normalizeMode(mode);
  if (!normalized) throw new Error(`Invalid Daddy Chill mode: ${mode}`);
  const configPath = getConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify({ default: normalized }, null, 2)}\n`);
  return normalized;
}

function sessionKey(host, sessionId) {
  const value = `${host}:${sessionId || 'process'}`;
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);
}

export function getSessionStatePath(host, sessionId) {
  return path.join(getConfigDir(), 'sessions', `${sessionKey(host, sessionId)}.mode`);
}

export function readSessionMode(host, sessionId, fallback = null) {
  try {
    return normalizeMode(fs.readFileSync(getSessionStatePath(host, sessionId), 'utf8')) ?? fallback;
  } catch {
    return fallback;
  }
}

export function hasSessionMode(host, sessionId) {
  return fs.existsSync(getSessionStatePath(host, sessionId));
}

export function writeSessionMode(host, sessionId, mode) {
  const normalized = normalizeMode(mode);
  if (!normalized) throw new Error(`Invalid Daddy Chill mode: ${mode}`);
  const statePath = getSessionStatePath(host, sessionId);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const temporaryPath = `${statePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${normalized}\n`);
  fs.renameSync(temporaryPath, statePath);
  return normalized;
}

export function resolveSessionMode(host, sessionId, fallback = getDefaultMode()) {
  return readSessionMode(host, sessionId, fallback) ?? fallback;
}

export function parseModeArgument(value, fallback = getDefaultMode()) {
  const mode = normalizeMode(value);
  return mode ?? fallback;
}

export function parseCommand(text) {
  const input = String(text ?? '').trim();
  const match = input.match(/^\/(?:daddy-chill(?::daddy-chill)?)(?:\s+(on|off|status))?\s*$/i);
  if (!match) return null;
  const argument = match[1]?.toLowerCase() ?? 'status';
  return argument === 'status'
    ? { type: 'status' }
    : { type: 'set-mode', mode: argument };
}

export function getHostFromEnvironment(defaultHost = 'claude') {
  if (process.env.COPILOT_PLUGIN_DATA) return 'copilot';
  if (process.env.PLUGIN_DATA) return 'codex';
  return defaultHost;
}

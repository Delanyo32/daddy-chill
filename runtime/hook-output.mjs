/**
 * Write a hook result.
 *
 * `announce` is true only when the user typed a `/daddy-chill` command and is
 * waiting for a reply. The Codex host turns that into a visible systemMessage,
 * so the silent per-turn re-injection must leave it false or every message
 * prints a status line.
 */
export function writeHookOutput(event, context = '', announce = false) {
  if (process.env.COPILOT_PLUGIN_DATA) {
    process.stdout.write(JSON.stringify(
      event === 'SessionStart' && context ? { additionalContext: context } : {},
    ));
    return;
  }

  if (process.env.PLUGIN_DATA) {
    const output = announce ? { systemMessage: `DADDY_CHILL:${context ? 'ON' : 'OFF'}` } : {};
    if (context) {
      output.hookSpecificOutput = {
        hookEventName: event,
        additionalContext: context,
      };
    }
    process.stdout.write(JSON.stringify(output));
    return;
  }

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: event,
      ...(context ? { additionalContext: context } : {}),
    },
  }));
}

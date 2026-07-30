export function writeHookOutput(event, context = '') {
  if (process.env.COPILOT_PLUGIN_DATA) {
    process.stdout.write(JSON.stringify(
      event === 'SessionStart' && context ? { additionalContext: context } : {},
    ));
    return;
  }

  if (process.env.PLUGIN_DATA) {
    const output = { systemMessage: `DADDY_CHILL:${context ? 'ON' : 'OFF'}` };
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

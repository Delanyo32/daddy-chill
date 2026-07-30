import { getDefaultMode, parseCommand, resolveSessionMode, writeSessionMode } from '../runtime/mode.mjs';
import { getInstructions } from '../runtime/instructions.mjs';

export default function daddyChillExtension(pi) {
  let currentMode = getDefaultMode();
  let sessionId = 'process';

  const updateStatus = (ctx) => {
    ctx?.ui?.setStatus?.('daddy-chill', currentMode === 'on' ? '● Daddy Chill ON' : '○ Daddy Chill OFF');
  };

  pi.registerCommand('daddy-chill', {
    description: 'Turn Daddy Chill on, turn it off, or show its status',
    handler: async (args, ctx) => {
      const command = parseCommand(`/daddy-chill ${args || 'status'}`);
      if (!command) {
        ctx?.ui?.notify?.('Use /daddy-chill on, off, or status.', 'warning');
        return;
      }
      if (command.type === 'status') {
        ctx?.ui?.notify?.(`Daddy Chill: ${currentMode}. Default: ${getDefaultMode()}.`, 'info');
        return;
      }
      currentMode = writeSessionMode('pi', sessionId, command.mode);
      updateStatus(ctx);
      ctx?.ui?.notify?.(`Daddy Chill: ${currentMode}.`, 'info');
    },
  });

  pi.on('session_start', async (_event, ctx) => {
    sessionId = ctx?.sessionManager?.getSessionId?.() || ctx?.sessionManager?.getSessionFile?.() || 'process';
    currentMode = resolveSessionMode('pi', sessionId, getDefaultMode());
    updateStatus(ctx);
  });

  pi.on('before_agent_start', async (event) => {
    if (currentMode !== 'on') return;
    return { systemPrompt: `${event.systemPrompt}\n\n${getInstructions(currentMode)}` };
  });
}

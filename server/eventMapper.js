const ACTIVE_EVENTS = new Set(['UserPromptSubmit', 'PreToolUse', 'PostToolUse']);
const ERROR_EVENTS = new Set(['PostToolUseFailure', 'StopFailure']);
const IDLE_EVENTS = new Set(['SessionStart', 'Stop']);

// Returns 'idle' | 'active' | 'error', or null for events we don't react to
// (in which case the caller should leave the current state unchanged).
function mapEventToState(hookEventName) {
  if (ERROR_EVENTS.has(hookEventName)) return 'error';
  if (ACTIVE_EVENTS.has(hookEventName)) return 'active';
  if (IDLE_EVENTS.has(hookEventName)) return 'idle';
  return null;
}

module.exports = { mapEventToState };

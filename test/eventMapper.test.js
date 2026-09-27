const test = require('node:test');
const assert = require('node:assert');
const { mapEventToState } = require('../server/eventMapper');

test('maps user/tool activity to active', () => {
  assert.strictEqual(mapEventToState('UserPromptSubmit'), 'active');
  assert.strictEqual(mapEventToState('PreToolUse'), 'active');
  assert.strictEqual(mapEventToState('PostToolUse'), 'active');
});

test('maps failures to error', () => {
  assert.strictEqual(mapEventToState('PostToolUseFailure'), 'error');
  assert.strictEqual(mapEventToState('StopFailure'), 'error');
});

test('maps session boundaries to idle', () => {
  assert.strictEqual(mapEventToState('SessionStart'), 'idle');
  assert.strictEqual(mapEventToState('Stop'), 'idle');
});

test('returns null for unrecognized events so state is left unchanged', () => {
  assert.strictEqual(mapEventToState('SomeUnknownEvent'), null);
});

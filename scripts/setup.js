const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 4317;
const HOOK_URL = `http://localhost:${PORT}/hooks/event`;
const SETTINGS_PATH = path.join(process.cwd(), '.claude', 'settings.json');

const EVENTS = [
  { name: 'SessionStart' },
  { name: 'UserPromptSubmit' },
  { name: 'PreToolUse', matcher: '*' },
  { name: 'PostToolUse', matcher: '*' },
  { name: 'PostToolUseFailure', matcher: '*' },
  { name: 'Stop' },
];

function loadSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  } catch (err) {
    console.error(`Could not parse ${SETTINGS_PATH}: ${err.message}`);
    process.exit(1);
  }
}

function saveSettings(settings) {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');
}

function alreadyHasOurHook(groups) {
  return (groups || []).some((group) =>
    (group.hooks || []).some((h) => h.type === 'http' && h.url === HOOK_URL)
  );
}

function addHookGroup(settings, eventName, matcher) {
  settings.hooks = settings.hooks || {};
  settings.hooks[eventName] = settings.hooks[eventName] || [];
  if (alreadyHasOurHook(settings.hooks[eventName])) return false;
  const group = { hooks: [{ type: 'http', url: HOOK_URL, timeout: 2 }] };
  if (matcher) group.matcher = matcher;
  settings.hooks[eventName].push(group);
  return true;
}

const settings = loadSettings();
let added = 0;
for (const { name, matcher } of EVENTS) {
  if (addHookGroup(settings, name, matcher)) added += 1;
}
saveSettings(settings);

console.log(
  added > 0
    ? `Added ${added} hook(s) to ${SETTINGS_PATH} pointing at ${HOOK_URL}`
    : `Hooks already present in ${SETTINGS_PATH} — nothing to do.`
);

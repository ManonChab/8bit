const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 4317;
const HOOK_URL = `http://localhost:${PORT}/hooks/event`;
const SETTINGS_PATH = path.join(process.cwd(), '.claude', 'settings.json');

if (!fs.existsSync(SETTINGS_PATH)) {
  console.log('No .claude/settings.json found — nothing to remove.');
  process.exit(0);
}

const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
let removedGroups = 0;

if (settings.hooks) {
  for (const eventName of Object.keys(settings.hooks)) {
    const before = settings.hooks[eventName].length;
    settings.hooks[eventName] = settings.hooks[eventName]
      .map((group) => ({
        ...group,
        hooks: (group.hooks || []).filter((h) => !(h.type === 'http' && h.url === HOOK_URL)),
      }))
      .filter((group) => group.hooks.length > 0);
    removedGroups += before - settings.hooks[eventName].length;
    if (settings.hooks[eventName].length === 0) delete settings.hooks[eventName];
  }
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
}

fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');

console.log(
  removedGroups > 0
    ? `Removed ${removedGroups} hook group(s) pointing at ${HOOK_URL} from ${SETTINGS_PATH}`
    : `No hooks pointing at ${HOOK_URL} were found.`
);

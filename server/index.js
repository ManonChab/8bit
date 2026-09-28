const path = require('path');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const { PORT } = require('./config');
const { mapEventToState } = require('./eventMapper');
const { readAvatarConfig, writeAvatarConfig } = require('./avatar-config');
const { listSkills, getSkill } = require('./skills');
const { launchDefaultBrowser, launchFloatingWindow } = require('./browserLauncher');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/art', express.static(path.join(__dirname, '..', 'art')));

let current = { sessionId: null, state: 'idle' };

app.post('/hooks/event', (req, res) => {
  // Respond immediately — Claude Code must never wait on us.
  res.status(200).end();
  try {
    const { session_id: sessionId, hook_event_name: hookEventName } = req.body || {};
    const state = mapEventToState(hookEventName);
    if (state && sessionId) {
      current = { sessionId, state };
      broadcast(current);
    }
  } catch {
    // A malformed event must never crash the server.
  }
});

app.get('/state', (req, res) => res.json(current));

// A style maps 1:1 to a background theme -- the portrait picker chooses
// both together.
const KNOWN_STYLES = ['developer', 'chef'];
const KNOWN_BACKGROUNDS = ['none', 'developer', 'chef'];

app.get('/avatar-config', (req, res) => {
  res.json(readAvatarConfig());
});

app.post('/avatar-config', (req, res) => {
  const { style, background } = req.body || {};
  const next = { ...readAvatarConfig() };

  if (style !== undefined) {
    if (!KNOWN_STYLES.includes(style)) {
      return res.status(400).json({ error: `style must be one of: ${KNOWN_STYLES.join(', ')}` });
    }
    next.style = style;
  }

  if (background !== undefined) {
    if (!KNOWN_BACKGROUNDS.includes(background)) {
      return res.status(400).json({ error: `background must be one of: ${KNOWN_BACKGROUNDS.join(', ')}` });
    }
    next.background = background;
  }

  writeAvatarConfig(next);
  res.json(next);
});

app.get('/skills', (req, res) => {
  res.json(listSkills());
});

app.get('/skills/:name', (req, res) => {
  const skill = getSkill(req.params.name);
  if (!skill) return res.status(404).json({ error: `No skill named "${req.params.name}"` });
  res.json(skill);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(payload) {
  const data = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) client.send(data);
  });
}

wss.on('connection', (socket) => {
  socket.send(JSON.stringify(current));
});

function handleServerError(err) {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Set the PORT env var to use a different one.`);
    process.exit(1);
  }
  throw err;
}

// The 'ws' library attaches to the underlying net.Server and re-emits listen
// failures on the WebSocketServer instance rather than the http.Server, so
// both need a listener to catch EADDRINUSE reliably.
server.on('error', handleServerError);
wss.on('error', handleServerError);

// --floating opens the companion as a chromeless app window you can park
// anywhere on screen, instead of a normal browser tab. The choice is
// remembered in avatar-config.json so a plain `npm start` repeats it next
// time; pass --browser to switch back.
function resolveWindowMode() {
  const args = process.argv.slice(2);
  const explicit = args.includes('--floating') ? 'floating' : args.includes('--browser') ? 'browser' : null;
  const stored = readAvatarConfig();
  if (explicit && explicit !== stored.windowMode) {
    writeAvatarConfig({ ...stored, windowMode: explicit });
  }
  return explicit || stored.windowMode || 'browser';
}

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Live Session running at ${url}`);
  const windowMode = resolveWindowMode();
  if (windowMode === 'floating') {
    console.log('Opening as a floating window. Drag it wherever you like; run with --browser to switch back to a normal tab.');
    launchFloatingWindow(url);
  } else {
    launchDefaultBrowser(url);
  }
});

const path = require('path');
const http = require('http');
const { exec } = require('child_process');
const express = require('express');
const { WebSocketServer } = require('ws');
const { PORT } = require('./config');
const { mapEventToState } = require('./eventMapper');
const { readAvatarConfig, writeAvatarConfig } = require('./avatar-config');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

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

app.get('/avatar-config', (req, res) => {
  res.json(readAvatarConfig());
});

app.post('/avatar-config', (req, res) => {
  const { style } = req.body || {};
  if (style !== 'a' && style !== 'b') {
    return res.status(400).json({ error: 'style must be "a" or "b"' });
  }
  writeAvatarConfig({ style });
  res.json({ style });
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

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`8bit session avatar running at ${url}`);
  openBrowser(url);
});

function openBrowser(url) {
  const cmd =
    process.platform === 'win32' ? `start "" "${url}"` :
    process.platform === 'darwin' ? `open "${url}"` :
    `xdg-open "${url}"`;
  exec(cmd, () => {}); // best-effort; failing to auto-open is not fatal
}

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');

const FLOATING_WINDOW_WIDTH = 300;
const FLOATING_WINDOW_HEIGHT = 420;

// Chromium-family browsers support `--app=<url>`, which opens a window with
// no address bar or tabs -- the closest thing to a native floating widget
// we get without shipping a separate desktop runtime (see future-ideas.md's
// deferred "Electron packaging" idea, which is a bigger commitment aimed at
// distributing this to other people, not at this).
function findChromiumExecutable() {
  const candidates = [];
  if (process.platform === 'win32') {
    const roots = [process.env['ProgramFiles'], process.env['ProgramFiles(x86)'], process.env['LOCALAPPDATA']].filter(Boolean);
    for (const root of roots) {
      candidates.push(path.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'));
      candidates.push(path.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
    }
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    );
  } else {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/microsoft-edge'
    );
  }
  return candidates.find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  }) || null;
}

function launchDefaultBrowser(url) {
  const cmd =
    process.platform === 'win32' ? `start "" "${url}"` :
    process.platform === 'darwin' ? `open "${url}"` :
    `xdg-open "${url}"`;
  exec(cmd, () => {}); // best-effort; failing to auto-open is not fatal
}

function launchFloatingWindow(url) {
  const exe = findChromiumExecutable();
  if (!exe) {
    console.warn('Floating window mode needs Chrome or Edge installed -- opening a normal browser tab instead.');
    launchDefaultBrowser(url);
    return;
  }
  const args = [`--app=${url}`, `--window-size=${FLOATING_WINDOW_WIDTH},${FLOATING_WINDOW_HEIGHT}`];
  try {
    const child = spawn(exe, args, { detached: true, stdio: 'ignore' });
    child.unref();
  } catch {
    launchDefaultBrowser(url);
  }
}

module.exports = { findChromiumExecutable, launchDefaultBrowser, launchFloatingWindow };

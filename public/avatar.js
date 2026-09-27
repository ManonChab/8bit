// Placeholder 16-bit-style pixel avatar, drawn procedurally on a canvas grid
// (no external image assets / no image-generation tool available). Real art
// can replace this renderer later without touching the state machine below.

const PIXEL = 10;

const STYLES = {
  a: { hair: '#f4a53a', clothes: '#3a6df4', skin: '#f2c9a0' },
  b: { hair: '#3a54f4', clothes: '#c23a6d', skin: '#f2c9a0' },
};

// Coordinate lists on a 10 (wide) x 13 (tall) grid. Kept as named parts so
// pose variants (arms up/down, eye color) can be swapped independently.
const PARTS = {
  hair: [
    [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0],
    [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1],
  ],
  head: [
    [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2],
    [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3],
    [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4],
    [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5],
  ],
  eyes: [[3, 4], [6, 4]],
  body: [
    [3, 6], [4, 6], [5, 6], [6, 6],
    [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7],
    [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8],
  ],
  armsDown: [[1, 7], [1, 8], [8, 7], [8, 8]],
  armsUp: [[1, 5], [1, 6], [8, 5], [8, 6]],
  legs: [[3, 9], [4, 9], [5, 9], [6, 9], [3, 10], [4, 10], [5, 10], [6, 10]],
  boots: [[3, 11], [4, 11], [5, 11], [6, 11]],
};

// One subtle bob per frame = idle "breathing" loop (4 frames, per game-art
// guidance for idle animation).
const IDLE_BOB = [0, -1, 0, 1];
const ACTIVE_BOB = [0, -1, -1, 0];

function drawAvatar(ctx, { style, state, frame, originX = 0, originY = 0 }) {
  const palette = STYLES[style] || STYLES.a;
  const bobFrames = state === 'active' ? ACTIVE_BOB : IDLE_BOB;
  const bob = state === 'error' ? 0 : bobFrames[frame % bobFrames.length];
  const arms = state === 'active' ? PARTS.armsUp : PARTS.armsDown;
  const eyeColor = state === 'error' ? '#e05050' : '#20202a';

  ctx.imageSmoothingEnabled = false;

  const plot = (cells, color) => {
    ctx.fillStyle = color;
    for (const [x, y] of cells) {
      ctx.fillRect(originX + x * PIXEL, originY + (y + bob) * PIXEL, PIXEL, PIXEL);
    }
  };

  plot(PARTS.hair, palette.hair);
  plot(PARTS.head, palette.skin);
  plot(PARTS.body, palette.clothes);
  plot(arms, palette.clothes);
  plot(PARTS.legs, '#2a2a35');
  plot(PARTS.boots, '#181820');
  plot(PARTS.eyes, eyeColor);
}

function pulseBackground(ctx, canvas, state, t) {
  let color = '#1f2129';
  if (state === 'active') {
    const glow = 0.15 + 0.1 * Math.sin(t / 220);
    color = `rgba(244, 197, 66, ${glow.toFixed(2)})`;
  } else if (state === 'error') {
    const glow = 0.25 + 0.15 * Math.sin(t / 160);
    color = `rgba(224, 80, 80, ${glow.toFixed(2)})`;
  }
  ctx.fillStyle = '#1f2129';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (state !== 'idle') {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// ---- App wiring ------------------------------------------------------

const pickerEl = document.getElementById('picker');
const stage = document.getElementById('stage');
const labelEl = document.getElementById('label');
const stageCtx = stage.getContext('2d');

let currentStyle = null;
let currentState = 'idle';
let currentSessionId = null;

function drawPreview(canvasId, style) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1f2129';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawAvatar(ctx, { style, state: 'idle', frame: 0, originX: 10, originY: 5 });
}

async function loadAvatarConfig() {
  const res = await fetch('/avatar-config');
  return res.json();
}

async function saveAvatarStyle(style) {
  await fetch('/avatar-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ style }),
  });
}

function connectSocket() {
  const ws = new WebSocket(`ws://${location.host}`);
  ws.addEventListener('message', (event) => {
    const payload = JSON.parse(event.data);
    currentState = payload.state || 'idle';
    currentSessionId = payload.sessionId || null;
    updateLabel();
  });
}

function updateLabel() {
  labelEl.textContent = currentSessionId
    ? `session ${currentSessionId.slice(0, 8)} — ${currentState}`
    : `waiting for a Claude Code session — ${currentState}`;
}

function startRenderLoop() {
  let frame = 0;
  let lastFrameTime = 0;
  const FRAME_INTERVAL = 250; // ms per idle/active animation frame

  function tick(t) {
    if (document.hidden) {
      requestAnimationFrame(tick); // paused visually via early background skip below
      return;
    }
    if (t - lastFrameTime > FRAME_INTERVAL) {
      frame += 1;
      lastFrameTime = t;
    }
    pulseBackground(stageCtx, stage, currentState, t);
    drawAvatar(stageCtx, { style: currentStyle, state: currentState, frame, originX: 20, originY: 10 });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

async function init() {
  const config = await loadAvatarConfig();
  if (config.style === 'a' || config.style === 'b') {
    currentStyle = config.style;
    stage.hidden = false;
    connectSocket();
    startRenderLoop();
    updateLabel();
    return;
  }

  pickerEl.hidden = false;
  drawPreview('preview-a', 'a');
  drawPreview('preview-b', 'b');
  pickerEl.querySelectorAll('.choice').forEach((el) => {
    el.addEventListener('click', async () => {
      const style = el.dataset.style;
      await saveAvatarStyle(style);
      currentStyle = style;
      pickerEl.hidden = true;
      stage.hidden = false;
      connectSocket();
      startRenderLoop();
      updateLabel();
    });
  });
}

init();

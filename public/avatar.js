// Placeholder 16-bit-style pixel avatar (no external image assets / no
// image-generation tool available). Drawn at low native resolution with
// shaded primitives onto an offscreen canvas, then scaled up with
// imageSmoothingEnabled=false — the standard trick for a crisp pixel-art
// look without hand-placing every pixel. Real art can replace this
// renderer later without touching the state machine below.

const OFFSCREEN_W = 32;
const OFFSCREEN_H = 42;
const SCALE_STAGE = 4;
const SCALE_PREVIEW = 3;

const STYLES = {
  a: { hair: '#f4a53a', clothes: '#3a6df4', skin: '#f2c9a0' },
  b: { hair: '#3a54f4', clothes: '#c23a6d', skin: '#f2c9a0' },
};

const IDLE_BOB = [0, -1, 0, 1]; // subtle idle "breathing" loop
const ACTIVE_BOB = [0, -1, -1, 0];

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 0xff) + amount);
  const g = clamp(((n >> 8) & 0xff) + amount);
  const b = clamp((n & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h); // fallback for older browsers
  }
}

// Shadow fill (full shape, darker) -> base fill (slightly inset, true
// color) -> highlight patch (small, lighter, top-left) -> outline stroke.
// This 3-band shading is what actually reads as "16-bit" rather than
// "flat 8-bit block," more than resolution alone.
function drawShadedRoundRect(ctx, x, y, w, h, r, color) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = shade(color, -45);
  ctx.fill();

  roundRectPath(ctx, x, y, w * 0.82, h * 0.85, r);
  ctx.fillStyle = color;
  ctx.fill();

  roundRectPath(ctx, x + w * 0.12, y + h * 0.1, w * 0.32, h * 0.28, Math.max(r * 0.5, 0.5));
  ctx.fillStyle = shade(color, 55);
  ctx.fill();

  roundRectPath(ctx, x, y, w, h, r);
  ctx.strokeStyle = '#1a1a22';
  ctx.lineWidth = 0.6;
  ctx.stroke();
}

function drawShadedCircle(ctx, cx, cy, radius, color) {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = shade(color, -40);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx - radius * 0.05, cy, radius * 0.88, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx - radius * 0.35, cy - radius * 0.35, radius * 0.32, 0, Math.PI * 2);
  ctx.fillStyle = shade(color, 55);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#1a1a22';
  ctx.lineWidth = 0.6;
  ctx.stroke();
}

function drawCharacter(offCtx, { style, state, frame }) {
  const palette = STYLES[style] || STYLES.a;
  const bobFrames = state === 'active' ? ACTIVE_BOB : IDLE_BOB;
  const bob = state === 'error' ? 0 : bobFrames[frame % bobFrames.length];
  const eyeColor = state === 'error' ? '#e05050' : '#20202a';
  const armsUp = state === 'active';

  offCtx.clearRect(0, 0, OFFSCREEN_W, OFFSCREEN_H);
  offCtx.save();
  offCtx.translate(0, bob);

  // Boots
  drawShadedRoundRect(offCtx, 10.5, 37, 5, 4, 1, '#181820');
  drawShadedRoundRect(offCtx, 16.5, 37, 5, 4, 1, '#181820');
  // Legs
  drawShadedRoundRect(offCtx, 11.5, 29, 4, 9, 1, '#2a2a35');
  drawShadedRoundRect(offCtx, 17.5, 29, 4, 9, 1, '#2a2a35');
  // Arms (behind torso so the torso overlaps the shoulder joint cleanly)
  if (armsUp) {
    drawShadedRoundRect(offCtx, 4.5, 7, 4.5, 11, 2, palette.clothes);
    drawShadedRoundRect(offCtx, 23, 7, 4.5, 11, 2, palette.clothes);
  } else {
    drawShadedRoundRect(offCtx, 5.5, 18, 4.5, 11, 2, palette.clothes);
    drawShadedRoundRect(offCtx, 22, 18, 4.5, 11, 2, palette.clothes);
  }
  // Torso
  drawShadedRoundRect(offCtx, 9.5, 17, 13, 13, 3, palette.clothes);
  // Head + hair
  drawShadedCircle(offCtx, 16, 10, 7, palette.skin);
  drawShadedRoundRect(offCtx, 8, 2.5, 16, 8.5, 4, palette.hair);
  drawShadedRoundRect(offCtx, 7.5, 6, 3, 7, 1.5, palette.hair);
  drawShadedRoundRect(offCtx, 21.5, 6, 3, 7, 1.5, palette.hair);
  // Eyes
  offCtx.fillStyle = eyeColor;
  offCtx.fillRect(12.5, 10, 2, 2);
  offCtx.fillRect(17.5, 10, 2, 2);

  offCtx.restore();
}

function pulseBackground(ctx, canvas, state, t) {
  ctx.fillStyle = '#1f2129';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (state === 'idle') return;
  const isError = state === 'error';
  const glow = (isError ? 0.25 : 0.15) + (isError ? 0.15 : 0.1) * Math.sin(t / (isError ? 160 : 220));
  ctx.fillStyle = isError
    ? `rgba(224, 80, 80, ${glow.toFixed(2)})`
    : `rgba(244, 197, 66, ${glow.toFixed(2)})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ---- App wiring ------------------------------------------------------

const pickerEl = document.getElementById('picker');
const stage = document.getElementById('stage');
const styleBtn = document.getElementById('style-btn');
const labelEl = document.getElementById('label');
const stageCtx = stage.getContext('2d');

const offscreen = document.createElement('canvas');
offscreen.width = OFFSCREEN_W;
offscreen.height = OFFSCREEN_H;
const offCtx = offscreen.getContext('2d');

let currentStyle = null;
let currentState = 'idle';
let currentSessionId = null;
let socketConnected = false;

function renderCharacterAt(targetCtx, style, state, frame, x, y, scale) {
  drawCharacter(offCtx, { style, state, frame });
  targetCtx.imageSmoothingEnabled = false;
  targetCtx.drawImage(offscreen, x, y, OFFSCREEN_W * scale, OFFSCREEN_H * scale);
}

function drawPreview(canvasId, style) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1f2129';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  renderCharacterAt(ctx, style, 'idle', 0, 2, 2, SCALE_PREVIEW);
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
  if (socketConnected) return;
  socketConnected = true;
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
  const FRAME_INTERVAL = 250;

  function tick(t) {
    if (!document.hidden) {
      if (t - lastFrameTime > FRAME_INTERVAL) {
        frame += 1;
        lastFrameTime = t;
      }
      pulseBackground(stageCtx, stage, currentState, t);
      renderCharacterAt(stageCtx, currentStyle, currentState, frame, 18, 8, SCALE_STAGE);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

let renderLoopStarted = false;

function showStage() {
  pickerEl.hidden = true;
  stage.hidden = false;
  styleBtn.hidden = false;
  connectSocket();
  if (!renderLoopStarted) {
    renderLoopStarted = true;
    startRenderLoop();
  }
  updateLabel();
}

function openPicker() {
  stage.hidden = true;
  styleBtn.hidden = true;
  pickerEl.hidden = false;
  drawPreview('preview-a', 'a');
  drawPreview('preview-b', 'b');
}

pickerEl.querySelectorAll('.choice').forEach((el) => {
  el.addEventListener('click', async () => {
    const style = el.dataset.style;
    await saveAvatarStyle(style);
    currentStyle = style;
    showStage();
  });
});

styleBtn.addEventListener('click', openPicker);

async function init() {
  const config = await loadAvatarConfig();
  if (config.style === 'a' || config.style === 'b') {
    currentStyle = config.style;
    showStage();
  } else {
    openPicker();
  }
}

init();

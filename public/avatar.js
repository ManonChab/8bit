// Placeholder 16-bit-style pixel avatar + background scenes (no external
// image assets baked in here / no image-generation tool available in this
// environment). Everything is drawn at low native resolution with shaded
// primitives onto an offscreen canvas, then scaled up with
// imageSmoothingEnabled=false — the standard trick for a crisp pixel-art
// look without hand-placing every pixel. Real art can replace any of this
// later without touching the state machine below.

const OFFSCREEN_W = 32;
const OFFSCREEN_H = 42;
const SCALE_STAGE = 4;
const SCALE_PREVIEW = 3;
const CHAR_X = 14;
const CHAR_Y = 8;

const BG_GRID_W = 55;
const BG_GRID_H = 48;

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

// Themes whose character should sit at a desk instead of standing. Keeps
// the "which pose" decision in one place as more themes get their own
// contextual action later (#13).
const SEATED_THEMES = new Set(['developer']);

// 3/4 back view, facing right: we see mostly the back/crown of the head:
// hair covers the top, right side and back, leaving only a thin sliver of
// cheek (with one eye, glancing back over the far shoulder) exposed on the
// left — the side opposite the direction they're facing.
function drawHeadAndTorso(offCtx, palette, eyeColor) {
  drawShadedRoundRect(offCtx, 9.5, 17, 13, 13, 3, palette.clothes);
  drawShadedCircle(offCtx, 16, 10, 7, palette.skin);
  // Hair mass: bigger than the head and offset right/up, so it covers the
  // crown, back and right side while a sliver stays exposed on the left.
  drawShadedCircle(offCtx, 17.5, 9, 8, palette.hair);
  // Hair trailing down the back (the side away from the exposed cheek).
  drawShadedRoundRect(offCtx, 18, 14, 6, 6, 2, palette.hair);
  offCtx.fillStyle = eyeColor;
  offCtx.fillRect(10, 11, 1.6, 1.6);
}

function drawStandingCharacter(offCtx, { palette, state, frame, eyeColor }) {
  const bobFrames = state === 'active' ? ACTIVE_BOB : IDLE_BOB;
  const bob = state === 'error' ? 0 : bobFrames[frame % bobFrames.length];
  const armsUp = state === 'active';

  // Legs/boots stay planted — only the chest/shoulders/head rise and fall,
  // so this reads as breathing rather than the whole character jumping.
  drawShadedRoundRect(offCtx, 10.5, 37, 5, 4, 1, '#181820');
  drawShadedRoundRect(offCtx, 16.5, 37, 5, 4, 1, '#181820');
  drawShadedRoundRect(offCtx, 11.5, 29, 4, 9, 1, '#2a2a35');
  drawShadedRoundRect(offCtx, 17.5, 29, 4, 9, 1, '#2a2a35');

  offCtx.save();
  offCtx.translate(0, bob);

  // Arms (behind torso so the torso overlaps the shoulder joint cleanly)
  if (armsUp) {
    drawShadedRoundRect(offCtx, 4.5, 7, 4.5, 11, 2, palette.clothes);
    drawShadedRoundRect(offCtx, 23, 7, 4.5, 11, 2, palette.clothes);
  } else {
    drawShadedRoundRect(offCtx, 5.5, 18, 4.5, 11, 2, palette.clothes);
    drawShadedRoundRect(offCtx, 22, 18, 4.5, 11, 2, palette.clothes);
  }
  drawHeadAndTorso(offCtx, palette, eyeColor);

  offCtx.restore();
}

// Sitting at a chair with a personal laptop drawn in the character's own
// coordinate space (not the background's desk) so the hands always line
// up with the laptop regardless of where the character sits on stage.
function drawSeatedCharacter(offCtx, { palette, state, frame, eyeColor, t }) {
  const bobFrames = IDLE_BOB; // breathing only while seated — no "jump" bob
  const bob = bobFrames[frame % bobFrames.length];
  const typing = state === 'active';
  // Faster, independent phase for the typing hands than the breathing bob.
  const typingPhase = typing ? Math.floor(t / 130) % 2 : 0;
  const leftHandY = typing ? (typingPhase === 0 ? 27.5 : 28.5) : 28;
  const rightHandY = typing ? (typingPhase === 0 ? 28.5 : 27.5) : 28;

  // Chair back, drawn first so only its edges peek out from behind the torso.
  drawShadedRoundRect(offCtx, 7, 19, 18, 15, 2, '#3d2b1f');

  offCtx.save();
  offCtx.translate(0, bob);

  // Laptop, in front of the character at hand height.
  drawShadedRoundRect(offCtx, 9, 26.5, 14, 3, 0.5, '#4a4d5a'); // base/keyboard
  drawShadedRoundRect(offCtx, 10, 20.5, 12, 6, 0.5, '#20222b'); // screen
  offCtx.fillStyle = '#6fe08a';
  offCtx.fillRect(11.5, 22, 4, 0.7);
  offCtx.fillStyle = '#6fbde0';
  offCtx.fillRect(11.5, 23.3, 6, 0.7);
  offCtx.fillStyle = '#e0c56f';
  offCtx.fillRect(11.5, 24.6, 3, 0.7);

  // Forearms/hands reaching down to the keyboard, alternating while typing.
  drawShadedRoundRect(offCtx, 7.5, 20, 3, leftHandY - 20, 1, palette.clothes);
  drawShadedRoundRect(offCtx, 21.5, 20, 3, rightHandY - 20, 1, palette.clothes);

  drawHeadAndTorso(offCtx, palette, eyeColor);

  offCtx.restore();
}

function drawCharacter(offCtx, { style, state, frame, background, t }) {
  const palette = STYLES[style] || STYLES.a;
  const eyeColor = state === 'error' ? '#e05050' : '#20202a';

  offCtx.clearRect(0, 0, OFFSCREEN_W, OFFSCREEN_H);

  if (SEATED_THEMES.has(background)) {
    drawSeatedCharacter(offCtx, { palette, state, frame, eyeColor, t: t || 0 });
  } else {
    drawStandingCharacter(offCtx, { palette, state, frame, eyeColor });
  }
}

// ---- Background scenes -------------------------------------------------
// Drawn on their own low-res grid (independent of the character's), then
// stretched to fill the stage canvas — same "chunky pixel" technique as
// the character, so the two layers read as one consistent style.

function drawPlainScene(ctx, w, h) {
  ctx.fillStyle = '#1f2129';
  ctx.fillRect(0, 0, w, h);
}

function drawDeveloperScene(ctx) {
  // Wall
  ctx.fillStyle = '#262a35';
  ctx.fillRect(0, 0, BG_GRID_W, BG_GRID_H);
  // Faint window, upper right
  drawShadedRoundRect(ctx, 42, 4, 10, 9, 1, '#3a4a5c');
  // Floor strip
  ctx.fillStyle = '#1c1e26';
  ctx.fillRect(0, 44, BG_GRID_W, 4);

  // Desk (full-width band near the bottom, character stands in front of it)
  drawShadedRoundRect(ctx, 2, 33, 51, 11, 1, '#8a5a34');

  // Monitor, positioned to the right of where the character stands
  drawShadedRoundRect(ctx, 37, 12, 15, 12, 1, '#20222b'); // bezel
  ctx.fillStyle = '#16324a';
  ctx.fillRect(39, 14, 11, 8); // screen
  // A few short "code line" pixels on the screen
  ctx.fillStyle = '#6fe08a';
  ctx.fillRect(40, 15.5, 4, 0.8);
  ctx.fillStyle = '#e0c56f';
  ctx.fillRect(40, 17, 6, 0.8);
  ctx.fillStyle = '#6fbde0';
  ctx.fillRect(40, 18.5, 3, 0.8);
  ctx.fillStyle = '#e0c56f';
  ctx.fillRect(40, 20, 5, 0.8);
  // Monitor stand
  drawShadedRoundRect(ctx, 43, 24, 3, 4, 0.5, '#3a3d4a');

  // Keyboard on the desk in front of the monitor
  drawShadedRoundRect(ctx, 38, 29, 13, 3.5, 0.5, '#4a4d5a');

  // Coffee mug beside the keyboard
  drawShadedRoundRect(ctx, 33, 27, 4, 5, 1, '#e8e8e8');
  ctx.fillStyle = '#3a2a1e';
  ctx.fillRect(34, 27.5, 2, 1); // coffee surface
}

const BACKGROUND_THEMES = {
  developer: drawDeveloperScene,
};

// ---- App wiring ------------------------------------------------------

const pickerEl = document.getElementById('picker');
const bgPickerEl = document.getElementById('bg-picker');
const stage = document.getElementById('stage');
const styleBtn = document.getElementById('style-btn');
const bgBtn = document.getElementById('bg-btn');
const labelEl = document.getElementById('label');
const stageCtx = stage.getContext('2d');

const offscreen = document.createElement('canvas');
offscreen.width = OFFSCREEN_W;
offscreen.height = OFFSCREEN_H;
const offCtx = offscreen.getContext('2d');

const bgOffscreen = document.createElement('canvas');
bgOffscreen.width = BG_GRID_W;
bgOffscreen.height = BG_GRID_H;
const bgOffCtx = bgOffscreen.getContext('2d');

let currentStyle = null;
let currentBackground = 'none';
let currentState = 'idle';
let currentSessionId = null;
let socketConnected = false;

function renderCharacterAt(targetCtx, style, state, frame, x, y, scale, background, t) {
  drawCharacter(offCtx, { style, state, frame, background, t });
  targetCtx.imageSmoothingEnabled = false;
  targetCtx.drawImage(offscreen, x, y, OFFSCREEN_W * scale, OFFSCREEN_H * scale);
}

function renderBackgroundInto(targetCtx, w, h, backgroundId) {
  const themeDraw = BACKGROUND_THEMES[backgroundId];
  if (!themeDraw) {
    drawPlainScene(targetCtx, w, h);
    return;
  }
  bgOffCtx.clearRect(0, 0, BG_GRID_W, BG_GRID_H);
  themeDraw(bgOffCtx);
  targetCtx.imageSmoothingEnabled = false;
  targetCtx.drawImage(bgOffscreen, 0, 0, w, h);
}

function drawStatePulseOverlay(ctx, canvas, state, t) {
  if (state === 'idle') return;
  const isError = state === 'error';
  const glow = (isError ? 0.25 : 0.15) + (isError ? 0.15 : 0.1) * Math.sin(t / (isError ? 160 : 220));
  ctx.fillStyle = isError
    ? `rgba(224, 80, 80, ${glow.toFixed(2)})`
    : `rgba(244, 197, 66, ${glow.toFixed(2)})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawPreviewCharacter(canvasId, style) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1f2129';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  renderCharacterAt(ctx, style, 'idle', 0, 2, 2, SCALE_PREVIEW);
}

function drawPreviewBackground(canvasId, backgroundId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  renderBackgroundInto(ctx, canvas.width, canvas.height, backgroundId);
}

async function loadAvatarConfig() {
  const res = await fetch('/avatar-config');
  return res.json();
}

async function saveAvatarConfig(partial) {
  await fetch('/avatar-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partial),
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
      renderBackgroundInto(stageCtx, stage.width, stage.height, currentBackground);
      drawStatePulseOverlay(stageCtx, stage, currentState, t);
      renderCharacterAt(stageCtx, currentStyle, currentState, frame, CHAR_X, CHAR_Y, SCALE_STAGE, currentBackground, t);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

let renderLoopStarted = false;

function showStage() {
  pickerEl.hidden = true;
  bgPickerEl.hidden = true;
  stage.hidden = false;
  styleBtn.hidden = false;
  bgBtn.hidden = false;
  connectSocket();
  if (!renderLoopStarted) {
    renderLoopStarted = true;
    startRenderLoop();
  }
  updateLabel();
}

function openStylePicker() {
  stage.hidden = true;
  styleBtn.hidden = true;
  bgBtn.hidden = true;
  pickerEl.hidden = false;
  drawPreviewCharacter('preview-a', 'a');
  drawPreviewCharacter('preview-b', 'b');
}

function openBackgroundPicker() {
  stage.hidden = true;
  styleBtn.hidden = true;
  bgBtn.hidden = true;
  bgPickerEl.hidden = false;
  drawPreviewBackground('preview-bg-none', 'none');
  drawPreviewBackground('preview-bg-developer', 'developer');
}

pickerEl.querySelectorAll('.choice').forEach((el) => {
  el.addEventListener('click', async () => {
    const style = el.dataset.style;
    await saveAvatarConfig({ style });
    currentStyle = style;
    showStage();
  });
});

bgPickerEl.querySelectorAll('.choice').forEach((el) => {
  el.addEventListener('click', async () => {
    const background = el.dataset.background;
    await saveAvatarConfig({ background });
    currentBackground = background;
    showStage();
  });
});

styleBtn.addEventListener('click', openStylePicker);
bgBtn.addEventListener('click', openBackgroundPicker);

async function init() {
  const config = await loadAvatarConfig();
  currentBackground = config.background || 'none';
  if (config.style === 'a' || config.style === 'b') {
    currentStyle = config.style;
    showStage();
  } else {
    openStylePicker();
  }
}

init();

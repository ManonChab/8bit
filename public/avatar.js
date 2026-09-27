// Placeholder 16-bit-style pixel avatar + background scenes, drawn at low
// native resolution with shaded primitives onto an offscreen canvas, then
// scaled up with imageSmoothingEnabled=false — the standard trick for a
// crisp pixel-art look without hand-placing every pixel. Used for the
// "none" background and as a load-in fallback for themes with real art.
//
// Themes with real generated art (currently just "developer" — see
// art/developer-theme/pixellab/v2/NOTES.md) render via the
// REAL_ART_THEMES/realArt path below instead, without touching this
// procedural state machine.

const OFFSCREEN_W = 32;
const OFFSCREEN_H = 42;
const SCALE_STAGE = 4;
const CHAR_X = 14;
const CHAR_Y = 8;

const BG_GRID_W = 55;
const BG_GRID_H = 48;

const STYLES = {
  developer: { hair: '#a97c50', clothes: '#5a7dd6', skin: '#f2c9a0' },
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

function drawHeadAndTorso(offCtx, palette, eyeColor) {
  drawShadedRoundRect(offCtx, 9.5, 17, 13, 13, 3, palette.clothes);
  drawShadedCircle(offCtx, 16, 10, 7, palette.skin);
  drawShadedRoundRect(offCtx, 8, 2.5, 16, 8.5, 4, palette.hair);
  drawShadedRoundRect(offCtx, 7.5, 6, 3, 7, 1.5, palette.hair);
  drawShadedRoundRect(offCtx, 21.5, 6, 3, 7, 1.5, palette.hair);
  offCtx.fillStyle = eyeColor;
  offCtx.fillRect(12.5, 10, 2, 2);
  offCtx.fillRect(17.5, 10, 2, 2);
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
  const palette = STYLES[style] || STYLES.developer;
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

// ---- Real PixelLab art (developer theme, animate-with-text-v3) --------
// Generated stills + animations live under art/developer-theme/pixellab/v2/
// (see that folder's NOTES.md for how). Only the "developer" theme has real
// art so far (#8-#12 are still procedural) -- REAL_ART_THEMES is the single
// switch a future theme flips once its own art pass lands.
const REAL_ART_BASE = '/art/developer-theme/pixellab/v2';
const REAL_ART_THEMES = new Set(['developer']);
const REAL_BG_NATIVE_W = 128;
const REAL_CHAR_NATIVE = 64;
const REAL_ANIM_STATE_NAME = { idle: 'idle', active: 'working', error: 'error' };
const REAL_ANIM_LAST_FRAME = { idle: 4, working: 8, error: 8 };
const REAL_ANIM_FRAME_MS = 140; // ~7fps, matches public/test-assets.html

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

const realArt = {
  background: loadImage(`${REAL_ART_BASE}/background/background.png`),
  frames: Object.fromEntries(
    Object.entries(REAL_ANIM_LAST_FRAME).map(([animState, lastFrame]) => [
      animState,
      Array.from({ length: lastFrame + 1 }, (_, i) =>
        loadImage(`${REAL_ART_BASE}/animations/${animState}/frame-${i}.png`)
      ),
    ])
  ),
};

function imageReady(img) {
  return img.complete && img.naturalWidth > 0;
}

// Draws the real background if loaded, otherwise the procedural developer
// scene as a placeholder for the brief window before images decode.
function renderRealBackgroundInto(targetCtx, w, h) {
  if (imageReady(realArt.background)) {
    targetCtx.imageSmoothingEnabled = false;
    targetCtx.drawImage(realArt.background, 0, 0, w, h);
  } else {
    drawDeveloperScene(bgOffCtx);
    targetCtx.imageSmoothingEnabled = false;
    targetCtx.drawImage(bgOffscreen, 0, 0, w, h);
  }
}

// Draws the current animation frame for `state` if loaded, otherwise falls
// back to the procedural seated character.
function renderRealCharacterAt(targetCtx, state, t, x, y, w, h, style, frame) {
  const animState = REAL_ANIM_STATE_NAME[state] || 'idle';
  const frames = realArt.frames[animState];
  const frameIndex = Math.floor(t / REAL_ANIM_FRAME_MS) % frames.length;
  const img = frames[frameIndex];
  if (imageReady(img)) {
    targetCtx.imageSmoothingEnabled = false;
    targetCtx.drawImage(img, x, y, w, h);
  } else {
    renderCharacterAt(targetCtx, style, state, frame, CHAR_X, CHAR_Y, SCALE_STAGE, 'developer', t);
  }
}

// ---- App wiring ------------------------------------------------------

const pickerEl = document.getElementById('picker');
const pickerReturnBtn = document.getElementById('picker-return-btn');
const stageWrap = document.getElementById('stage-wrap');
const stage = document.getElementById('stage');
const styleBtn = document.getElementById('style-btn');
const skillsBtn = document.getElementById('skills-btn');
const skillsIconCanvas = document.getElementById('skills-icon');
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
let currentBackground = 'developer';
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

// Small static "book" icon for the skills button, drawn once with the same
// 3-band shading helpers as the character/background so it reads as part of
// the same 16-bit art style rather than a plain UI glyph.
function drawSkillsIcon() {
  const ctx = skillsIconCanvas.getContext('2d');
  ctx.clearRect(0, 0, 16, 16);
  drawShadedRoundRect(ctx, 2, 2, 12, 12, 1.5, '#e0c56f');
  ctx.fillStyle = shade('#e0c56f', -70);
  ctx.fillRect(7.5, 3, 1, 10); // spine
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
      if (REAL_ART_THEMES.has(currentBackground)) {
        renderRealBackgroundInto(stageCtx, stage.width, stage.height);
        drawStatePulseOverlay(stageCtx, stage, currentState, t);
        const scale = stage.width / REAL_BG_NATIVE_W;
        const charSize = REAL_CHAR_NATIVE * scale;
        const marginRight = (48 / 768) * stage.width; // matches public/test-assets.html's right margin ratio
        renderRealCharacterAt(
          stageCtx,
          currentState,
          t,
          stage.width - marginRight - charSize,
          stage.height - charSize,
          charSize,
          charSize,
          currentStyle,
          frame
        );
      } else {
        renderBackgroundInto(stageCtx, stage.width, stage.height, currentBackground);
        drawStatePulseOverlay(stageCtx, stage, currentState, t);
        renderCharacterAt(stageCtx, currentStyle, currentState, frame, CHAR_X, CHAR_Y, SCALE_STAGE, currentBackground, t);
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

let renderLoopStarted = false;

function showStage() {
  pickerEl.hidden = true;
  stageWrap.hidden = false;
  styleBtn.hidden = false;
  skillsBtn.hidden = false;
  connectSocket();
  if (!renderLoopStarted) {
    renderLoopStarted = true;
    startRenderLoop();
  }
  updateLabel();
}

const skillsPanelEl = document.getElementById('skills-panel');

function openStylePicker() {
  stageWrap.hidden = true;
  styleBtn.hidden = true;
  skillsBtn.hidden = true;
  skillsPanelEl.hidden = true;
  pickerEl.hidden = false;
  // Only offer a way back to the stage once a style has actually been
  // picked before -- on first run there's nothing to return to yet.
  pickerReturnBtn.hidden = !currentStyle;
}

pickerEl.querySelectorAll('.choice').forEach((el) => {
  el.addEventListener('click', async () => {
    const style = el.dataset.style;
    await saveAvatarConfig({ style });
    currentStyle = style;
    showStage();
  });
});

pickerReturnBtn.addEventListener('click', showStage);

styleBtn.addEventListener('click', openStylePicker);

drawSkillsIcon();

async function init() {
  const config = await loadAvatarConfig();
  currentBackground = config.background || 'developer';
  if (config.style === 'developer') {
    currentStyle = config.style;
    showStage();
  } else {
    openStylePicker();
  }
}

init();

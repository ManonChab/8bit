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
  // Placeholder palette for the procedural fallback -- chef has no real art
  // yet (see art/chef-theme/), its picker card stays disabled until it does.
  chef: { hair: '#3a2a1e', clothes: '#e8e8e8', skin: '#f2c9a0' },
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

// ---- Real PixelLab art (developer + chef themes) -----------------------
// Generated stills + animations live under art/<theme>-theme/pixellab/
// (see each theme's NOTES.md for how). REAL_ART_THEMES is the switch a
// theme's entry gets added to once its art pass is generated AND verified
// (see retro/2026-09-27-pixellab-visual-art.md guideline #6).
const REAL_ART_BASE_BY_THEME = {
  developer: '/art/developer-theme/pixellab/v2',
  chef: '/art/chef-theme/pixellab',
};
const REAL_ART_THEMES = new Set(['developer', 'chef']);
const REAL_BG_NATIVE_W = 128;
const REAL_BG_NATIVE_H = 112;
const REAL_CHAR_NATIVE = 64;
// Per-theme character placement, in native (128x112) background pixels --
// developer is full-body, bottom-right anchored (its own desk fills the
// frame); chef is waist-up and centered behind his counter (verified
// against the real generated background before picking these numbers).
const CHAR_POSITION_NATIVE = {
  developer: { x: 56, y: 48 },
  chef: { x: 32, y: 30 },
};
const REAL_ANIM_STATE_NAME = { idle: 'idle', active: 'working', error: 'error' };
const REAL_ANIM_LAST_FRAME = { idle: 4, working: 8, error: 8 };
const REAL_ANIM_FRAME_MS = 140; // ~7fps, matches public/test-assets.html

// Window glass bounding box within background.png, in native (128x112)
// pixels -- measured directly off the art (see art/.../v2/background, the
// window sits roughly centered, upper-middle). Used to clip the working-state
// day/night cycle to just the window pane, so nothing else in the room moves.
const WINDOW_RECT_NATIVE = { x: 46, y: 24, w: 48, h: 46 };
const WINDOW_MULLION_COLOR = '#1f2543';
const DAY_NIGHT_CYCLE_MS = 4000;
const SKY_DAY_COLOR = '#6a8fc2';
const SKY_NIGHT_COLOR = '#0d1024';
const SUN_COLOR = '#f4b942';
const MOON_COLOR = '#d8dce8';

// Field + a low, distant town sitting on the horizon, kept below the
// sun/moon's arc so neither ever overlaps the skyline.
const HORIZON_RATIO = 0.72; // fraction down the window where field meets sky
const FIELD_DAY_COLOR = '#4f7a3d';
const FIELD_NIGHT_COLOR = '#141f14';
const TOWN_DAY_COLOR = '#241f30';
const TOWN_NIGHT_COLOR = '#23283f';
// [xRatio, widthRatio, heightRatio] of the window, left-to-right -- a small
// uneven skyline rather than uniform blocks.
const TOWN_BUILDINGS = [
  [0.04, 0.11, 0.16], [0.16, 0.08, 0.11], [0.25, 0.13, 0.23], [0.40, 0.08, 0.13],
  [0.50, 0.15, 0.17], [0.68, 0.09, 0.21], [0.80, 0.12, 0.14],
];

// While "working," the window cycles a fast day -> night -> day loop (sun
// sweeps left-to-right, then the moon follows the same path against a dark
// sky) instead of the flash overlay used for other states. Everything
// outside the clipped window rect is untouched -- the room, desk, and
// character never move because of this.
function renderWindowDayNightCycle(targetCtx, stageW, stageH, t) {
  const scaleX = stageW / REAL_BG_NATIVE_W;
  const scaleY = stageH / REAL_BG_NATIVE_H;
  const wx = WINDOW_RECT_NATIVE.x * scaleX;
  const wy = WINDOW_RECT_NATIVE.y * scaleY;
  const ww = WINDOW_RECT_NATIVE.w * scaleX;
  const wh = WINDOW_RECT_NATIVE.h * scaleY;

  const phase = (t % DAY_NIGHT_CYCLE_MS) / DAY_NIGHT_CYCLE_MS;
  const isDay = phase < 0.5;
  const local = isDay ? phase * 2 : (phase - 0.5) * 2; // 0..1 within this half

  targetCtx.save();
  targetCtx.beginPath();
  targetCtx.rect(wx, wy, ww, wh);
  targetCtx.clip();

  targetCtx.fillStyle = isDay ? SKY_DAY_COLOR : SKY_NIGHT_COLOR;
  targetCtx.fillRect(wx, wy, ww, wh);

  const bodyR = Math.max(2, ww * 0.09);
  const bodyX = wx + bodyR + local * (ww - bodyR * 2);
  const bodyY = wy + wh * 0.6 - Math.sin(local * Math.PI) * wh * 0.35; // rise/set arc
  drawShadedCircle(targetCtx, bodyX, bodyY, bodyR, isDay ? SUN_COLOR : MOON_COLOR);

  // Field + skyline sit on top of the sky/sun so the body appears to travel
  // behind the horizon at the edges of its sweep, then the town silhouette
  // on top of that.
  const horizonY = wy + wh * HORIZON_RATIO;
  targetCtx.fillStyle = isDay ? FIELD_DAY_COLOR : FIELD_NIGHT_COLOR;
  targetCtx.fillRect(wx, horizonY, ww, wy + wh - horizonY);

  targetCtx.fillStyle = isDay ? TOWN_DAY_COLOR : TOWN_NIGHT_COLOR;
  TOWN_BUILDINGS.forEach(([xr, wr, hr]) => {
    const bx = wx + xr * ww;
    const bw = wr * ww;
    const bh = hr * wh;
    targetCtx.fillRect(bx, horizonY - bh, bw, bh + 2);
  });

  targetCtx.restore();

  // Redraw the window's cross mullion on top so the 4-pane look survives
  // the sky fill underneath it.
  targetCtx.strokeStyle = WINDOW_MULLION_COLOR;
  targetCtx.lineWidth = Math.max(1, scaleX);
  const midX = wx + ww / 2;
  const midY = wy + wh / 2;
  targetCtx.beginPath();
  targetCtx.moveTo(midX, wy);
  targetCtx.lineTo(midX, wy + wh);
  targetCtx.moveTo(wx, midY);
  targetCtx.lineTo(wx + ww, midY);
  targetCtx.stroke();
}

// Stove-top area, in native (128x112) background pixels -- measured off
// the generated background the same way as developer's window rect. The
// fire is drawn *before* the character (see tick()), so wherever it
// overlaps the character's opaque pixels it's hidden behind him -- that's
// fine/realistic for the base of the flame, but the rect reaches well
// above the character's top (his sprite starts at CHAR_POSITION_NATIVE.chef.y,
// currently 30) so the flame tips are always clearly visible rising above
// his head, not fully hidden behind him.
const STOVE_FIRE_RECT_NATIVE = { x: 56, y: 6, w: 28, h: 76 };
const FIRE_COLORS = ['#e05a2b', '#f4b942', '#f9e07f'];

// While the chef is in "error," a flickering fire rises from the stove
// behind him -- procedural (retro guideline #7: this doesn't need
// generated-art quality to read as fire), clipped to the stove rect so
// nothing else in the kitchen moves.
function renderStoveFire(targetCtx, stageW, stageH, t) {
  const scaleX = stageW / REAL_BG_NATIVE_W;
  const scaleY = stageH / REAL_BG_NATIVE_H;
  const fx = STOVE_FIRE_RECT_NATIVE.x * scaleX;
  const fy = STOVE_FIRE_RECT_NATIVE.y * scaleY;
  const fw = STOVE_FIRE_RECT_NATIVE.w * scaleX;
  const fh = STOVE_FIRE_RECT_NATIVE.h * scaleY;

  targetCtx.save();
  targetCtx.beginPath();
  targetCtx.rect(fx, fy, fw, fh);
  targetCtx.clip();

  // 9 overlapping flame blobs (3x the original 3), each with its own
  // staggered flicker phase, rising from the bottom of the rect and
  // narrowing toward the top. Minimum height (flicker=0) already clears
  // the character's head; peak flicker reaches the top of the rect.
  const FLAME_COUNT = 9;
  Array.from({ length: FLAME_COUNT }, (_, i) => i).forEach((i) => {
    const phase = t / 90 + i * 1.4;
    const flicker = Math.sin(phase) * 0.5 + 0.5;
    const frac = (i + 0.5) / FLAME_COUNT;
    const bx = fx + fw * frac + Math.sin(phase * 1.3) * fw * 0.04;
    const baseY = fy + fh;
    const flameH = fh * (0.7 + flicker * 0.4);
    const flameW = fw * (0.17 - (i % 3) * 0.015);
    targetCtx.fillStyle = FIRE_COLORS[i % FIRE_COLORS.length];
    targetCtx.beginPath();
    targetCtx.moveTo(bx - flameW / 2, baseY);
    targetCtx.quadraticCurveTo(bx - flameW / 2, baseY - flameH * 0.6, bx, baseY - flameH);
    targetCtx.quadraticCurveTo(bx + flameW / 2, baseY - flameH * 0.6, bx + flameW / 2, baseY);
    targetCtx.closePath();
    targetCtx.fill();
  });

  targetCtx.restore();
}

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

function buildRealArt(base) {
  return {
    background: loadImage(`${base}/background/background.png`),
    // Per-state static image -- used when a theme has stills but no
    // animation yet (e.g. chef). Animation frames are preferred over this
    // when both exist (see renderRealCharacterAt).
    stills: Object.fromEntries(
      Object.keys(REAL_ANIM_LAST_FRAME).map((animState) => [
        animState,
        loadImage(`${base}/character/${animState}.png`),
      ])
    ),
    frames: Object.fromEntries(
      Object.entries(REAL_ANIM_LAST_FRAME).map(([animState, lastFrame]) => [
        animState,
        Array.from({ length: lastFrame + 1 }, (_, i) =>
          loadImage(`${base}/animations/${animState}/frame-${i}.png`)
        ),
      ])
    ),
  };
}

const realArtByTheme = Object.fromEntries(
  Object.entries(REAL_ART_BASE_BY_THEME).map(([theme, base]) => [theme, buildRealArt(base)])
);

function imageReady(img) {
  return img.complete && img.naturalWidth > 0;
}

// Draws theme's real background if loaded, otherwise the generic
// procedural scene as a placeholder (brief window before images decode,
// or indefinitely for a theme whose art doesn't exist yet).
function renderRealBackgroundInto(targetCtx, w, h, theme) {
  const bg = realArtByTheme[theme]?.background;
  if (bg && imageReady(bg)) {
    targetCtx.imageSmoothingEnabled = false;
    targetCtx.drawImage(bg, 0, 0, w, h);
  } else {
    renderBackgroundInto(targetCtx, w, h, theme);
  }
}

// Prefers an animation frame for `state` if that theme has one loaded,
// falls back to a static still if the theme has one (e.g. chef, stills
// only), falls back further to the procedural character for this theme.
function renderRealCharacterAt(targetCtx, state, t, x, y, w, h, style, frame, theme) {
  const animState = REAL_ANIM_STATE_NAME[state] || 'idle';
  const art = realArtByTheme[theme];
  const frames = art?.frames[animState];
  const animImg = frames && frames[Math.floor(t / REAL_ANIM_FRAME_MS) % frames.length];
  const stillImg = art?.stills[animState];

  const img = animImg && imageReady(animImg) ? animImg : stillImg && imageReady(stillImg) ? stillImg : null;

  if (img) {
    targetCtx.imageSmoothingEnabled = false;
    targetCtx.drawImage(img, x, y, w, h);
  } else {
    renderCharacterAt(targetCtx, style, state, frame, CHAR_X, CHAR_Y, SCALE_STAGE, theme, t);
  }
}

// ---- App wiring ------------------------------------------------------

const pickerEl = document.getElementById('picker');
const pickerReturnBtn = document.getElementById('picker-return-btn');
const stageWrap = document.getElementById('stage-wrap');
const stage = document.getElementById('stage');
const styleBtn = document.getElementById('style-btn');
const skillsBtn = document.getElementById('skills-btn');
// TEMPORARY dev tool -- see the matching HTML comment in index.html.
const testStateBtn = document.getElementById('test-state-btn');
const testStatePanel = document.getElementById('test-state-panel');
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
        renderRealBackgroundInto(stageCtx, stage.width, stage.height, currentBackground);
        // A per-theme tailored effect (drawn behind the character, since
        // both are "part of the scene the character stands in front of")
        // replaces the generic pulse for that specific theme+state combo;
        // every other combo keeps the generic pulse.
        if (currentState === 'active' && currentBackground === 'developer') {
          renderWindowDayNightCycle(stageCtx, stage.width, stage.height, t);
        } else if (currentState === 'error' && currentBackground === 'chef') {
          renderStoveFire(stageCtx, stage.width, stage.height, t);
        } else {
          drawStatePulseOverlay(stageCtx, stage, currentState, t);
        }
        const scale = stage.width / REAL_BG_NATIVE_W;
        const charSize = REAL_CHAR_NATIVE * scale;
        const charPos = CHAR_POSITION_NATIVE[currentBackground] || { x: 0, y: 0 };
        renderRealCharacterAt(
          stageCtx,
          currentState,
          t,
          charPos.x * scale,
          charPos.y * scale,
          charSize,
          charSize,
          currentStyle,
          frame,
          currentBackground
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
  testStateBtn.hidden = false;
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
  testStateBtn.hidden = true;
  testStatePanel.hidden = true;
  skillsPanelEl.hidden = true;
  pickerEl.hidden = false;
  // Only offer a way back to the stage once a style has actually been
  // picked before -- on first run there's nothing to return to yet.
  pickerReturnBtn.hidden = !currentStyle;
}

pickerEl.querySelectorAll('.choice[data-style]').forEach((el) => {
  el.addEventListener('click', async () => {
    const style = el.dataset.style;
    // style maps 1:1 to a background theme -- the portrait picker chooses
    // both together (see server/index.js). Picking a card must update
    // both, or the stage keeps rendering whatever theme was picked last.
    await saveAvatarConfig({ style, background: style });
    currentStyle = style;
    currentBackground = style;
    showStage();
  });
});

pickerReturnBtn.addEventListener('click', showStage);

styleBtn.addEventListener('click', openStylePicker);

// TEMPORARY dev tool: force currentState locally so an animation can be
// previewed without sending a real hook event. A live hook event (or
// another click here) overrides it immediately, same as any other state
// change -- this never touches the server's own state.
testStateBtn.addEventListener('click', () => {
  testStatePanel.hidden = !testStatePanel.hidden;
});
testStatePanel.querySelectorAll('button').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentState = btn.dataset.testState;
    currentSessionId = currentSessionId || 'test';
    updateLabel();
  });
});

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

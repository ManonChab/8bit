🇬🇧 **English** · [🇪🇸 Español](README.es.md)

# Live Session

<p align="center"><img src="docs/img/screenshot.png" alt="Live Session floating window showing the developer avatar mid-session, with the window's night sky and the Skills panel button" width="360" /></p>

## 📑 Contents

- [What is it?](#what-is-it)
- [What can I do with it?](#what-can-i-do)
- [Status](#status)
- [How can I try it?](#how-can-i-try-it)
- [How it's built](#how-its-built)
  - [Tech stack](#tech-stack)
  - [Architecture](#architecture)
- [How I work](#how-i-work)
- [Documentation](#documentation)
- [Author](#author)

<a id="what-is-it"></a>
## 🧩 What is it?

**Live Session** is a local companion app for [Claude Code](https://claude.com/claude-code): a 16-bit-style pixel-art avatar that sits next to your terminal and reacts live to what your CLI session is doing — idle, working, or hit an error — plus a read-only browser for your installed Claude Code skills. It's a solo personal project built to get hands-on with AI-driven development, not a product; the code, the process, and the retros below are the actual point.

<a id="what-can-i-do"></a>
## ✨ What can I do with it?

- Watch the avatar react in real time to Claude Code hook events (`SessionStart`, `PreToolUse`, `PostToolUse`, errors, `Stop`) over a WebSocket — no polling.
- Pick between hand-finished character themes (Developer, Chef) generated with [PixelLab](https://www.pixellab.ai/), each with its own animated background touch (a procedural day/night window cycle; a stove that flares up on error).
- Browse every Claude skill installed at the personal and project level, read its full body, and copy `/skill-name` to the clipboard to invoke it — without leaving the avatar.
- Run it as a normal browser tab, or as a standalone floating app window (`npm run start:floating`) that behaves like a real desktop widget.
- Wire and unwire the whole thing from any Claude Code project with one command each (`npm run setup` / `npm run teardown`).

<a id="status"></a>
## 📊 Status

| | |
|---|---|
| **Build** | ![last commit](https://img.shields.io/badge/last%20commit-2026--09--28-blue) — no CI pipeline yet, tests run locally |
| **Quality** | ![tests](https://img.shields.io/badge/tests-11%20passed-brightgreen) — `node:test`, no coverage tool configured yet |
| **Packages** | ![node](https://img.shields.io/badge/node-v24.20.0-339933?logo=nodedotjs&logoColor=white) ![express](https://img.shields.io/badge/express-%5E4.19.2-000000?logo=express&logoColor=white) ![ws](https://img.shields.io/badge/ws-%5E8.17.0-lightgrey) ![js--yaml](https://img.shields.io/badge/js--yaml-%5E5.4.2-lightgrey) |
| **Art scripts (Python)** | ![requests](https://img.shields.io/badge/requests-2.34.2-3776AB?logo=python&logoColor=white) ![python-dotenv](https://img.shields.io/badge/python--dotenv-1.2.3-3776AB?logo=python&logoColor=white) — no `requirements.txt` yet, versions from the local virtualenv |
| **License** | ![license](https://img.shields.io/badge/license-MIT-green) |

*Badges are a dated snapshot (2026-09-28), not live — the GitHub repo is currently private, so GitHub's own dynamic badges can't reach it. They'll switch to live badges once the repo is public.*

| Phase | Status |
|---|---|
| v1 — live avatar + skills browser ([Epic #1](https://github.com/ManonChab/8bit/issues/1)) | ✅ Done |
| Visual Design & Art Direction ([Epic #4](https://github.com/ManonChab/8bit/issues/4)) | 🚧 In progress — 2 of 5 planned background themes shipped |

<a id="how-can-i-try-it"></a>
## 🚀 How can I try it?

**Requirements:** Node.js (developed on v24; no `engines` field pinned yet) and an existing [Claude Code](https://claude.com/claude-code) project to hook it into.

```bash
git clone https://github.com/ManonChab/8bit.git
cd 8bit
npm install
npm run setup            # wires the hooks into ./.claude/settings.json of the CWD
npm start                 # opens in a browser tab — or:
npm run start:floating    # opens as a standalone floating window
```

Run `npm test` for the unit tests, and `npm run teardown` to remove the hooks again. Regenerating art (`scripts/pixellab/`) needs your own `PIXELLAB_API_KEY` in a local `.env` — not required to just run the app.

<a id="how-its-built"></a>
## 🏗️ How it's built

<a id="tech-stack"></a>
### Tech stack

![Node.js, Express, JavaScript, HTML5, CSS3, Python, Git, GitHub](https://skillicons.dev/icons?i=nodejs,express,js,html,css,python,git,github)

Node.js + Express + `ws` serve the avatar and receive Claude Code's hooks; the frontend is plain HTML/CSS/canvas JavaScript with no build step. Python (`requests` + `python-dotenv`) drives the one-off scripts in `scripts/pixellab/` that called the PixelLab generation API directly.

<a id="architecture"></a>
### Architecture

```
8bit/
├── server/                 # Express + WebSocket backend
│   ├── index.js             # HTTP/WS server, hook receiver, avatar-config API
│   ├── eventMapper.js       # Claude Code hook event -> idle | active | error
│   ├── skills.js            # Reads personal + project SKILL.md files
│   ├── avatar-config.js     # Reads/writes local style/background/window prefs
│   └── browserLauncher.js   # Opens the page as a tab, or a floating app window
├── public/                  # Static frontend, no build step
│   ├── index.html
│   ├── avatar.js             # Canvas renderer: procedural fallback + generated-art themes
│   └── skills.js              # Skills panel UI, clipboard "/skill-name" invoke
├── scripts/
│   ├── setup.js / teardown.js  # Wire/unwire Claude Code hooks
│   └── pixellab/                # One-off scripts calling the PixelLab API directly
├── art/                      # Sprites and backgrounds, one folder per theme
│   ├── developer-theme/       # PixelLab-generated character, background, animations
│   └── chef-theme/            # PixelLab-generated stills
├── test/                     # node:test unit tests
├── retro/                    # Dated retrospectives: spend audits, process fixes
├── docs/img/                 # README screenshot
├── CLAUDE.md                 # Agent operating rules (mandatory art pre-check)
└── future-ideas.md           # Deliberately deferred ideas, with reasons
```

A few decisions worth calling out:

- **No frontend build tool.** Plain HTML/CSS/canvas JS served directly by Express, so the whole setup is `git clone` + `npm install` + `npm start`.
- **Passive-observer, not an SDK-driven agent.** The server only listens to Claude Code's HTTP hooks and maps them to a state — there's no documented API to reach into an already-running interactive session, so this was the only architecture that didn't require replacing that session's input point (see `future-ideas.md`).
- **Procedural art before paid art.** The window's day/night cycle and the chef theme's error-state stove fire are drawn with canvas primitives, not generated — no PixelLab spend for motion that didn't need final-art fidelity to evaluate.
- **Raw HTTP calls to the PixelLab API, not its SDK**, in `scripts/pixellab/` — the SDK's response model assumes USD billing and crashed on this account's "generations" billing *after* a call had already charged; every call now dumps its raw JSON response to disk before parsing it.
- **A dated retro before every new art pass** (`retro/`) — added after roughly two-thirds of the first PixelLab pass's spend turned out wasted or never shipped; `CLAUDE.md` makes reading the latest retro's checklist mandatory before the next one.
- **The floating window uses Chrome/Edge `--app` mode, not Electron** — a real chromeless app window without a ~100MB+ desktop-runtime dependency for a one-person local tool.

<a id="how-i-work"></a>
## 🛠️ How I work

- **Issue-tracked planning.** Work is broken into GitHub Epics and Tasks before it's built (14 issues so far, 8 closed) — not just a backlog, an actual paper trail of what was planned versus what shipped.
- **Feature branches per work stream** (`main`, `dev`, `visual-design`, `animation`, …), merged back rather than committed straight to `main`.
- **Conventional Commits**, adopted partway through the project once the pattern proved useful — earlier history is plain-English messages, later commits are `feat(scope): ...` / `fix(scope): ...` / `docs(scope): ...`.
- **A retro before every new art pass**, auditing real spend (generations used, wasted, never shipped) and turning the root causes into a checklist the next pass has to follow — see [Documentation](#documentation).
- **Built with Claude Code.** This project exists specifically to build real experience with AI-driven development: most of the implementation — and this README — was done in pair-programming sessions with [Claude Code](https://claude.com/claude-code), working from this repo's own `CLAUDE.md` operating rules and the retro process above.
- **Tests, no CI yet.** 11 `node:test` unit tests cover the hook→state mapping and the skills parser's edge cases (malformed YAML frontmatter, missing directories); run with `npm test`. Wiring up CI is a known gap, not yet done.

<a id="documentation"></a>
## 📚 Documentation

| Purpose | Where |
|---|---|
| Roadmap / deliberately deferred ideas, with reasons | [`future-ideas.md`](future-ideas.md) |
| Retro process + dated spend audits | [`retro/README.md`](retro/README.md), dated files in [`retro/`](retro/) |
| Per-theme art sourcing & generation notes | `art/*/NOTES.md` |
| Agent operating rules for this repo | [`CLAUDE.md`](CLAUDE.md) |

<a id="author"></a>
## 👤 Author

[Manon Chab](https://github.com/ManonChab) — design, code, art direction, and this README, solo end to end.

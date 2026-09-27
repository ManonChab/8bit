# Future Implementation Ideas

Things explicitly discussed and deferred out of the v1 epic. Not commitments — revisit only if v1 is validated and one of these becomes worth the added complexity.

## Full active control via Claude Agent SDK

Replace (or add alongside) the passive-observer model: the web app itself becomes the client driving a headless Claude Code session via the [Claude Agent SDK](https://docs.claude.com), sending messages/skill invocations directly instead of copying `/skill-name` to the clipboard. This is the only way to get true click-to-invoke, since Claude Code has no documented daemon/RPC/prompt-injection API into an already-running interactive session. There's also a "Remote Control SDK" for embedded scenarios worth investigating here.

**Trade-off:** the panel stops sitting *beside* your terminal and starts *being* the input point for that session.

## Support for AI agents other than Claude Code

If a second coding agent with its own hook/webhook/plugin mechanism ever gets adopted, generalize the server's event schema (e.g. `{type, name, timestamp, session_id, ...}`) into an adapter layer, with Claude Code as the first concrete adapter. Not built now — no second target to validate the abstraction against.

## Richer frontend (React)

If the UI grows past a simple avatar + list/detail skills panel (e.g. settings pages, multiple views, history), consider React/Next.js for component structure. v1 deliberately stays build-tool-free.

## "Dress the avatar" mechanic

Beyond the initial male/female-style pick, let the avatar's appearance change based on session activity or other signals (specifics TBD — was deferred at the idea stage, never fully specified).

## Full avatar state set

5 distinct states (idle, thinking, using-tool, error, done) with a visibly different pose per tool (Bash vs Edit vs Read, etc.), instead of v1's collapsed 3-state set (idle/active/error).

## Multi-session / multi-avatar display

Render a separate avatar per concurrent `session_id` instead of v1's "show the most recently active one, labeled."

## Sharing with others

Once the local-only beta is validated, revisit which distribution model makes sense for handing this to other people:
- Browser extension (store review required)
- VS Code extension (marketplace publishing)
- Electron packaging (per-OS builds/signing)

v1 intentionally stays a `git clone` + `npm install` + `npm run setup` local tool.

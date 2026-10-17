# AGENTS.md — las_chicas

## Status
- Greenfield project: this directory is empty (no `git` repo, no `package.json`, no source, no config) as of 2026-10-16.
- Owner intent: a web app (React/Next.js-class stack). The specific framework has not been chosen yet.

## Working here
- Not a monorepo: sibling folders in `../` (`dinocartas`, `galpon`, `blog`, etc.) are unrelated projects — do not import from or assume shared tooling with them.
- `git` is not initialized here; commit/status workflows will fail until `git init` is run.
- If asked to scaffold: confirm the framework choice (e.g. Next.js vs. Vite + React) with the owner unless they have already named one.
- After scaffolding, update this file: replace the Status section above with the real package manager, `dev` / `build` / `test` / `lint` commands, and directory layout, so later sessions don't have to rediscover them.

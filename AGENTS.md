<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Ovillo

Spanish-language knitting/crochet community ("Ravelry, but simpler, modern and mobile first"). The owner does not write code: the agent does 100% of the programming, commands, commits and deploys, and keeps the docs current.

## Source of truth

- `docs/SPEC.md` — full product spec (data model, routes, design tokens, 8-phase plan). Read the relevant section before building something new. Do not edit it.
- `docs/PROGRESS.md` — phase checklist and current state. Update it at the end of every work session.
- `docs/DECISIONS.md` — technical decision log. When facing ambiguity, decide and record it there instead of stopping to ask, unless money or data deletion is involved.

## Commands

| Command                                      | What it does                                         |
| -------------------------------------------- | ---------------------------------------------------- |
| `pnpm dev`                                   | Dev server (Turbopack) at http://localhost:3000      |
| `pnpm build` / `pnpm start`                  | Production build / server                            |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | ESLint / types + `tsc --noEmit` / Vitest             |
| `pnpm test:e2e`                              | Playwright (local: levanta dev en el puerto 3100; ver D-029) |
| `pnpm format`                                | Prettier (also sorts Tailwind classes)               |
| `pnpm db:generate` → `pnpm db:migrate`       | Create + apply migrations (NEVER `drizzle-kit push`) |
| `pnpm db:check`                              | Connectivity smoke test against Neon                 |
| `pnpm dlx shadcn@latest add <component>`     | Add shadcn/ui components                             |
| `/dev/ui` (dev only)                         | Design-tokens + components showcase page             |

Before finishing any task: `pnpm typecheck && pnpm lint && pnpm test` green. Before closing a phase: also `pnpm build`.

## Stack facts that will bite you

- **Next.js 16.4** (App Router): `params`, `searchParams`, `cookies()`, `headers()` are async — always `await` them. Use generated helper types (`LayoutProps<"/">`, `PageProps<...>`). `middleware.ts` is now `proxy.ts` (nodejs runtime, not configurable). `next lint` no longer exists. Turbopack is the default. Route helper types only exist after `next dev` / `next build` / `next typegen`: that's why `pnpm typecheck` runs `next typegen` first (fresh clones and CI would otherwise fail with `Cannot find name 'LayoutProps'`).
- **Cache Components is ON** (`cacheComponents: true` + `partialPrefetching: true` in `next.config.ts`). Every route needs a static shell. Rules of thumb: shared public data → `"use cache"` + `cacheLife()` + `cacheTag()`; per-user/runtime data → a `<Suspense>` boundary or `"use cache: private"`. Uncached async work outside Suspense fails the build. Invalidate with `updateTag()` (read-your-writes, from Server Actions) or `revalidateTag(tag, profile)` — the second argument is required in 16.
- **Tailwind v4 is CSS-first**: no `tailwind.config`; all tokens live in `app/globals.css` (`:root` / `.dark` + `@theme inline`). A Vitest test (`lib/design/contrast.test.ts`) parses that file and enforces WCAG AA ≥ 4.5:1 on 24 color pairs — run `pnpm test` after touching the palette.
- **shadcn/ui** is the new generation: preset `radix-nova`, unified `radix-ui` package, and `cn` comes from the `cn` package (re-exported by `lib/utils.ts`) — do NOT add `clsx`/`tailwind-merge`. Components ship with English `sr-only` strings: translate to Spanish any you touch.
- **pnpm 10 blocks postinstall scripts** (`pnpm-workspace.yaml` → `ignoredBuiltDependencies`). If a dependency needs one (e.g. `sharp`), run `pnpm approve-builds`.
- On this machine the default npm registry is a private verdaccio that consistently 502s on `drizzle-orm`; install or update it with `--registry=https://registry.npmjs.org/`.
- **Git identity is per-project here**: this repo belongs to the owner's **personal** GitHub account (`LeonardoVenezia`, email `leovenezia@outlook.com.ar`) and uses a repository-local `core.sshCommand` that forces `~/.ssh/id_ed25519_leonardo` with `-F /dev/null` (the machine's global identity is the work account). Do not change remote or identity without checking with the owner.
- **Env vars** are validated lazily by `getEnv()` in `lib/env.ts` (build and CI don't need secrets; runtime fails fast). Every variable must also be documented in `.env.example`. Next loads `.env.local` itself at runtime; standalone scripts (`db:check`, `drizzle.config.ts`) load `.env.local` then `.env` **explicitly** — plain `dotenv/config` reads only `.env`.
- **Better Auth** (`lib/auth.ts`) is created lazily via `getAuth()` and the API route resolves it per request, so build/CI never need secrets (D-016). Regenerate auth tables with `pnpm dlx auth@latest generate --config lib/auth-cli.ts --output db/auth-schema.ts` (run it with `.env.local` loaded in the shell); `db/auth-schema.ts` is generated — never hand-edit it, configure in `lib/auth.ts` instead.
- **Session reads are server-only and live under `<Suspense>`**: use `getOptionalUser()` / `requireUser()` from `lib/session.ts` (`"use cache: private"` pattern of the Next 16 caching guide). Transactional emails go through `lib/email.ts` and are scheduled with `after()`; without `RESEND_API_KEY` they log to the console (dev). `proxy.ts` only does the optimistic cookie check.

## Conventions

- Code identifiers, types and file names in English; comments and docs in Spanish; UI copy in Spanish, centralized in `messages/es.ts` (neutral Spanish, warm tone, no jargon).
- Structure: `app/` routes · `features/<module>/` module logic (queries, actions, schemas, components) · `components/ui/` shadcn primitives · `components/` app-wide components · `db/` Drizzle · `lib/` utilities.
- Mutations are Server Actions with Zod validation + server-side authorization on every action. Route Handlers only for webhooks/uploads.
- DB tables/columns in `snake_case` (drizzle `casing: "snake_case"`); IDs `cuid2` (spec §6).
- Design tokens and rules: spec §8. Mobile first; touch targets ≥ 44px; `prefers-reduced-motion` respected globally in `globals.css`.
- Accessibility bar: WCAG 2.2 AA. Lighthouse ≥ 90 (performance + accessibility, mobile) at launch.
- Commits: short, in Spanish, imperative, scoped (`feat(ui): ...`). Never commit secrets; `.env*` is gitignored except `.env.example`.

## Environment / services

Free tiers only (spec §4). Neon (Postgres), Vercel Hobby, Cloudflare R2, Resend, Better Auth with Google OAuth. Account setup is done step by step with the owner when the phase needs it. Do not create paid resources.

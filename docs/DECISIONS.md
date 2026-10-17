# DECISIONS — Ovillo

Decisiones técnicas, en orden cronológico (spec §10: ante ambigüedad, decidir y registrar acá en vez de frenar).

## 2026-10-16

- **D-001 — Next.js 16 (App Router), no 15.** Es el LTS activo; Next 15 entra en EOL el 21/10/2026. Turbopack es el default de la versión.
- **D-002 — pnpm como gestor de paquetes.** Ya instalado (10.x) en la máquina del dueño; reproducible y veloz. Nota: pnpm 10 bloquea scripts `postinstall` por defecto; si una dependencia los necesita (p. ej. `sharp`), correr `pnpm approve-builds`.
- **D-003 — Sin carpeta `src/`.** La estructura sigue la spec §10: `app/`, `components/`, `features/<módulo>/`, `db/`, `lib/`.
- **D-004 — Validación de env con Zod salteada durante el build.** `lib/env.ts` no exige secretos reales cuando `NEXT_PHASE=phase-production-build` (CI y builds no dependen de credenciales); en runtime valida todo y falla temprano.

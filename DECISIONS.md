# Decisions

Short, dated records of dependency and architecture decisions that are not obvious from git history.

## 2026-09-22 — vitest 4 → 5 (Dependabot #30)

- Bumped `vitest` 4.1.11 → 5.0.1 (devDependency), squash-merged as dc0c3d2.
- Evidence: the `ci` workflow runs `npm run typecheck` + `vitest run`; on the PR head, vitest v5.0.1 ran 4 files / 47 tests, all passing.
- No `vitest.config.*` exists, so no config migration was needed; defaults cover `test/`.
- Revisit if a vitest config is added or tests move into the workerd pool (`@cloudflare/vitest-pool-workers` pins its own vitest range).

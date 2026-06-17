# dbc-forge

Strict, embeddable DBC ↔ Excel communication matrix toolchain.

See [docs/dbc-forge-design.md](docs/dbc-forge-design.md) for the design spec and
[docs/superpowers/plans/2026-06-17-dbc-forge-implementation.md](docs/superpowers/plans/2026-06-17-dbc-forge-implementation.md)
for the implementation plan.

## Quick start (after Phase 8)

```bash
pnpm install
pnpm build
pnpm --filter @dbc-forge/cli build
node packages/cli/dist/main.js build input.xlsx -o output.dbc
```

## Status

Phase 0 — bootstrap. See implementation plan for progress.

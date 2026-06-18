# Changelog

## 0.1.0 (unreleased)

### Features

- **Core library** (`@dbc-forge/core`):
  - `parseDbc` / `writeDbc` — full DBC parser and writer (hand-written, zero third-party DBC deps)
  - `parseExcelAsync` / `writeExcel` — Vector CANdb++ Excel matrix I/O (exceljs)
  - `validate` — strict validator with 37 rules across Network, Node, Message, Signal, Mux, Value Table, and Attribute categories
  - `diff` / `renderDiff` — semantic diff with bit-range rename detection; text and JSON output
  - Pure-function design: no fs, no console, no process (embeddable in Electron, etc.)
- **CLI** (`@dbc-forge/cli`):
  - `build` — Excel → DBC with strict validation
  - `extract` — DBC → Excel with permissive validation
  - `diff` — semantic diff between two networks
  - `validate` — strict validation report
  - Chinese error messages; structured exit codes (0/1/2/3)
- **Test coverage** — 285 tests; line coverage ≥ 90%, branch coverage ≥ 80%
- **5-stage quality gate** — format check, lint, typecheck, test+coverage, round-trip

### Frozen Decisions

- ⚠️1 Vector 矩阵 column-map (5 sheets, mux + VT encoding) — frozen in `column-map.ts`
- ⚠️2 build/extract/diff strict mode policy — frozen in `core/README.md`
- ⚠️3 CSV removed from MVP — frozen in design spec
- ⚠️4 signal.overlap rules (switch exclusive, mux bucket grouping) — frozen in `signal.ts` JSDoc
- ⚠️5 BA_DEF_ build-mode auto-completion — implemented in `dbc/writer.ts` (was placeholder through Phase 8)
- ⚠️6 coverage threshold (line 90% / branch 80% per backout criterion) — frozen in `vitest.config.ts`

### Known Limitations

- J1939 / NMEA 2000 transport layer not supported (YAGNI)
- EV_ / ENVVAR_DATA_ environment variables not supported (YAGNI)
- Branch coverage at 80.84% (above the 80% floor; further coverage gains require deep syntax-edge case tests)

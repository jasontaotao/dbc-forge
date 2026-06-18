# Changelog

## 0.1.1

### Bug fixes

- **parser**: `CM_` is a single-line DBC statement terminated by `;`. The previous parser set an `inCm` flag on every `CM_` that was only cleared by a blank line, which made any non-empty line after `CM_ ...;` (e.g. `BO_`, `BA_DEF_`, `SG_MUL_VAL_`) get re-routed through `parseCmLine` and throw "malformed CM_ at line 0:1". Triggered by every DBC with consecutive `CM_` lines followed directly by another keyword (real-world hit: E51 PT_CAN-BMS.dbc). Removed the dead multi-line `CM_` segment state.
- **excel reader**: tolerate Vector private IDs (>0x1FFFFFFF) and large DLCs (>8) at parse time. The hard reject at the reader stage was asymmetric with the DBC parser (which accepts any u32 id / any dlc), so a DBC→Excel→DBC round-trip always failed when the source contained Vector private ID space (e.g. J1939 / 0xC0000000) or non-standard DLC (e.g. UDS VIN with dlc=17). Validation still flags both rules as warnings via `validate/rules/message-id-range` and `validate/rules/message-dlc-range`.
- **writer**: emit `CM_` from per-object `.comment` fields with `(scope, target, text)` three-key dedup. Previously, `parseCmLine` only wrote to `net.comments`, never to the corresponding `message.comment` / `signal.comment` / `node.comment`, so round-trip produced an Excel with empty Comment columns and a DBC with no `CM_`. The writer's earlier dedup key (`${kind}|${text}`) also collapsed 57/205 `CM_` on the E51 DBC by treating identical text on different scopes as duplicates (Vector tools routinely paste the same data-dictionary paragraph onto 20+ messages — each is a legal independent `CM_`).

### Features

- **cli**: `extract` now decodes DBC files as GBK (CP936) when the source contains high bytes. Vector CANdb++ on Chinese Windows saves DBC files in the system ANSI code page, not UTF-8; reading as utf-8 turned every GBK byte into U+FFFD and destroyed all Chinese comments and unit strings (e.g. `℃` → `��C`). Detection is a single-byte probe; ASCII-only files skip the GBK round-trip. Adds `iconv-lite` as a CLI dependency.

### Test coverage

- 285 → 288 tests; line 91.6% → 91.7%; branch 80.82% → 81.23% (3 new regression tests for the parser, reader, and writer fixes).

## 0.1.0

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

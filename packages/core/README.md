# @dbc-forge/core

Pure-function library for DBC ↔ Excel communication matrix conversion. No fs, no console, no process.

## Public API: parseExcelAsync vs parseExcel

The Excel reader uses [`exceljs`](https://www.npmjs.com/package/exceljs), which
is async-only. The public entry point is therefore:

```ts
import { parseExcelAsync } from '@dbc-forge/core';
const net = await parseExcelAsync(buffer);
```

A sync `parseExcel` is exported as a documented placeholder that throws — the
plan task 9.11.1 tracks the sync shim. The Excel schema (column-map.ts,
frozen ⚠️1) is the single source of truth; readers and the upcoming writer
both derive their column ordering from it.

## Policy: Attribute Definition (BA_DEF_) auto-completion

⚠️5 frozen 2026-06-18. Two paths:

1. **build (Excel → DBC)**: when a message is assigned a well-known attribute
   (e.g. `GenMsgCycleTime`) but the DBC has no `BA_DEF_` for it, the writer
   emits both `BA_DEF_` and `BA_DEF_DEF_` for the missing attribute, then the
   `BA_` assignment. A warning is added to the build report.
2. **extract (DBC → Excel)**: the reader preserves whatever `BA_DEF_` set the
   input has. It does NOT auto-emit missing `BA_DEF_` rows. Custom attributes
   pass through with their types as encountered.

This asymmetry is intentional: build protects the writer (no schema = no place
to put the value), extract protects the round-trip (no silent augmentation).

## Policy: build vs extract strictness

⚠️2 frozen 2026-06-18.

- `validate(network, { mode: 'build' })` returns errors that fail the command.
- `validate(network, { mode: 'extract' })` returns errors as warnings (the
  DBC is preserved as-is; the writer may still refuse if it cannot express
  the structure).
- `validate(network, { mode: 'diff' })` returns both as warnings; the diff
  surfaces the structural difference.
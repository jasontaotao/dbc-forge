# cantools interop test (Phase 9.5 Task 9.5.5)

This directory ships the **scaffold** for a Python-based cantools
interoperability check. It is intentionally excluded from the default
`pnpm ci` gate because it requires a Python venv + `pip install` step
that's orthogonal to the Node-side workflow.

## Purpose

`cantools` is the de-facto reference implementation for CAN database
parsing in the Python ecosystem. Round-tripping our DBC output through
it catches two classes of bugs:

1. The DBC writer emits a Vector-flavoured DBC that cantools can't parse
   (whitespace, quoting, attribute encodings).
2. Information is lost when our `Network → DBC → cantools → DBC' → Network`
   chain is exercised end-to-end.

## How to run locally

```sh
python -m venv .venv
source .venv/bin/activate          # or .venv\Scripts\activate on Windows
pip install -r tests/interop/requirements.txt
python tests/interop/test_with_cantools.py
```

The script prints one line per fixture and exits non-zero on the first
regression. Wire it into CI as a separate job (a thin `setup-python` step
that runs the script) — the default `pnpm ci` gate does not need it.

## What it checks

For each `samples/valid/<name>/input.xlsx`:

1. The dbc-forge CLI converts it to a temporary `.dbc` file.
2. cantools loads that `.dbc`, dumps it back, and re-parses the dump.
3. The script verifies the per-message and per-signal counts are stable
   across the cantools round-trip.

## When to re-run

- After any change to `packages/core/src/dbc/parser.ts` or
  `packages/core/src/dbc/writer.ts`.
- Before a release cut (the Phase 9.6 release prep runs this on the
  release branch).

## Limitations

- The script does **not** verify that our Network and cantools' parsed
  Network are semantically equal — only that the DBC survives a cantools
  round-trip. Full equality would require building a Python-side Network
  model in line with our TypeScript one, which is out of scope for the
  scaffold.
- Strict mode is disabled (`strict=False`) so it tolerates minor DBC
  dialect differences. The CI job in Phase 9.6 can flip this on once
  the project requires strict cantools compatibility.

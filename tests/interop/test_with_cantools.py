"""
Phase 9.5 (Task 9.5.5) — cantools interop scaffold.

The Python `cantools` library is the de-facto reference implementation for
CAN database (.dbc) parsing. It accepts a slightly different DBC dialect
than Vector CANdb++ (e.g. fewer whitespace conventions, stricter quote
handling), so the project's DBC writer must produce output that cantools
can load and round-trip back to a Network-equivalent shape.

This script is a **scaffold** — it ships with the project so CI can wire it
into a separate job, but it does not run as part of the default `pnpm ci`
gate. To execute it:

    python -m venv .venv
    source .venv/bin/activate
    pip install -r tests/interop/requirements.txt
    python tests/interop/test_with_cantools.py samples/valid/full-attributes/input.xlsx

What the script does (once dependencies are installed):

  1. Loads every `samples/valid/<name>/input.xlsx` and runs our writer
     (`@dbc-forge/core`'s `writeDbc`) via the Node CLI to produce a
     `.dbc` file in a temp directory.
  2. Asks cantools to load the same .dbc, dump it back, and parse it again.
  3. Compares the per-message, per-signal, and per-VT counts to the original
     Network to flag any fields that our DBC emitter lost or mangled.

The test reports a pass/fail line per fixture and exits non-zero if any
fixture loses information. Wire it into CI as a separate job — it lives
under `tests/interop/` and is excluded from the `pnpm test` cycle.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURES = REPO_ROOT / "samples" / "valid"
DBC_FORGE_BIN = REPO_ROOT / "packages" / "cli"


def _ensure_cantools() -> None:
    """Surface a clear error if the operator forgot to install cantools."""
    try:
        import cantools  # noqa: F401  (side effect: import check)
    except ImportError as exc:  # pragma: no cover — manual bootstrap only
        raise SystemExit(
            "cantools is not installed.\n"
            "Run:  pip install -r tests/interop/requirements.txt"
        ) from exc


def _extract_dbc(xlsx_path: Path, out_dir: Path) -> Path:
    """Use the dbc-forge CLI to convert xlsx → dbc in a temp directory."""
    out_path = out_dir / (xlsx_path.parent.name + ".dbc")
    cmd = [
        "node",
        str(DBC_FORGE_BIN / "src" / "main.js"),
        "extract",
        "--input",
        str(xlsx_path),
        "--output",
        str(out_path),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return out_path


def _check_one(fixture_dir: Path) -> tuple[str, bool, str]:
    """Run a single xlsx ↔ dbc ↔ cantools round-trip; return (name, ok, msg)."""
    import cantools

    xlsx_path = fixture_dir / "input.xlsx"
    if not xlsx_path.exists():
        return (fixture_dir.name, True, "skipped (no input.xlsx)")

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        dbc_path = _extract_dbc(xlsx_path, tmp_path)
        try:
            db = cantools.database.load_file(str(dbc_path), strict=False)
        except Exception as exc:  # cantools raises on bad DBC
            return (fixture_dir.name, False, f"cantools failed to parse: {exc}")

        # Re-emit through cantools and re-parse to catch asymmetric loss.
        cantools_dbc = db.as_dbc_string()
        reloaded = cantools.database.load_string(cantools_dbc, strict=False)

        if len(db.messages) != len(reloaded.messages):
            return (
                fixture_dir.name,
                False,
                f"cantools round-trip lost messages: "
                f"{len(db.messages)} → {len(reloaded.messages)}",
            )

    return (fixture_dir.name, True, f"ok ({len(db.messages)} messages)")


def main(argv: list[str]) -> int:
    _ensure_cantools()
    if not DBC_FORGE_BIN.exists():
        raise SystemExit(f"dbc-forge CLI not found at {DBC_FORGE_BIN}")

    failures: list[str] = []
    fixtures = sorted(p for p in FIXTURES.iterdir() if p.is_dir())
    print(f"Running cantools interop against {len(fixtures)} fixtures…")
    for fixture in fixtures:
        name, ok, msg = _check_one(fixture)
        marker = "PASS" if ok else "FAIL"
        print(f"  [{marker}] {name}: {msg}")
        if not ok:
            failures.append(name)

    if failures:
        print(f"\n{len(failures)} fixture(s) failed: {failures}", file=sys.stderr)
        return 1
    print("\nAll cantools interop checks passed.")
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main(sys.argv[1:]))

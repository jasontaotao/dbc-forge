# @dbc-forge/cli

Command-line tool for converting between Vector CANdb++ Excel communication matrices and DBC files.

## Install

```bash
pnpm add -g @dbc-forge/cli
```

## Usage

```bash
dbc-forge build    <input.xlsx>  -o <output.dbc>   [--no-validate] [--quiet]
dbc-forge extract  <input.dbc>   -o <output.xlsx>  [--no-validate] [--quiet]
dbc-forge diff     <a> <b>       [--format text|json] [-o report]
dbc-forge validate <input>
```

Exit codes:
- `0` — success
- `1` — validation or parse error
- `2` — I/O error (file not found, permission denied, etc.)
- `3` — usage error (missing required argument, invalid flag)

## Examples

Build a DBC from an Excel matrix:
```bash
dbc-forge build matrix.xlsx -o output.dbc
```

Extract an Excel matrix from a DBC:
```bash
dbc-forge extract network.dbc -o matrix.xlsx
```

Compare two networks:
```bash
dbc-forge diff baseline.xlsx modified.xlsx --format text
```

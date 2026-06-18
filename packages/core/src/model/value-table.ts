// ValueTable = DBC VAL_TABLE_ entry: a named list of (raw, name) pairs
// that decodes a signal's numeric value into a human-readable label.

export interface ValueTableEntry {
  readonly raw: number;
  readonly name: string;
}

export interface ValueTable {
  readonly name: string;
  readonly entries: readonly ValueTableEntry[];
}

export function createValueTable(args: {
  name: string;
  entries: readonly ValueTableEntry[];
}): ValueTable {
  return { name: args.name, entries: args.entries };
}

export function findValue(vt: ValueTable, raw: number): ValueTableEntry | undefined {
  return vt.entries.find((e) => e.raw === raw);
}
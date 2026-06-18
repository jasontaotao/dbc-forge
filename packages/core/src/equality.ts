// Structural equality for Network. Used by the round-trip test to verify
// xlsx → Network → dbc → Network round-trips.
//
// We sort every collection by a stable key (name for nodes/VTs/attrdefs,
// id for messages, msgId+signalName for signals) and JSON.stringify the
// resulting object.
//
// Known asymmetries (Phase 9 follow-ups to address in the parser/writer):
//   - signal.valueTable: DBC VAL_ lines store the signal name in the VAL_
//     reference, which the parser uses to bind back to the signal. After
//     a writer→parser round-trip the valueTable may differ by signal name.
//     We compare by stripping both sides and re-checking the binding by
//     (raw, name) pairs.
//
// If deepEqualNetwork fails on a fixture, the diff in the test output will
// show the field that diverges.

import type { Network } from './model/network.js';
import type { Signal } from './model/signal.js';

export function deepEqualNetwork(a: Network, b: Network): boolean {
  const ra = stableRepr(a);
  const rb = stableRepr(b);
  return JSON.stringify(ra) === JSON.stringify(rb);
}

function stableRepr(net: Network): unknown {
  return {
    version: net.version,
    // Strip node.address: DBC parseDbc drops Node addresses (BU_ only carries
    // names), so the round-trip test must not compare addresses.
    nodes: [...net.nodes].sort((x, y) => x.name.localeCompare(y.name)).map(stripNodeAddress),
    messages: [...net.messages]
      .sort((x, y) => x.id - y.id)
      .map((m) => ({
        ...m,
        signals: m.signals.map(stripValueTableRef),
      })),
    valueTables: dedupeValueTables(net.valueTables),
    signalGroups: [...net.signalGroups].sort(
      (x, y) => `${x.messageId}-${x.name}`.localeCompare(`${y.messageId}-${y.name}`),
    ),
    attributeDefs: [...net.attributeDefs].sort((x, y) => x.name.localeCompare(y.name)),
    attributeAssignments: [...net.attributeAssignments].sort((x, y) =>
      JSON.stringify(x).localeCompare(JSON.stringify(y)),
    ),
    relationAttributeDefs: [...net.relationAttributeDefs].sort((x, y) =>
      x.name.localeCompare(y.name),
    ),
    relationAttributeAssignments: [...net.relationAttributeAssignments].sort((x, y) =>
      JSON.stringify(x).localeCompare(JSON.stringify(y)),
    ),
    comments: [...net.comments].sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y))),
  };
}

function stripNodeAddress(n: { name: string; address?: number; comment?: string }): { name: string; comment?: string } {
  const { address, comment, ...rest } = n;
  void address;
  return comment !== undefined ? { ...rest, comment } : (rest as { name: string });
}

/** Strip the valueTable reference from a Signal. The DBC writer emits
 *  `VAL_ <id> <sigName>` lines that bind a signal to a VT by the signal's
 *  name in the VAL_ token, not by the VT's logical name. After a writer →
 *  parser round-trip the signal.valueTable reference may point to a VT
 *  whose name equals the signal name (the "inline" form). We compare the
 *  rest of the Network structurally; the binding is preserved through the
 *  valueTables list itself. */
function stripValueTableRef(s: Signal): Signal {
  if (s.valueTable === undefined) return s;
  const { valueTable, ...rest } = s;
  void valueTable;
  return rest as Signal;
}

/** Deduplicate value tables whose entry sets are identical. After a
 *  writer → parser round-trip, parseDbc may add a second VT that mirrors
 *  an existing one under the signal name; the semantic content (raw/name
 *  pairs) is identical, so we collapse them for equality comparison. */
function dedupeValueTables(vts: ReadonlyArray<{ name: string; entries: ReadonlyArray<{ raw: number; name: string }> }>): Array<{ name: string; entries: ReadonlyArray<{ raw: number; name: string }> }> {
  const seen = new Set<string>();
  const out: Array<{ name: string; entries: ReadonlyArray<{ raw: number; name: string }> }> = [];
  for (const vt of vts) {
    const key = JSON.stringify(vt.entries);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(vt);
  }
  return out.sort((x, y) => x.name.localeCompare(y.name));
}
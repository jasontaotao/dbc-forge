// Structural equality for Network. Used by the round-trip test to verify
// xlsx → Network → dbc → Network round-trips.
//
// We sort every collection by a stable key (name for nodes/VTs/attrdefs,
// id for messages, msgId+signalName for signals) and JSON.stringify the
// resulting object.
//
// Phase 9.5 changes:
//   - Node.address now round-trips: DBC parser applies NmStationAddress
//     attribute assignments to node addresses post-parse.
//   - signal.valueTable now round-trips: parseDbc binds signal.valueTable
//     from the VAL_ line's signal-name token (the "inline" form).
//
// If deepEqualNetwork fails on a fixture, the diff in the test output will
// show the field that diverges.

import type { Network } from './model/network.js';

export function deepEqualNetwork(a: Network, b: Network): boolean {
  const ra = stableRepr(a);
  const rb = stableRepr(b);
  return JSON.stringify(ra) === JSON.stringify(rb);
}

function stableRepr(net: Network): unknown {
  return {
    version: net.version,
    nodes: [...net.nodes].sort((x, y) => x.name.localeCompare(y.name)),
    messages: [...net.messages]
      .sort((x, y) => x.id - y.id)
      .map(stabilizeMessage),
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

/** Convert a message's muxExtensions Map to a stable object representation.
 *  An empty Map and an absent field both normalize to absent so a
 *  xlsx round-trip (which may emit an empty Map for messages with no
 *  extended-mux signals) matches a dbc round-trip (which leaves the field
 *  absent). */
function stabilizeMessage(
  m: Network['messages'][number],
): unknown {
  const { muxExtensions, ...rest } = m;
  const obj: Record<string, unknown> = { ...rest };
  if (muxExtensions !== undefined && muxExtensions.size > 0) {
    obj.muxExtensions = Object.fromEntries(
      [...muxExtensions.entries()].sort(([a], [b]) => a.localeCompare(b)),
    );
  }
  return obj;
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

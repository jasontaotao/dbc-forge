// Semantic diff between two Networks. Produces a DiffReport of per-entity
// changes. Pairing keys (by name for nodes/VT/attrdefs, by ID for messages,
// by (msgId, signalName) for signals) and signal rename detection live here.

import type {
  AttributeAssignment,
  RelationAttributeAssignment,
} from '../model/attributes/attribute.js';
import type { Message } from '../model/message.js';
import type { Network } from '../model/network.js';
import type { Node } from '../model/node.js';
import type { Signal } from '../model/signal.js';
import type { ValueTable } from '../model/value-table.js';

import type { DiffChange, DiffReport, FieldDiff } from './types.js';

/** Top-level entry point: returns the diff between two Networks. */
export function diff(a: Network, b: Network): DiffReport {
  const changes: DiffChange[] = [];
  changes.push(...pairNodes(a, b));
  changes.push(...pairMessages(a, b));
  changes.push(...pairSignals(a, b));
  changes.push(...pairValueTables(a, b));
  changes.push(...pairAttributeDefs(a, b));
  changes.push(...pairAttributeAssignments(a, b));
  changes.push(...pairRelationAttributeAssignments(a, b));

  const summary = computeSummary(changes);
  return { summary, changes };
}

function computeSummary(changes: DiffChange[]): DiffReport['summary'] {
  return {
    messagesAdded: changes.filter((c) => c.kind === 'message-added').length,
    messagesRemoved: changes.filter((c) => c.kind === 'message-removed').length,
    messagesChanged: changes.filter((c) => c.kind === 'message-changed').length,
    signalsAdded: changes.filter((c) => c.kind === 'signal-added').length,
    signalsRemoved: changes.filter((c) => c.kind === 'signal-removed').length,
    signalsChanged: changes.filter((c) => c.kind === 'signal-changed').length,
    attributesChanged: changes.filter(
      (c) =>
        c.kind === 'attr-value-changed' ||
        c.kind === 'attr-def-changed' ||
        c.kind === 'attr-def-added' ||
        c.kind === 'attr-def-removed',
    ).length,
  };
}

function diffFields<T extends object>(a: T, b: T, fields: ReadonlyArray<keyof T>): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  for (const f of fields) {
    if (JSON.stringify(a[f]) !== JSON.stringify(b[f])) {
      diffs.push({ field: String(f), before: a[f], after: b[f] });
    }
  }
  return diffs;
}

function pairNodes(a: Network, b: Network): DiffChange[] {
  const changes: DiffChange[] = [];
  const aMap = new Map(a.nodes.map((n) => [n.name, n] as const));
  const bMap = new Map(b.nodes.map((n) => [n.name, n] as const));
  for (const [name, nodeA] of aMap) {
    if (!bMap.has(name)) {
      changes.push({ kind: 'node-removed', node: nodeA });
    } else {
      const nodeB = bMap.get(name)!;
      const diffs = diffFields(nodeA, nodeB, ['address', 'comment'] as (keyof Node)[]);
      if (diffs.length > 0) {
        changes.push({
          kind: 'attr-value-changed',
          target: `node:${name}`,
          key: 'node-properties',
          before: diffs[0]!.before as string | number | undefined,
          after: diffs[0]!.after as string | number | undefined,
        });
      }
    }
  }
  for (const [name, nodeB] of bMap) {
    if (!aMap.has(name)) {
      changes.push({ kind: 'node-added', node: nodeB });
    }
  }
  return changes;
}

function pairMessages(a: Network, b: Network): DiffChange[] {
  const changes: DiffChange[] = [];
  const aMap = new Map(a.messages.map((m) => [m.id, m] as const));
  const bMap = new Map(b.messages.map((m) => [m.id, m] as const));
  for (const [id, msgA] of aMap) {
    if (!bMap.has(id)) {
      changes.push({ kind: 'message-removed', message: msgA });
    } else {
      const msgB = bMap.get(id)!;
      const diffs = diffFields(msgA, msgB, [
        'name',
        'dlc',
        'transmitter',
        'isExtended',
        'additionalTransmitters',
        'comment',
      ] as (keyof Message)[]);
      if (diffs.length > 0) {
        changes.push({ kind: 'message-changed', id, fieldDiffs: diffs });
      }
    }
  }
  for (const [id, msgB] of bMap) {
    if (!aMap.has(id)) {
      changes.push({ kind: 'message-added', message: msgB });
    }
  }
  return changes;
}

function pairSignals(a: Network, b: Network): DiffChange[] {
  const changes: DiffChange[] = [];
  // Build maps of all signals by (messageId, name)
  const aSigs = new Map<string, { messageId: number; signal: Signal }>();
  for (const m of a.messages) {
    for (const s of m.signals) {
      aSigs.set(`${m.id}|${s.name}`, { messageId: m.id, signal: s });
    }
  }
  const bSigs = new Map<string, { messageId: number; signal: Signal }>();
  for (const m of b.messages) {
    for (const s of m.signals) {
      bSigs.set(`${m.id}|${s.name}`, { messageId: m.id, signal: s });
    }
  }

  // Pair by key: changes vs. removed/added candidates.
  const removed: { messageId: number; signal: Signal }[] = [];
  const added: { messageId: number; signal: Signal }[] = [];
  for (const [k, v] of aSigs) {
    if (!bSigs.has(k)) {
      removed.push(v);
    } else {
      const bSig = bSigs.get(k)!;
      const diffs = diffFields(v.signal, bSig.signal, [
        'startBit',
        'length',
        'byteOrder',
        'valueType',
        'factor',
        'offset',
        'min',
        'max',
        'unit',
        'multiplexed',
        'valueTable',
        'comment',
      ] as (keyof Signal)[]);
      if (diffs.length > 0) {
        changes.push({
          kind: 'signal-changed',
          messageId: v.messageId,
          name: v.signal.name,
          fieldDiffs: diffs,
        });
      }
    }
  }
  for (const [k, v] of bSigs) {
    if (!aSigs.has(k)) {
      added.push(v);
    }
  }

  // Rename detection: removed+added pairs with same bit range + type + scale.
  for (const r of removed) {
    const renameMatch = added.find(
      (x) =>
        x.messageId === r.messageId &&
        x.signal.startBit === r.signal.startBit &&
        x.signal.length === r.signal.length &&
        x.signal.byteOrder === r.signal.byteOrder &&
        x.signal.valueType === r.signal.valueType &&
        x.signal.factor === r.signal.factor &&
        x.signal.offset === r.signal.offset,
    );
    if (renameMatch) {
      changes.push({
        kind: 'signal-renamed?',
        messageId: r.messageId,
        from: r.signal.name,
        to: renameMatch.signal.name,
      });
      // Remove from added so it's not also reported as added.
      const idx = added.indexOf(renameMatch);
      if (idx >= 0) added.splice(idx, 1);
    } else {
      changes.push({ kind: 'signal-removed', messageId: r.messageId, signal: r.signal });
    }
  }
  for (const x of added) {
    changes.push({ kind: 'signal-added', messageId: x.messageId, signal: x.signal });
  }
  return changes;
}

function pairValueTables(a: Network, b: Network): DiffChange[] {
  // Compare entries by name; emit attr-value-changed for differences.
  const changes: DiffChange[] = [];
  const aMap = new Map(a.valueTables.map((v) => [v.name, v] as const));
  const bMap = new Map(b.valueTables.map((v) => [v.name, v] as const));
  for (const [name, vtA] of aMap) {
    if (!bMap.has(name)) {
      changes.push({
        kind: 'attr-value-changed',
        target: `valuetable:${name}`,
        key: 'value-table',
        before: vtA as unknown as string,
        after: undefined,
      });
    } else {
      const vtB = bMap.get(name)!;
      if (JSON.stringify(vtA.entries) !== JSON.stringify(vtB.entries)) {
        changes.push({
          kind: 'attr-value-changed',
          target: `valuetable:${name}`,
          key: 'value-table-entries',
          before: JSON.stringify(vtA.entries) as unknown as string,
          after: JSON.stringify(vtB.entries) as unknown as string,
        });
      }
    }
  }
  for (const [name, vtB] of bMap) {
    if (!aMap.has(name)) {
      changes.push({
        kind: 'attr-value-changed',
        target: `valuetable:${name}`,
        key: 'value-table',
        before: undefined,
        after: vtB as unknown as string,
      });
    }
  }
  return changes;
}

function pairAttributeDefs(a: Network, b: Network): DiffChange[] {
  const changes: DiffChange[] = [];
  const aMap = new Map(a.attributeDefs.map((d) => [d.name, d] as const));
  const bMap = new Map(b.attributeDefs.map((d) => [d.name, d] as const));
  for (const [name, defA] of aMap) {
    if (!bMap.has(name)) {
      changes.push({ kind: 'attr-def-removed', name, before: defA });
    } else {
      const defB = bMap.get(name)!;
      if (JSON.stringify(defA) !== JSON.stringify(defB)) {
        changes.push({ kind: 'attr-def-changed', name, before: defA, after: defB });
      }
    }
  }
  for (const [name, defB] of bMap) {
    if (!aMap.has(name)) {
      changes.push({ kind: 'attr-def-added', name, after: defB });
    }
  }
  return changes;
}

function pairAttributeAssignments(a: Network, b: Network): DiffChange[] {
  const changes: DiffChange[] = [];
  const keyOf = (x: AttributeAssignment) => `${x.name}|${targetKey(x.target)}`;
  const aMap = new Map(a.attributeAssignments.map((x) => [keyOf(x), x] as const));
  const bMap = new Map(b.attributeAssignments.map((x) => [keyOf(x), x] as const));
  for (const [k, va] of aMap) {
    if (!bMap.has(k)) {
      changes.push({
        kind: 'attr-value-changed',
        target: k,
        key: va.name,
        before: va.value,
        after: undefined,
      });
    } else {
      const vb = bMap.get(k)!;
      if (va.value !== vb.value) {
        changes.push({
          kind: 'attr-value-changed',
          target: k,
          key: va.name,
          before: va.value,
          after: vb.value,
        });
      }
    }
  }
  for (const [k, vb] of bMap) {
    if (!aMap.has(k)) {
      changes.push({
        kind: 'attr-value-changed',
        target: k,
        key: vb.name,
        before: undefined,
        after: vb.value,
      });
    }
  }
  return changes;
}

function targetKey(t: AttributeAssignment['target']): string {
  if (t.kind === 'network') return 'network';
  if (t.kind === 'message') return `msg:${t.messageId}`;
  if (t.kind === 'signal') return `sig:${t.messageId}|${t.signalName}`;
  return `node:${t.nodeName}`;
}

function pairRelationAttributeAssignments(a: Network, b: Network): DiffChange[] {
  // Similar pattern, treat as attr-value-changed.
  const changes: DiffChange[] = [];
  const keyOf = (r: RelationAttributeAssignment) => {
    const target =
      r.target.kind === 'node-signal'
        ? `ns:${r.target.nodeName}|${r.target.messageId}|${r.target.signalName}`
        : `nm:${r.target.nodeName}|${r.target.messageId}`;
    return `${r.name}|${target}`;
  };
  const aMap = new Map(a.relationAttributeAssignments.map((x) => [keyOf(x), x] as const));
  const bMap = new Map(b.relationAttributeAssignments.map((x) => [keyOf(x), x] as const));
  for (const [k, va] of aMap) {
    if (!bMap.has(k)) {
      changes.push({
        kind: 'attr-value-changed',
        target: `rel:${k}`,
        key: va.name,
        before: va.value,
        after: undefined,
      });
    } else {
      const vb = bMap.get(k)!;
      if (va.value !== vb.value) {
        changes.push({
          kind: 'attr-value-changed',
          target: `rel:${k}`,
          key: va.name,
          before: va.value,
          after: vb.value,
        });
      }
    }
  }
  for (const [k, vb] of bMap) {
    if (!aMap.has(k)) {
      changes.push({
        kind: 'attr-value-changed',
        target: `rel:${k}`,
        key: vb.name,
        before: undefined,
        after: vb.value,
      });
    }
  }
  return changes;
}

// Suppress unused-import warning for ValueTable — the type is referenced
// via DiffChange.target/key indirection but keeping the import documents intent.
export type _ValueTableRef = ValueTable;

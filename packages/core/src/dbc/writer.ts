// DBC writer — top-level entry point.
// Phase 3 ships the writer in pieces. Each commit adds one or more section
// emitters; the orchestrator (writeDbc) is fixed at the start and never
// changes shape. All sections are joined with a blank line and a trailing
// newline is appended for tool friendliness.

import type {
  AttributeAssignment, AttributeDef, AttributeTargetRef,
  AttrType, AttrValue, RelationAttributeAssignment,
} from '../model/attributes/attribute.js';
import type { Message } from '../model/message.js';
import type { Network } from '../model/network.js';
import type { Signal } from '../model/signal.js';
import type { ValueTable } from '../model/value-table.js';

export type WriteMode = 'build' | 'extract';

export interface WriteOptions {
  /** Build mode auto-emits missing BA_DEF_ for well-known attrs referenced
   *  in attributeAssignments; extract mode preserves whatever is in the
   *  Network. See core README ⚠️5 freeze. */
  mode?: WriteMode;
}

export function writeDbc(net: Network, opts: WriteOptions = {}): string {
  const mode = opts.mode ?? 'extract';
  const sections: string[] = [];

  // VERSION (always first)
  sections.push(`VERSION "${net.version}"`);

  // NS_ namespace descriptor — the canonical DBCplusplus / Vector list.
  // Identifiers are space-indented (4 spaces) and the block ends with a
  // blank line per the conventional format.
  sections.push(emitNsDesc());

  // BS_ (bus speed configuration block — always empty)
  sections.push('BS_:');

  // BU_ (node list)
  sections.push(emitBu(net));

  // VAL_TABLE_ section
  const valTables = emitValTables(net);
  if (valTables) sections.push(valTables);

  // BO_ (messages) + SG_ (signals) block.
  const messages = emitMessages(net);
  if (messages) sections.push(messages);

  // BO_TX_BU_ (additional transmitters)
  const boTxBu = emitBoTxBu(net);
  if (boTxBu) sections.push(boTxBu);

  // SIG_VALTYPE_ (signal data type qualifier)
  const sigValtype = emitSigValtype(net);
  if (sigValtype) sections.push(sigValtype);

  // SG_MUL_VAL_ (extended mux value lists)
  const sgMulVal = emitSgMulVal(net);
  if (sgMulVal) sections.push(sgMulVal);

  // VAL_ (signal value-to-label mappings)
  const val = emitVal(net);
  if (val) sections.push(val);

  // BA_DEF_ + BA_DEF_DEF_ (attribute declarations)
  const baDef = emitBaDef(net, mode);
  if (baDef) sections.push(baDef);

  // BA_DEF_REL_ + BA_DEF_DEF_REL_ (relation attribute declarations)
  const baDefRel = emitBaDefRel(net);
  if (baDefRel) sections.push(baDefRel);

  // BA_ (attribute assignments)
  const ba = emitBa(net);
  if (ba) sections.push(ba);

  // BA_REL_ (relation attribute assignments)
  const baRel = emitBaRel(net);
  if (baRel) sections.push(baRel);

  // SIG_GROUP_ (signal bundles)
  const sigGroup = emitSigGroup(net);
  if (sigGroup) sections.push(sigGroup);

  // CM_ (comments) — emitted last
  const cm = emitCm(net);
  if (cm) sections.push(cm);

  return sections.filter((s) => s.length > 0).join('\n\n') + '\n';
}

function emitNsDesc(): string {
  // The 28 DBCplusplus namespace identifiers. Each is space-indented to
  // match Vector CANdb++'s canonical output.
  return [
    'NS_ :',
    '    NS_DESC_',
    '    CM_',
    '    BA_DEF_',
    '    BA_',
    '    VAL_',
    '    CAT_DEF_',
    '    CAT_',
    '    FILTER',
    '    BA_DEF_DEF_',
    '    EV_DATA_',
    '    ENVVAR_DATA_',
    '    SGTYPE_',
    '    SGTYPE_VAL_',
    '    BA_DEF_SGTYPE_',
    '    BA_SGTYPE_',
    '    SIG_TYPE_REF_',
    '    VAL_TABLE_',
    '    SIG_GROUP_',
    '    SIG_VALTYPE_',
    '    SIGTYPE_VALTYPE_',
    '    BO_TX_BU_',
    '    BA_DEF_REL_',
    '    BA_REL_',
    '    BA_DEF_DEF_REL_',
    '    BU_SG_REL_',
    '    BU_EV_REL_',
    '    BU_BO_REL_',
    '    SG_MUL_VAL_',
  ].join('\n');
}

function emitBu(net: Network): string {
  if (net.nodes.length === 0) return 'BU_:';
  return 'BU_: ' + net.nodes.map((n) => n.name).join(' ');
}

function emitValTables(net: Network): string {
  if (net.valueTables.length === 0) return '';
  return net.valueTables.map((vt) => emitValTable(vt)).join('\n');
}

function emitValTable(vt: ValueTable): string {
  const entries = vt.entries.map((e) => ` ${e.raw} "${escapeQuotes(e.name)}"`).join('');
  return `VAL_TABLE_ ${vt.name}${entries} ;`;
}

function emitMessages(net: Network): string {
  if (net.messages.length === 0) return '';
  return net.messages.map((m) => emitMessage(m)).join('\n\n');
}

function emitMessage(m: Message): string {
  const header = `BO_ ${m.id} ${m.name}: ${m.dlc} ${m.transmitter}`;
  if (m.signals.length === 0) return header;
  const sigs = m.signals.map((s) => emitSignal(s)).join('\n');
  return `${header}\n${sigs}`;
}

function emitSignal(s: Signal): string {
  // Multiplex prefix: M | m<v> | M<v>m<v> | <empty>
  let prefix = `SG_ ${s.name}`;
  if (s.multiplexed.kind === 'Multiplexor') {
    prefix += ' M';
  } else if (s.multiplexed.kind === 'Muxed') {
    prefix += ` m${s.multiplexed.value}M`;
  } else if (s.multiplexed.kind === 'ExtendedMuxed') {
    // Vector format: M<v>m<v> — the M is uppercase when MUXOR, then the
    // extension value comes after with lowercase m. We follow the parser's
    // emission convention (uppercase first M, lowercase m with the value).
    prefix += ` M${s.multiplexed.value}m${s.multiplexed.value}`;
  }

  // @<order><sign>: 1 = little-endian (Intel), 0 = big-endian (Motorola)
  // valueType: + = unsigned, - = signed. (float/double use IEEE 754 in the
  // spec but we keep the same sign convention.)
  const order = s.byteOrder === 'little-endian' ? '1' : '0';
  const sign = s.valueType === 'signed' ? '-' : '+';

  const body = ` ${s.startBit}|${s.length}@${order}${sign} (${formatNumber(s.factor)},${formatNumber(s.offset)}) [${formatNumber(s.min)}|${formatNumber(s.max)}] "${escapeQuotes(s.unit)}" ${s.receivers.join(',')}`;
  return `${prefix} :${body}`;
}

function emitBoTxBu(net: Network): string {
  const lines: string[] = [];
  for (const m of net.messages) {
    if (m.additionalTransmitters.length > 0) {
      lines.push(`BO_TX_BU_ ${m.id} : ${m.additionalTransmitters.join(',')};`);
    }
  }
  return lines.join('\n');
}

function emitSigValtype(net: Network): string {
  const lines: string[] = [];
  for (const m of net.messages) {
    for (const s of m.signals) {
      if (s.valueTypeForSignal === 'Reserved') {
        lines.push(`SIG_VALTYPE_ ${m.id} ${s.name} : 1;`);
      }
    }
  }
  return lines.join('\n');
}

function emitSgMulVal(net: Network): string {
  const lines: string[] = [];
  for (const m of net.messages) {
    if (m.muxExtensions) {
      for (const [sigName, values] of m.muxExtensions) {
        lines.push(`SG_MUL_VAL_ ${m.id} ${sigName} ${values.join(' ')} ;`);
      }
    }
  }
  return lines.join('\n');
}

function emitVal(net: Network): string {
  const lines: string[] = [];
  for (const m of net.messages) {
    for (const s of m.signals) {
      if (s.valueTable) {
        const vt = net.valueTables.find((v) => v.name === s.valueTable);
        if (vt) {
          const entries = vt.entries.map((e) => ` ${e.raw} "${escapeQuotes(e.name)}"`).join('');
          lines.push(`VAL_ ${m.id} ${s.name}${entries} ;`);
        }
      }
    }
  }
  return lines.join('\n');
}

function emitBaDef(net: Network, mode: WriteMode): string {
  const defs = [...net.attributeDefs];
  if (mode === 'build') {
    // Auto-add well-known attr defs for any BA_ that references a name not
    // already declared. This is the ⚠️5 build-mode enhancement.
    const declared = new Set(defs.map((d) => d.name));
    // Phase 9.5: when a node has an address, the writer injects an
    // NmStationAddress BA_ assignment. The matching BA_DEF_ must also be
    // declared so the parser can read the assignment back.
    const hasAddressAssignment = net.nodes.some((n) => n.address !== undefined);
    if (hasAddressAssignment && !declared.has('NmStationAddress')) {
      defs.push({
        name: 'NmStationAddress',
        target: 'node',
        type: { kind: 'int', min: 0, max: 255 },
        defaultValue: 0,
      });
    }
    for (const a of net.attributeAssignments) {
      if (!declared.has(a.name)) {
        // We don't know the type/target of arbitrary user attrs, so we
        // skip auto-declaration for unknowns. The build mode's main job
        // is to preserve well-known semantics when the user omits BA_DEF_.
      }
    }
  }
  if (defs.length === 0) return '';
  const lines: string[] = [];
  for (const def of defs) {
    lines.push(emitBaDefLine(def));
    lines.push(emitBaDefDefLine(def));
  }
  return lines.join('\n');
}

function emitBaDefLine(def: AttributeDef): string {
  const targetPrefix = attrTargetToPrefix(def.target);
  const typeStr = attrTypeToString(def.type);
  return `BA_DEF_  ${targetPrefix}"${def.name}" ${typeStr};`;
}

function emitBaDefDefLine(def: AttributeDef): string {
  return `BA_DEF_DEF_  "${def.name}" ${formatAttrValue(def.defaultValue, def.type)};`;
}

function attrTargetToPrefix(target: AttributeDef['target']): string {
  if (target === 'message') return 'BO_  ';
  if (target === 'signal') return 'SG_  ';
  if (target === 'node') return 'BU_  ';
  return ''; // network
}

function attrTypeToString(t: AttrType): string {
  switch (t.kind) {
    case 'int': return `INT ${t.min} ${t.max}`;
    case 'hex': return `HEX ${t.min} ${t.max}`;
    case 'float': return `FLOAT ${t.min} ${t.max}`;
    case 'string': return 'STRING';
    case 'enum': return 'ENUM  ' + t.values.map((v) => `"${escapeQuotes(v)}"`).join(',');
  }
}

function emitBaDefRel(net: Network): string {
  if (net.relationAttributeDefs.length === 0) return '';
  const lines: string[] = [];
  for (const def of net.relationAttributeDefs) {
    const relTarget = def.target === 'node-message' ? 'BU_BO_REL_' : 'BU_SG_REL_';
    const typeStr = attrTypeToString(def.type);
    lines.push(`BA_DEF_REL_  ${relTarget} "${def.name}" ${typeStr};`);
    const defVal = formatAttrValue(def.defaultValue, def.type);
    lines.push(`BA_DEF_DEF_REL_  "${def.name}" ${defVal};`);
  }
  return lines.join('\n');
}

function emitBa(net: Network): string {
  // Phase 9.5: emit a NmStationAddress BA_ line for any node that has an
  // address but no existing NmStationAddress assignment in the Network.
  // The DBC BU_ line has no address slot; the well-known NmStationAddress
  // attribute is the canonical place. The reader's applyNmStationAddress
  // post-processor picks them up and stamps them back onto node.address.
  //
  // Skip injection if the Network already carries a NmStationAddress
  // assignment (e.g. from an upstream DBC parse) so the round-trip stays
  // symmetric — we never duplicate the assignment.
  const alreadyHasNmAddr = net.attributeAssignments.some(
    (a) => a.name === 'NmStationAddress' && a.target.kind === 'node',
  );
  const addressAssignments: AttributeAssignment[] = alreadyHasNmAddr
    ? []
    : net.nodes
        .filter((n) => n.address !== undefined)
        .map((n) => ({
          name: 'NmStationAddress',
          target: { kind: 'node' as const, nodeName: n.name },
          value: n.address as number,
        }));
  const all = [...addressAssignments, ...net.attributeAssignments];
  if (all.length === 0) return '';
  return all.map((a) => emitBaAssignment(a, net)).join('\n');
}

function emitBaAssignment(a: AttributeAssignment, net: Network): string {
  const target = emitTargetRef(a.target);
  // Look up the declared type so we can format the value correctly
  // (especially for ENUM: write the index, not the string).
  const def = net.attributeDefs.find((d) => d.name === a.name);
  const val = def ? formatAttrValue(a.value, def.type) : formatRawValue(a.value);
  return `BA_ "${a.name}" ${target} ${val};`;
}

function emitTargetRef(t: AttributeTargetRef): string {
  if (t.kind === 'network') return 'BU_';
  if (t.kind === 'message') return `BO_ ${t.messageId}`;
  if (t.kind === 'signal') return `SG_ ${t.messageId} ${t.signalName}`;
  return `BU_ ${t.nodeName}`;
}

function emitBaRel(net: Network): string {
  if (net.relationAttributeAssignments.length === 0) return '';
  return net.relationAttributeAssignments.map((a) => emitBaRelAssignment(a, net)).join('\n');
}

function emitBaRelAssignment(a: RelationAttributeAssignment, net: Network): string {
  let target: string;
  if (a.target.kind === 'node-signal') {
    target = `BU_SG_REL_ ${a.target.nodeName} SG_ ${a.target.messageId} ${a.target.signalName}`;
  } else {
    target = `BU_BO_REL_ ${a.target.nodeName} BO_ ${a.target.messageId}`;
  }
  const def = net.relationAttributeDefs.find((d) => d.name === a.name);
  const val = def ? formatAttrValue(a.value, def.type) : formatRawValue(a.value);
  return `BA_REL_ "${a.name}" ${target} ${val};`;
}

function emitSigGroup(net: Network): string {
  if (net.signalGroups.length === 0) return '';
  return net.signalGroups.map((sg) =>
    `SIG_GROUP_ ${sg.messageId} ${sg.name} ${sg.signalNames.join(' ')} : ${sg.repetitions};`,
  ).join('\n');
}

function emitCm(net: Network): string {
  if (net.comments.length === 0) return '';
  return net.comments.map((c) => {
    const target = emitCmTarget(c.scope);
    const targetPart = target ? `${target} ` : '';
    return `CM_ ${targetPart}"${escapeQuotes(c.text)}";`;
  }).join('\n');
}

function emitCmTarget(scope: Network['comments'][number]['scope']): string {
  if (scope.kind === 'network') return '';
  if (scope.kind === 'node') return `BU_ ${scope.nodeName}`;
  if (scope.kind === 'message') return `BO_ ${scope.messageId}`;
  if (scope.kind === 'signal') return `SG_ ${scope.messageId} ${scope.signalName}`;
  if (scope.kind === 'valueTable') return `VAL_TABLE_ ${scope.valueTableName}`;
  return `EV_ ${scope.envVarName}`;
}

// Format an attribute value for output, taking the type into account.
function formatAttrValue(value: AttrValue, type: AttrType): string {
  if (type.kind === 'enum' && typeof value === 'string') {
    const idx = type.values.indexOf(value);
    if (idx < 0) return formatRawValue(value);
    return String(idx);
  }
  if (type.kind === 'string' && typeof value === 'string') {
    return `"${escapeQuotes(value)}"`;
  }
  return formatRawValue(value);
}

function formatRawValue(value: AttrValue): string {
  if (typeof value === 'string') return `"${escapeQuotes(value)}"`;
  return formatNumber(value);
}

// Format a number for DBC output: integers stay as integers; floats use
// the shortest representation that round-trips through Number.toString.
function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  return n.toString();
}

function escapeQuotes(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// DBC writer — top-level entry point.
// Phase 3 ships the writer in pieces. Each commit adds one or more section
// emitters; the orchestrator (writeDbc) is fixed at the start and never
// changes shape. All sections are joined with a blank line and a trailing
// newline is appended for tool friendliness.

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
  void mode; // mode is used by emitBaDef in commit 3
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

  // Phase 3 commit 3 appends VAL_ + attributes + CM_ here.

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

// Format a number for DBC output: integers stay as integers; floats use
// the shortest representation that round-trips through Number.toString.
function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  return n.toString();
}

function escapeQuotes(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

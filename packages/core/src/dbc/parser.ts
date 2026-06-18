// DBC parser — top-level entry point.
// Phase 2.2 ships the line dispatcher and the two header handlers
// (VERSION, BU_). Each later task (2.3-2.13) replaces one of the stubs
// below with a real implementation. The function never mutates `net`:
// every handler returns a new Network.

import { ParseError } from '../errors.js';
import type { AttributeTargetRef, AttrType } from '../model/attributes/attribute.js';
import { NETWORK_ATTRIBUTES, WELL_KNOWN_TYPES } from '../model/attributes/well-known-attributes.js';
import { createMessage } from '../model/message.js';
import {
  addNode,
  addMessage,
  addValueTable,
  appendValueTableEntry,
  createNetwork,
} from '../model/network.js';
import type { Comment, Network } from '../model/network.js';
import { createSignalGroup } from '../model/signal-group.js';
import type { Multiplexed, Signal } from '../model/signal.js';
import { createSignal } from '../model/signal.js';
import { createValueTable } from '../model/value-table.js';

import { DBC_KEYWORDS } from './grammar.js';

export function parseDbc(text: string): Network {
  const lines = text.split(/\r?\n/);
  let net = createNetwork({ version: '' });
  let inValTable = false;
  let inBo = false;
  let currentMessageId: number | null = null;
  let inCm = false;
  let inNs = false;
  let currentValueTable: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const lineNo = i + 1;
    const trimmed = line.trim();

    if (inNs) {
      // NS_ block: identifiers can look like keywords (CM_, BA_DEF_, etc.),
      // so we only end the block on a blank line OR a line that looks like
      // a section-starting keyword (DBC_KEYWORDS followed by a space/colon).
      if (trimmed === '') {
        inNs = false;
        continue;
      }
      if (looksLikeSectionStart(trimmed)) {
        inNs = false;
      } else continue;
    }
    if (inValTable) {
      if (trimmed === '' || !line.trimStart().startsWith('-')) {
        inValTable = false;
        currentValueTable = null;
      } else {
        net = parseValTableLine(net, currentValueTable, line, lineNo);
        continue;
      }
    }
    if (inBo && !trimmed.startsWith('SG_') && !trimmed.startsWith('CM_ SG_MUL_VAL_')) {
      inBo = false;
      currentMessageId = null;
    }
    if (inCm) {
      if (trimmed === '') {
        inCm = false;
      } else {
        net = parseCmLine(net, trimmed, currentMessageId);
        continue;
      }
    }
    if (trimmed === '') continue;

    if (trimmed.startsWith(DBC_KEYWORDS.VERSION + ' ')) {
      net = { ...net, version: extractQuoted(trimmed, lineNo) };
      continue;
    }
    if (trimmed === 'NS_ :' || trimmed.startsWith('NS_ :')) {
      inNs = true;
      continue;
    }
    if (trimmed === 'BS_:') continue;
    if (trimmed.startsWith('BU_:')) {
      net = parseBuLine(net, trimmed);
      continue;
    }
    if (trimmed.startsWith('VAL_TABLE_ ')) {
      inValTable = true;
      const name = parseValTableHeader(net, trimmed, lineNo);
      currentValueTable = name.name;
      net = name.net;
      continue;
    }
    if (trimmed.startsWith('BO_ ')) {
      inBo = true;
      const m = /^BO_ (\d+) (\w+) *: (\d+) (\S+)/.exec(trimmed);
      if (!m) throw new ParseError(`malformed BO_: ${trimmed}`, { line: lineNo, column: 1 });
      currentMessageId = Number(m[1]);
      net = parseBoLine(net, m, lineNo);
      continue;
    }
    if (trimmed.startsWith('SG_ ')) {
      if (currentMessageId == null)
        throw new ParseError('SG_ without BO_', { line: lineNo, column: 1 });
      net = parseSgLine(net, currentMessageId, trimmed, lineNo);
      continue;
    }
    if (trimmed.startsWith('BA_DEF_ ')) {
      net = parseBaDefLine(net, trimmed, lineNo);
      continue;
    }
    if (trimmed.startsWith('BA_DEF_DEF_ ')) {
      net = parseBaDefDefLine(net, trimmed, lineNo);
      continue;
    }
    if (trimmed.startsWith('BA_DEF_DEF_REL_ ')) {
      net = parseBaDefDefRelLine(net, trimmed, lineNo);
      continue;
    }
    if (trimmed.startsWith('BA_ ')) {
      net = parseBaLine(net, trimmed, lineNo);
      continue;
    }
    if (trimmed.startsWith('CM_ ')) {
      inCm = true;
      net = parseCmLine(net, trimmed, currentMessageId);
      continue;
    }
    if (trimmed.startsWith('VAL_ ')) {
      net = parseValLine(net, trimmed, lineNo);
      continue;
    }
    if (trimmed.startsWith('SIG_GROUP_ ')) {
      net = parseSigGroupLine(net, trimmed, lineNo);
      continue;
    }
    if (trimmed.startsWith('SIG_VALTYPE_ ')) {
      net = parseSigValtypeLine(net, trimmed, lineNo);
      continue;
    }
    if (trimmed.startsWith('BO_TX_BU_ ')) {
      net = parseBoTxBuLine(net, trimmed, lineNo);
      continue;
    }
    if (trimmed.startsWith('SG_MUL_VAL_ ')) {
      // SG_MUL_VAL_ may appear after the BO_ block has closed (e.g. after
      // CM_/BA_/SIG_GROUP_ in the same DBC). The id in the line is the
      // source of truth; we just use currentMessageId as a hint for ordering.
      net = parseSgMulValLine(net, currentMessageId ?? 0, trimmed, lineNo);
      continue;
    }
    if (trimmed.startsWith('BA_DEF_REL_ ')) {
      net = parseBaDefRelLine(net, trimmed, lineNo);
      continue;
    }
    if (trimmed.startsWith('BA_REL_ ')) {
      net = parseBaRelLine(net, trimmed, lineNo);
      continue;
    }
    if (trimmed.startsWith('EV_ ') || trimmed.startsWith('ENVVAR_DATA_ ')) continue;
    throw new ParseError(`unknown DBC keyword: ${trimmed}`, { line: lineNo, column: 1 });
  }

  // Post-processing pass (Phase 9.5):
  //   1. applyNmStationAddress: BU_ has no address slot; the NmStationAddress
  //      attribute assignment is the canonical source of node addresses.
  //   2. resolveEnumAttributeValues: the DBC writer emits ENUM values as
  //      integer indices, not strings. Translate them back to the canonical
  //      string value so the Network state matches what the Excel reader
  //      produces from a Network sheet row.
  return resolveEnumAttributeValues(applyNmStationAddress(net));
}

/**
 * Post-process: set `Node.address` from the `NmStationAddress` attribute
 * assignment. The DBC `BU_` line has no address slot; CAN stacks encode the
 * node address as a node-level attribute (NmStationAddress, well-known).
 */
function applyNmStationAddress(net: Network): Network {
  const addrByNode = new Map<string, number>();
  for (const a of net.attributeAssignments) {
    if (a.name === 'NmStationAddress' && a.target.kind === 'node' && typeof a.value === 'number') {
      addrByNode.set(a.target.nodeName, a.value);
    }
  }
  if (addrByNode.size === 0) return net;
  const newNodes = net.nodes.map((n) => {
    const addr = addrByNode.get(n.name);
    return addr !== undefined ? { ...n, address: addr } : n;
  });
  return { ...net, nodes: newNodes };
}

/**
 * Post-process: convert ENUM attribute values that the writer emitted as
 * integer indices back to their canonical string value. This keeps the
 * in-memory Network state symmetric with what the Excel reader produces
 * (Network sheet always emits the string form). Applies to both
 * `attributeAssignments[].value` and `attributeDefs[].defaultValue`.
 */
function resolveEnumAttributeValues(net: Network): Network {
  if (net.attributeAssignments.length === 0 && net.attributeDefs.length === 0) return net;
  const defsByName = new Map(net.attributeDefs.map((d) => [d.name, d] as const));
  let aChanged = false;
  const nextAssignments = net.attributeAssignments.map((a) => {
    const def = defsByName.get(a.name);
    if (!def || def.type.kind !== 'enum') return a;
    if (typeof a.value !== 'number') return a;
    const v = def.type.values[a.value];
    if (v === undefined) return a;
    aChanged = true;
    return { ...a, value: v };
  });
  let dChanged = false;
  const nextDefs = net.attributeDefs.map((d) => {
    if (d.type.kind !== 'enum') return d;
    if (typeof d.defaultValue !== 'number') return d;
    const v = d.type.values[d.defaultValue];
    if (v === undefined) return d;
    dChanged = true;
    return { ...d, defaultValue: v };
  });
  if (!aChanged && !dChanged) return net;
  return {
    ...net,
    attributeAssignments: aChanged ? nextAssignments : net.attributeAssignments,
    attributeDefs: dChanged ? nextDefs : net.attributeDefs,
  };
}

function extractQuoted(s: string, line: number): string {
  const m = /"([^"]*)"/.exec(s);
  if (!m) throw new ParseError(`expected quoted string: ${s}`, { line, column: 1 });
  return m[1] ?? '';
}

// Recognizes lines that look like the start of a DBC section (e.g. `BO_ 256 ...`,
// `BU_: NodeA`, `BS_:`). NS_ namespace identifiers are bare tokens that never
// match this pattern, so we use it to terminate the NS_ block defensively.
function looksLikeSectionStart(trimmed: string): boolean {
  // A keyword followed by space, colon, or end-of-line.
  return /^(VERSION|BS_:|BU_:|BU_ |VAL_TABLE_ |BO_ |SG_ |BA_DEF_ |BA_DEF_DEF_ |BA_DEF_REL_ |BA_DEF_DEF_REL_ |BA_ |BA_REL_ |CM_ |VAL_ |SIG_GROUP_ |SIG_VALTYPE_ |BO_TX_BU_ |SG_MUL_VAL_ |EV_ |ENVVAR_DATA_ )/.test(
    trimmed,
  );
}

function appendSignal(net: Network, messageId: number, signal: Signal): Network {
  return {
    ...net,
    messages: net.messages.map((m) =>
      m.id === messageId
        ? createMessage({
            id: m.id,
            name: m.name,
            dlc: m.dlc,
            transmitter: m.transmitter,
            additionalTransmitters: m.additionalTransmitters,
            signals: [...m.signals, signal],
            ...(m.comment !== undefined ? { comment: m.comment } : {}),
            ...(m.muxExtensions !== undefined ? { muxExtensions: m.muxExtensions } : {}),
          })
        : m,
    ),
  };
}

function parseBuLine(net: Network, trimmed: string): Network {
  const names = trimmed.replace(/^BU_:/, '').trim().split(/\s+/).filter(Boolean);
  let n = net;
  for (const name of names) n = addNode(n, { name });
  return n;
}

// Stubs (replaced in tasks 2.3-2.13):
function parseValTableLine(
  net: Network,
  name: string | null,
  line: string,
  lineNo: number,
): Network {
  if (name == null)
    throw new ParseError('VAL_TABLE_ continuation without header', { line: lineNo, column: 1 });
  // Format: `   - <raw> "<label>" <raw> "<label>" ...`
  const stripped = line.replace(/^\s*-\s*/, '');
  const entries = parseValEntries(stripped, lineNo);
  let n = net;
  for (const e of entries) n = appendValueTableEntry(n, name, e);
  return n;
}

function parseValTableHeader(
  net: Network,
  line: string,
  lineNo: number,
): { net: Network; name: string } {
  // Format: `VAL_TABLE_ <Name> <raw> "<label>" ... ;`
  const m = /^VAL_TABLE_\s+(\S+)\s+(.*?)\s*;\s*$/.exec(line);
  if (!m) throw new ParseError(`malformed VAL_TABLE_: ${line}`, { line: lineNo, column: 1 });
  const name = m[1];
  const rest = m[2];
  if (name === undefined || rest === undefined) {
    throw new ParseError(`malformed VAL_TABLE_: ${line}`, { line: lineNo, column: 1 });
  }
  const entries = parseValEntries(rest, lineNo);
  const updated = addValueTable(net, createValueTable({ name, entries }));
  return { net: updated, name };
}

function parseValEntries(s: string, lineNo: number): readonly { raw: number; name: string }[] {
  // Tokenize into alternating <number> "<label>" pairs.
  const entries: { raw: number; name: string }[] = [];
  const re = /(-?\d+)\s+"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const rawStr = m[1];
    const label = m[2];
    if (rawStr === undefined || label === undefined) {
      throw new ParseError(`malformed VAL entry: ${s}`, { line: lineNo, column: 1 });
    }
    entries.push({ raw: Number(rawStr), name: label });
  }
  return entries;
}
function parseBoLine(net: Network, m: RegExpExecArray, _ln: number): Network {
  // m[1] = id, m[2] = name, m[3] = dlc, m[4] = transmitter
  const idStr = m[1];
  const name = m[2];
  const dlcStr = m[3];
  const tx = m[4];
  if (idStr === undefined || name === undefined || dlcStr === undefined || tx === undefined) {
    return net;
  }
  return addMessage(net, {
    id: Number(idStr),
    name,
    dlc: Number(dlcStr),
    transmitter: tx,
  });
}
function parseSgLine(net: Network, messageId: number, line: string, lineNo: number): Network {
  // Format: `SG_ <Name> [M|m<v>|M<v>m<v>] : <start>|<length>@<order><sign> (<factor>,<offset>) [<min>|<max>] "<unit>" <receivers>`
  // The leading whitespace is allowed; we work on the trimmed form.
  const trimmed = line.trim();
  const m =
    /^SG_\s+(\S+)(?:\s+(M|m\d+M?|M\d+m\d+))?\s*:\s*(\d+)\|(\d+)@([01])([+-])\s*\(\s*([-+0-9.eE]+)\s*,\s*([-+0-9.eE]+)\s*\)\s*\[\s*([-+0-9.eE]+)\s*\|\s*([-+0-9.eE]+)\s*\]\s*"([^"]*)"\s*(.*)$/.exec(
      trimmed,
    );
  if (!m) throw new ParseError(`malformed SG_: ${trimmed}`, { line: lineNo, column: 1 });
  const name = m[1];
  const muxStr = m[2];
  const startBitStr = m[3];
  const lengthStr = m[4];
  const orderChar = m[5];
  const signChar = m[6];
  const factorStr = m[7];
  const offsetStr = m[8];
  const minStr = m[9];
  const maxStr = m[10];
  const unit = m[11];
  const receiversStr = m[12];
  if (
    name === undefined ||
    startBitStr === undefined ||
    lengthStr === undefined ||
    orderChar === undefined ||
    signChar === undefined ||
    factorStr === undefined ||
    offsetStr === undefined ||
    minStr === undefined ||
    maxStr === undefined ||
    unit === undefined ||
    receiversStr === undefined
  ) {
    throw new ParseError(`malformed SG_: ${trimmed}`, { line: lineNo, column: 1 });
  }
  const multiplexed = parseMuxSpecifier(muxStr);
  const receivers = receiversStr
    .trim()
    .split(/[,\s]+/)
    .filter(Boolean);
  const signal = createSignal({
    name,
    startBit: Number(startBitStr),
    length: Number(lengthStr),
    byteOrder: orderChar === '1' ? 'little-endian' : 'big-endian',
    valueType: signChar === '-' ? 'signed' : 'unsigned',
    factor: Number(factorStr),
    offset: Number(offsetStr),
    min: Number(minStr),
    max: Number(maxStr),
    unit,
    receivers,
    multiplexed,
  });
  return appendSignal(net, messageId, signal);
}

function parseMuxSpecifier(s: string | undefined): Multiplexed {
  if (s === undefined) return { kind: 'Plain' };
  if (s === 'M') return { kind: 'Multiplexor' };
  // Vector form: `m<value>M` = Muxed with the given value (the trailing M is
  // a historical artifact of the CANdb++ editor). The "ExtendedMuxed" form
  // is `M<value>m<value>` (uppercase M first, then lowercase m).
  const mMuxed = /^m(\d+)M?$/.exec(s);
  if (mMuxed) {
    const v = mMuxed[1];
    if (v !== undefined) return { kind: 'Muxed', value: Number(v) };
  }
  const mExt = /^M(\d+)m(\d+)$/.exec(s);
  if (mExt) {
    const v = mExt[2];
    if (v !== undefined) return { kind: 'ExtendedMuxed', value: Number(v) };
  }
  return { kind: 'Plain' };
}
function parseBaDefLine(net: Network, line: string, lineNo: number): Network {
  // Actual Vector format: `BA_DEF_ [BU_|BO_|SG_|EV_]  "<name>" <Type> [<range>] ;`
  const m =
    /^BA_DEF_\s+(?:(BU_|BO_|SG_|EV_)\s+)?"([^"]+)"\s+(INT|HEX|FLOAT|STRING|ENUM)\s*(.*?)\s*;\s*$/.exec(
      line,
    );
  if (!m) throw new ParseError(`malformed BA_DEF_: ${line}`, { line: lineNo, column: 1 });
  const targetKw = m[1];
  const name = m[2];
  const typeKw = m[3];
  const range = m[4];
  if (name === undefined || typeKw === undefined) {
    throw new ParseError(`malformed BA_DEF_: ${line}`, { line: lineNo, column: 1 });
  }
  const target = parseAttrTarget(targetKw);
  const type = parseAttrType(typeKw, range ?? '', lineNo, line);
  const defaultValue = lookupDefaultValue(name, type);
  return { ...net, attributeDefs: [...net.attributeDefs, { name, target, type, defaultValue }] };
}

function parseAttrTarget(kw: string | undefined): 'network' | 'message' | 'signal' | 'node' {
  if (kw === 'BO_') return 'message';
  if (kw === 'SG_') return 'signal';
  if (kw === 'BU_') return 'node';
  return 'network';
}

function parseAttrType(typeKw: string, range: string, lineNo: number, line: string): AttrType {
  if (typeKw === 'STRING') return { kind: 'string' };
  if (typeKw === 'INT' || typeKw === 'HEX' || typeKw === 'FLOAT') {
    const m = /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/.exec(range);
    if (!m) throw new ParseError(`malformed BA_DEF_ range: ${line}`, { line: lineNo, column: 1 });
    const min = m[1];
    const max = m[2];
    if (min === undefined || max === undefined) {
      throw new ParseError(`malformed BA_DEF_ range: ${line}`, { line: lineNo, column: 1 });
    }
    const numMin = Number(min);
    const numMax = Number(max);
    if (typeKw === 'INT') return { kind: 'int', min: numMin, max: numMax };
    if (typeKw === 'HEX') return { kind: 'hex', min: numMin, max: numMax };
    return { kind: 'float', min: numMin, max: numMax };
  }
  // ENUM: "v1","v2",...
  if (typeKw === 'ENUM') {
    const values: string[] = [];
    const re = /"([^"]*)"/g;
    let mm: RegExpExecArray | null;
    while ((mm = re.exec(range)) !== null) {
      if (mm[1] !== undefined) values.push(mm[1]);
    }
    return { kind: 'enum', values };
  }
  throw new ParseError(`unknown BA_DEF_ type: ${typeKw}`, { line: lineNo, column: 1 });
}

function lookupDefaultValue(name: string, type: AttrType): number | string {
  // Check well-known attribute set first.
  const wk = WELL_KNOWN_TYPES.get(name);
  if (wk) return wk.defaultValue;
  // Sensible fallback by type.
  if (type.kind === 'int' || type.kind === 'hex') return 0;
  if (type.kind === 'float') return 0;
  if (type.kind === 'enum') return type.values[0] ?? '';
  return '';
}

function parseBaLine(net: Network, line: string, lineNo: number): Network {
  // Format: BA_ "<name>" <target-ref> <value> ;
  // target-ref: BO_ <id> | SG_ <id> <name> | BU_ <node> | <empty>
  const m = /^BA_\s+"([^"]+)"\s+(.*?)\s*;\s*$/.exec(line);
  if (!m) throw new ParseError(`malformed BA_: ${line}`, { line: lineNo, column: 1 });
  const name = m[1];
  const rest = m[2];
  if (name === undefined || rest === undefined) {
    throw new ParseError(`malformed BA_: ${line}`, { line: lineNo, column: 1 });
  }
  const { target, value } = parseBaTargetRef(name, rest, line, lineNo);
  return { ...net, attributeAssignments: [...net.attributeAssignments, { name, target, value }] };
}

function parseBaTargetRef(
  name: string,
  rest: string,
  line: string,
  lineNo: number,
): { target: AttributeTargetRef; value: number | string } {
  // BO_ <id> <value>
  const mBo = /^BO_\s+(\d+)\s+(.*)$/.exec(rest);
  if (mBo) {
    const idStr = mBo[1];
    const valStr = mBo[2];
    if (idStr === undefined || valStr === undefined)
      throw new ParseError(`malformed BA_: ${line}`, { line: lineNo, column: 1 });
    return {
      target: { kind: 'message', messageId: Number(idStr) },
      value: coerceAttrValue(valStr.trim()),
    };
  }
  // SG_ <id> <name> <value>
  const mSg = /^SG_\s+(\d+)\s+(\S+)\s+(.*)$/.exec(rest);
  if (mSg) {
    const idStr = mSg[1];
    const sigName = mSg[2];
    const valStr = mSg[3];
    if (idStr === undefined || sigName === undefined || valStr === undefined)
      throw new ParseError(`malformed BA_: ${line}`, { line: lineNo, column: 1 });
    return {
      target: { kind: 'signal', messageId: Number(idStr), signalName: sigName },
      value: coerceAttrValue(valStr.trim()),
    };
  }
  // BU_ <nodeName> <value> — must have at least a value token after the
  // node name. The writer emits a bare `BU_` token for network-level BA_ lines
  // (see emitTargetRef); we must NOT consume `BU_` as a node-target prefix in
  // that case.
  const mBu = /^BU_\s+(\S+)\s+(\S.*)$/.exec(rest);
  if (mBu) {
    const nodeName = mBu[1];
    const valStr = mBu[2];
    if (nodeName === undefined || valStr === undefined)
      throw new ParseError(`malformed BA_: ${line}`, { line: lineNo, column: 1 });
    return { target: { kind: 'node', nodeName }, value: coerceAttrValue(valStr.trim()) };
  }
  // BU_ with a single value (or `BU_ 0;`): network-level BA_ (DBC spec allows
  // the writer to emit `BA_ "<name>" BU_ <value>;` for network attrs).
  const mNet = /^BU_\s+(\S.*)$/.exec(rest);
  if (mNet) {
    const valStr = mNet[1];
    if (valStr === undefined)
      throw new ParseError(`malformed BA_: ${line}`, { line: lineNo, column: 1 });
    return { target: { kind: 'network' }, value: coerceAttrValue(valStr.trim()) };
  }
  // Otherwise: bare network-level value (no target ref at all).
  return { target: { kind: 'network' }, value: coerceAttrValue(rest.trim()) };
}

function isNetworkAttribute(name: string): boolean {
  return (NETWORK_ATTRIBUTES as readonly string[]).includes(name);
}

function coerceAttrValue(s: string): number | string {
  // Quoted → string. Unquoted numeric → number. Otherwise string.
  const m = /^"([^"]*)"$/.exec(s);
  if (m && m[1] !== undefined) return m[1];
  const n = Number(s);
  if (!Number.isNaN(n) && /^-?\d+(?:\.\d+)?$/.test(s)) return n;
  return s;
}

function parseCmLine(net: Network, line: string, currentMessageId: number | null): Network {
  // Format: CM_ [BU_ <node> | BO_ <id> | SG_ <id> <name> | EV_ <name> | VAL_TABLE_ <name> | <empty>] "<text>" [;]
  const m =
    /^CM_\s+(?:(BU_|BO_|SG_|EV_|VAL_TABLE_)\s+([^ ]+?)(?:\s+([^ ]+?))?)?\s*"((?:[^"\\]|\\.)*)"\s*;?\s*$/.exec(
      line,
    );
  if (!m) throw new ParseError(`malformed CM_: ${line}`, { line: 0, column: 1 });
  const kw = m[1];
  const a = m[2];
  const b = m[3];
  const text = m[4];
  if (text === undefined) {
    throw new ParseError(`malformed CM_: ${line}`, { line: 0, column: 1 });
  }
  const decoded = text.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  let scope: Comment['scope'];
  if (kw === undefined) scope = { kind: 'network' };
  else if (kw === 'BU_' && a !== undefined) scope = { kind: 'node', nodeName: a };
  else if (kw === 'BO_' && a !== undefined) scope = { kind: 'message', messageId: Number(a) };
  else if (kw === 'SG_' && a !== undefined && b !== undefined)
    scope = { kind: 'signal', messageId: Number(a), signalName: b };
  else if (kw === 'EV_' && a !== undefined) scope = { kind: 'envVar', envVarName: a };
  else if (kw === 'VAL_TABLE_' && a !== undefined)
    scope = { kind: 'valueTable', valueTableName: a };
  else scope = { kind: 'network' };
  void currentMessageId;
  return { ...net, comments: [...net.comments, { scope, text: decoded }] };
}

function parseValLine(net: Network, line: string, lineNo: number): Network {
  // Format: VAL_ <id> <name> <raw> "<text>" ... ;
  const m = /^VAL_\s+(\d+)\s+(\S+)\s+(.*?)\s*;\s*$/.exec(line);
  if (!m) throw new ParseError(`malformed VAL_: ${line}`, { line: lineNo, column: 1 });
  const idStr = m[1];
  const sigName = m[2];
  const rest = m[3];
  if (idStr === undefined || sigName === undefined || rest === undefined) {
    throw new ParseError(`malformed VAL_: ${line}`, { line: lineNo, column: 1 });
  }
  const messageId = Number(idStr);
  const entries = parseValEntries(rest, lineNo);
  // DBC inline convention: VAL_ uses the signal name in the second slot.
  // The "real" value table is whichever VT was declared in a prior
  // VAL_TABLE_ block; if none exists, we create one keyed by signal name.
  //
  // Phase 9.5: if a previously declared VT has the same entry set as the
  // inline ones, prefer that VT's name. This keeps xlsx ↔ dbc round-trips
  // symmetric when the xlsx binds a signal to a logically-named VT (e.g.
  // "GearTable") that the DBC inline form would otherwise replicate under
  // the signal name (e.g. "Gear").
  let n = net;
  let vtName: string = sigName;
  const matchByEntries = n.valueTables.find(
    (v) =>
      v.entries.length === entries.length &&
      v.entries.every((e, i) => e.raw === entries[i]?.raw && e.name === entries[i]?.name),
  );
  if (matchByEntries) {
    vtName = matchByEntries.name;
  } else if (!n.valueTables.some((v) => v.name === sigName)) {
    n = addValueTable(n, createValueTable({ name: sigName, entries }));
  } else {
    for (const e of entries) n = appendValueTableEntry(n, sigName, e);
  }
  // Bind the signal to the resolved value table name.
  return {
    ...n,
    messages: n.messages.map((m2) =>
      m2.id === messageId
        ? createMessage({
            id: m2.id,
            name: m2.name,
            dlc: m2.dlc,
            transmitter: m2.transmitter,
            additionalTransmitters: m2.additionalTransmitters,
            signals: m2.signals.map((s) =>
              s.name === sigName
                ? createSignal({
                    name: s.name,
                    startBit: s.startBit,
                    length: s.length,
                    byteOrder: s.byteOrder,
                    valueType: s.valueType,
                    factor: s.factor,
                    offset: s.offset,
                    min: s.min,
                    max: s.max,
                    unit: s.unit,
                    receivers: s.receivers,
                    multiplexed: s.multiplexed,
                    valueTable: vtName,
                    ...(s.comment !== undefined ? { comment: s.comment } : {}),
                    ...(s.valueTypeForSignal !== undefined
                      ? { valueTypeForSignal: s.valueTypeForSignal }
                      : {}),
                    ...(s.commentGuards !== undefined ? { commentGuards: s.commentGuards } : {}),
                  })
                : s,
            ),
            ...(m2.comment !== undefined ? { comment: m2.comment } : {}),
            ...(m2.muxExtensions !== undefined ? { muxExtensions: m2.muxExtensions } : {}),
          })
        : m2,
    ),
  };
}

function parseSigGroupLine(net: Network, line: string, lineNo: number): Network {
  // Format: SIG_GROUP_ <id> <name> <sig1> <sig2> ... : <repetitions> ;
  const m = /^SIG_GROUP_\s+(\d+)\s+(\S+)\s+(.*?)\s*:\s*(\d+)\s*;\s*$/.exec(line);
  if (!m) throw new ParseError(`malformed SIG_GROUP_: ${line}`, { line: lineNo, column: 1 });
  const idStr = m[1];
  const name = m[2];
  const sigsStr = m[3];
  const repStr = m[4];
  if (idStr === undefined || name === undefined || sigsStr === undefined || repStr === undefined) {
    throw new ParseError(`malformed SIG_GROUP_: ${line}`, { line: lineNo, column: 1 });
  }
  const signalNames = sigsStr.trim().split(/\s+/).filter(Boolean);
  return {
    ...net,
    signalGroups: [
      ...net.signalGroups,
      createSignalGroup({
        name,
        messageId: Number(idStr),
        signalNames,
        repetitions: Number(repStr),
      }),
    ],
  };
}

function parseSigValtypeLine(net: Network, line: string, lineNo: number): Network {
  // Format: SIG_VALTYPE_ <id> <name> : <1|2>;
  const m = /^SIG_VALTYPE_\s+(\d+)\s+(\S+)\s*:\s*(\d+)\s*;\s*$/.exec(line);
  if (!m) throw new ParseError(`malformed SIG_VALTYPE_: ${line}`, { line: lineNo, column: 1 });
  const idStr = m[1];
  const sigName = m[2];
  const v = m[3];
  if (idStr === undefined || sigName === undefined || v === undefined) {
    throw new ParseError(`malformed SIG_VALTYPE_: ${line}`, { line: lineNo, column: 1 });
  }
  if (v !== '1') return net; // We only model 'Reserved' (= 1) for now.
  const messageId = Number(idStr);
  return {
    ...net,
    messages: net.messages.map((m2) =>
      m2.id === messageId
        ? createMessage({
            id: m2.id,
            name: m2.name,
            dlc: m2.dlc,
            transmitter: m2.transmitter,
            additionalTransmitters: m2.additionalTransmitters,
            signals: m2.signals.map((s) =>
              s.name === sigName
                ? createSignal({
                    name: s.name,
                    startBit: s.startBit,
                    length: s.length,
                    byteOrder: s.byteOrder,
                    valueType: s.valueType,
                    factor: s.factor,
                    offset: s.offset,
                    min: s.min,
                    max: s.max,
                    unit: s.unit,
                    receivers: s.receivers,
                    multiplexed: s.multiplexed,
                    ...(s.valueTable !== undefined ? { valueTable: s.valueTable } : {}),
                    ...(s.comment !== undefined ? { comment: s.comment } : {}),
                    valueTypeForSignal: 'Reserved',
                    ...(s.commentGuards !== undefined ? { commentGuards: s.commentGuards } : {}),
                  })
                : s,
            ),
            ...(m2.comment !== undefined ? { comment: m2.comment } : {}),
            ...(m2.muxExtensions !== undefined ? { muxExtensions: m2.muxExtensions } : {}),
          })
        : m2,
    ),
  };
}

function parseBoTxBuLine(net: Network, line: string, lineNo: number): Network {
  // Format: BO_TX_BU_ <id> : <tx1>,<tx2>,... ;
  const m = /^BO_TX_BU_\s+(\d+)\s*:\s*(.*?)\s*;\s*$/.exec(line);
  if (!m) throw new ParseError(`malformed BO_TX_BU_: ${line}`, { line: lineNo, column: 1 });
  const idStr = m[1];
  const list = m[2];
  if (idStr === undefined || list === undefined) {
    throw new ParseError(`malformed BO_TX_BU_: ${line}`, { line: lineNo, column: 1 });
  }
  const messageId = Number(idStr);
  const additional = list
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    ...net,
    messages: net.messages.map((m2) =>
      m2.id === messageId
        ? createMessage({
            id: m2.id,
            name: m2.name,
            dlc: m2.dlc,
            transmitter: m2.transmitter,
            additionalTransmitters: additional,
            signals: m2.signals,
            ...(m2.comment !== undefined ? { comment: m2.comment } : {}),
            ...(m2.muxExtensions !== undefined ? { muxExtensions: m2.muxExtensions } : {}),
          })
        : m2,
    ),
  };
}

function parseSgMulValLine(net: Network, _id: number, line: string, lineNo: number): Network {
  // Format: SG_MUL_VAL_ <id> <name> <value1> <value2> ... ;
  const m = /^SG_MUL_VAL_\s+(\d+)\s+(\S+)\s+(.*?)\s*;\s*$/.exec(line);
  if (!m) throw new ParseError(`malformed SG_MUL_VAL_: ${line}`, { line: lineNo, column: 1 });
  const idStr = m[1];
  const sigName = m[2];
  const rest = m[3];
  if (idStr === undefined || sigName === undefined || rest === undefined) {
    throw new ParseError(`malformed SG_MUL_VAL_: ${line}`, { line: lineNo, column: 1 });
  }
  const messageId = Number(idStr);
  const values = rest
    .trim()
    .split(/\s+/)
    .map((s) => Number(s))
    .filter((v) => !Number.isNaN(v));
  const idx = net.messages.findIndex((m2) => m2.id === messageId);
  if (idx < 0) return net;
  const orig = net.messages[idx];
  if (!orig) return net;
  const existing = orig.muxExtensions
    ? new Map(orig.muxExtensions)
    : new Map<string, readonly number[]>();
  existing.set(sigName, values);
  const updated = createMessage({ ...orig, muxExtensions: existing });
  const newMessages = [...net.messages];
  newMessages[idx] = updated;
  return { ...net, messages: newMessages };
}
function parseBaDefRelLine(_n: Network, _l: string, _ln: number): Network {
  return _n;
}
function parseBaRelLine(_n: Network, _l: string, _ln: number): Network {
  return _n;
}

// BA_DEF_DEF_ "<name>" <default-value> ; — sets the default for an existing
// attribute def. We update the matching AttributeDef in place; if no def
// exists yet (shouldn't happen in well-formed DBCs), we silently drop.
function parseBaDefDefLine(net: Network, line: string, lineNo: number): Network {
  const m = /^BA_DEF_DEF_\s+"([^"]+)"\s+(.*?)\s*;\s*$/.exec(line);
  if (!m) throw new ParseError(`malformed BA_DEF_DEF_: ${line}`, { line: lineNo, column: 1 });
  const name = m[1];
  const valueStr = m[2];
  if (name === undefined || valueStr === undefined) {
    throw new ParseError(`malformed BA_DEF_DEF_: ${line}`, { line: lineNo, column: 1 });
  }
  const value = coerceAttrValue(valueStr.trim());
  return {
    ...net,
    attributeDefs: net.attributeDefs.map((d) =>
      d.name === name ? { ...d, defaultValue: value } : d,
    ),
  };
}

function parseBaDefDefRelLine(_n: Network, _l: string, _ln: number): Network {
  return _n;
}

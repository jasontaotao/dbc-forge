// DBC parser — top-level entry point.
// Phase 2.2 ships the line dispatcher and the two header handlers
// (VERSION, BU_). Each later task (2.3-2.13) replaces one of the stubs
// below with a real implementation. The function never mutates `net`:
// every handler returns a new Network.

import { ParseError } from '../errors.js';
import type { Network } from '../model/network.js';
import { addNode, addMessage, addValueTable, appendValueTableEntry, createNetwork } from '../model/network.js';
import { createMessage } from '../model/message.js';
import { createSignal } from '../model/signal.js';
import { createValueTable } from '../model/value-table.js';
import type { Multiplexed, Signal } from '../model/signal.js';

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
      if (trimmed === '') { inNs = false; continue; }
      if (looksLikeSectionStart(trimmed)) { inNs = false; }
      else continue;
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
      if (trimmed === '') { inCm = false; } else { net = parseCmLine(net, trimmed, currentMessageId); continue; }
    }
    if (trimmed === '') continue;

    if (trimmed.startsWith(DBC_KEYWORDS.VERSION + ' ')) {
      net = { ...net, version: extractQuoted(trimmed, lineNo) };
      continue;
    }
    if (trimmed === 'NS_ :' || trimmed.startsWith('NS_ :')) { inNs = true; continue; }
    if (trimmed === 'BS_:') continue;
    if (trimmed.startsWith('BU_:')) { net = parseBuLine(net, trimmed); continue; }
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
      if (currentMessageId == null) throw new ParseError('SG_ without BO_', { line: lineNo, column: 1 });
      net = parseSgLine(net, currentMessageId, trimmed, lineNo);
      continue;
    }
    if (trimmed.startsWith('BA_DEF_ ')) { net = parseBaDefLine(net, trimmed, lineNo); continue; }
    if (trimmed.startsWith('BA_ ')) { net = parseBaLine(net, trimmed, lineNo); continue; }
    if (trimmed.startsWith('CM_ ')) { inCm = true; net = parseCmLine(net, trimmed, currentMessageId); continue; }
    if (trimmed.startsWith('VAL_ ')) { net = parseValLine(net, trimmed, lineNo); continue; }
    if (trimmed.startsWith('SIG_GROUP_ ')) { net = parseSigGroupLine(net, trimmed, lineNo); continue; }
    if (trimmed.startsWith('SIG_VALTYPE_ ')) { net = parseSigValtypeLine(net, trimmed, lineNo); continue; }
    if (trimmed.startsWith('BO_TX_BU_ ')) { net = parseBoTxBuLine(net, trimmed, lineNo); continue; }
    if (trimmed.startsWith('SG_MUL_VAL_ ')) {
      if (currentMessageId == null) throw new ParseError('SG_MUL_VAL_ without BO_', { line: lineNo, column: 1 });
      net = parseSgMulValLine(net, currentMessageId, trimmed, lineNo);
      continue;
    }
    if (trimmed.startsWith('BA_DEF_REL_ ')) { net = parseBaDefRelLine(net, trimmed, lineNo); continue; }
    if (trimmed.startsWith('BA_REL_ ')) { net = parseBaRelLine(net, trimmed, lineNo); continue; }
    if (trimmed.startsWith('EV_ ') || trimmed.startsWith('ENVVAR_DATA_ ')) continue;
    throw new ParseError(`unknown DBC keyword: ${trimmed}`, { line: lineNo, column: 1 });
  }
  return net;
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
  return /^(VERSION|BS_:|BU_:|BU_ |VAL_TABLE_ |BO_ |SG_ |BA_DEF_ |BA_DEF_DEF_ |BA_DEF_REL_ |BA_DEF_DEF_REL_ |BA_ |BA_REL_ |CM_ |VAL_ |SIG_GROUP_ |SIG_VALTYPE_ |BO_TX_BU_ |SG_MUL_VAL_ |EV_ |ENVVAR_DATA_ )/.test(trimmed);
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
function parseValTableLine(net: Network, name: string | null, line: string, lineNo: number): Network {
  if (name == null) throw new ParseError('VAL_TABLE_ continuation without header', { line: lineNo, column: 1 });
  // Format: `   - <raw> "<label>" <raw> "<label>" ...`
  const stripped = line.replace(/^\s*-\s*/, '');
  const entries = parseValEntries(stripped, lineNo);
  let n = net;
  for (const e of entries) n = appendValueTableEntry(n, name, e);
  return n;
}

function parseValTableHeader(net: Network, line: string, lineNo: number): { net: Network; name: string } {
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
  const m = /^SG_\s+(\S+)(?:\s+(M|m\d+|M\d+m\d+))?\s*:\s*(\d+)\|(\d+)@([01])([+-])\s*\(\s*([-+0-9.eE]+)\s*,\s*([-+0-9.eE]+)\s*\)\s*\[\s*([-+0-9.eE]+)\s*\|\s*([-+0-9.eE]+)\s*\]\s*"([^"]*)"\s*(.*)$/.exec(trimmed);
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
  if (name === undefined || startBitStr === undefined || lengthStr === undefined ||
      orderChar === undefined || signChar === undefined || factorStr === undefined ||
      offsetStr === undefined || minStr === undefined || maxStr === undefined ||
      unit === undefined || receiversStr === undefined) {
    throw new ParseError(`malformed SG_: ${trimmed}`, { line: lineNo, column: 1 });
  }
  const multiplexed = parseMuxSpecifier(muxStr);
  const receivers = receiversStr.trim().split(/[,\s]+/).filter(Boolean);
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
  const mExtMuxed = /^M(\d+)m(\d+)$/.exec(s);
  if (mExtMuxed) {
    const v = mExtMuxed[1];
    if (v !== undefined) return { kind: 'Multiplexor' };
  }
  const mMuxed = /^m(\d+)$/.exec(s);
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
function parseBaDefLine(_n: Network, _l: string, _ln: number): Network { return _n; }
function parseBaLine(_n: Network, _l: string, _ln: number): Network { return _n; }
function parseCmLine(_n: Network, _l: string, _id: number | null): Network { return _n; }
function parseValLine(_n: Network, _l: string, _ln: number): Network { return _n; }
function parseSigGroupLine(_n: Network, _l: string, _ln: number): Network { return _n; }
function parseSigValtypeLine(_n: Network, _l: string, _ln: number): Network { return _n; }
function parseBoTxBuLine(_n: Network, _l: string, _ln: number): Network { return _n; }
function parseSgMulValLine(_n: Network, _id: number, _l: string, _ln: number): Network { return _n; }
function parseBaDefRelLine(_n: Network, _l: string, _ln: number): Network { return _n; }
function parseBaRelLine(_n: Network, _l: string, _ln: number): Network { return _n; }

// DBC parser — top-level entry point.
// Phase 2.2 ships the line dispatcher and the two header handlers
// (VERSION, BU_). Each later task (2.3-2.13) replaces one of the stubs
// below with a real implementation. The function never mutates `net`:
// every handler returns a new Network.

import { ParseError } from '../errors.js';
import type { Network } from '../model/network.js';
import { addNode, createNetwork } from '../model/network.js';

import { DBC_KEYWORDS } from './grammar.js';

export function parseDbc(text: string): Network {
  const lines = text.split(/\r?\n/);
  let net = createNetwork({ version: '' });
  let inValTable = false;
  let inBo = false;
  let currentMessageId: number | null = null;
  let inCm = false;
  let inNs = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const lineNo = i + 1;
    const trimmed = line.trim();

    if (inNs) {
      // NS_ block: any non-empty line is a namespace identifier.
      // Block ends at the blank line. Identifiers can look like keywords
      // (e.g. CM_, BA_DEF_) when listed in the NS_ block, so we MUST NOT
      // bail out on a keyword match — we only bail out on a blank line.
      if (trimmed === '') { inNs = false; continue; }
      continue;
    }
    if (inValTable) {
      if (trimmed === '' || !line.trimStart().startsWith('-')) {
        inValTable = false;
      } else {
        net = parseValTableLine(net, line);
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
      net = parseValTableHeader(net, trimmed, lineNo);
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

function parseBuLine(net: Network, trimmed: string): Network {
  const names = trimmed.replace(/^BU_:/, '').trim().split(/\s+/).filter(Boolean);
  let n = net;
  for (const name of names) n = addNode(n, { name });
  return n;
}

// Stubs (replaced in tasks 2.3-2.13):
function parseValTableLine(_n: Network, _l: string): Network { return _n; }
function parseValTableHeader(_n: Network, _l: string, _ln: number): Network { return _n; }
function parseBoLine(_n: Network, _m: RegExpExecArray, _ln: number): Network { return _n; }
function parseSgLine(_n: Network, _id: number, _l: string, _ln: number): Network { return _n; }
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

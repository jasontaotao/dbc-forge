// DBC writer — top-level entry point.
// Phase 3 ships the writer in pieces. Each commit adds one or more section
// emitters; the orchestrator (writeDbc) is fixed at the start and never
// changes shape. All sections are joined with a blank line and a trailing
// newline is appended for tool friendliness.

import type { Network } from '../model/network.js';

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

  // Phase 3 commits 2-3 append more section emitters here. The slot
  // ordering matches the parser's DBC_EMIT_ORDER.

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

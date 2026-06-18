// Public API surface for @dbc-forge/core.
//
// Phase 1 ships only the domain types and error classes (these are the
// foundation every later phase builds on). The seven public functions
// (parseDbc, writeDbc, parseExcel, writeExcel, validate, diff, renderDiff)
// are added in Phase 8 once their implementations exist.

// Domain types
export type { Network } from './model/network.js';
export type { Comment } from './model/network.js';
export type { Message } from './model/message.js';
export type { Signal, ByteOrder, ValueType, Multiplexed } from './model/signal.js';
export type { Node } from './model/node.js';
export type { ValueTable, ValueTableEntry } from './model/value-table.js';
export type { SignalGroup } from './model/signal-group.js';
export type {
  AttributeDef,
  AttributeAssignment,
  AttributeTargetRef,
  RelationAttributeDef,
  RelationAttributeAssignment,
  RelationTargetRef,
  AttrType,
  AttrValue,
  AttrTarget,
  AttrRelTarget,
} from './model/attributes/attribute.js';

// Well-known Vector attribute set (used by the build path for BA_DEF_ auto-completion).
export {
  NETWORK_ATTRIBUTES,
  MESSAGE_ATTRIBUTES,
  SIGNAL_ATTRIBUTES,
  RELATION_ATTRIBUTES,
  NODE_ATTRIBUTES,
  isWellKnownAttribute,
  WELL_KNOWN_TYPES,
} from './model/attributes/well-known-attributes.js';

// Errors
export { ValidationError, ParseError, IOError, UsageError } from './errors.js';
export type { ValidationIssue } from './errors.js';

// DBC reader / writer (Phase 2/3)
export { parseDbc } from './dbc/parser.js';
export { writeDbc } from './dbc/writer.js';
export type { WriteMode, WriteOptions } from './dbc/writer.js';

// Excel reader (async-only). The plan's `parseExcel` sync shim is provided
// as a placeholder that throws; use parseExcelAsync.
export { parseExcelAsync, parseExcel } from './excel/reader.js';

// Excel writer (async; mirrors the reader's parseExcelAsync API).
export { writeExcel } from './excel/writer.js';

// Validator orchestrator (Phase 6)
export { validate } from './validate/validator.js';
export type { ValidationMode, ValidationResult } from './validate/validator.js';

// Diff module (Phase 7)
export { diff, renderDiff } from './diff/index.js';
export type { DiffReport, DiffChange, FieldDiff } from './diff/index.js';

// Network equality (Phase 9)
export { deepEqualNetwork } from './equality.js';
// DBC attribute value encoding.
// DBC stores attribute values as either numeric literals or quoted strings
// depending on the declared type. The two non-obvious conventions are:
//   - ENUM values are stored as the integer index into the values list.
//   - HEX values are stored as decimal integers in the DBC text (e.g. 0xab
//     in memory becomes "171" in the file).
// STRING values use the same backslash-escape rules as C/JSON-ish text.
// FLOAT values are stored as decimal or scientific-notation numeric literals.

import type { AttrType, AttrValue } from '../model/attributes/attribute.js';

/** Convert an in-memory AttrValue into the raw text fragment that appears
 *  in a DBC file. For ENUM types the input is the enum string; for STRING
 *  types the input is the unescaped string; for all numeric types the
 *  input is a number and the output is its decimal text. */
export function encodeAttrValue(value: AttrValue, type: AttrType): string | number {
  if (type.kind === 'enum' && typeof value === 'string') {
    const idx = type.values.indexOf(value);
    if (idx < 0) throw new Error(`unknown enum value "${value}"`);
    return idx;
  }
  if (type.kind === 'string' && typeof value === 'string') {
    return `"${escapeString(value)}"`;
  }
  // For HEX/INT/FLOAT we emit the decimal text representation.
  if (typeof value === 'number') {
    if (type.kind === 'hex') return String(Math.trunc(value));
    return value.toString();
  }
  return value;
}

/** Convert a raw text fragment from a DBC file into the in-memory AttrValue
 *  representation. Inverse of encodeAttrValue. */
export function decodeAttrValue(value: AttrValue, type: AttrType): AttrValue {
  if (type.kind === 'enum' && typeof value === 'number') {
    const v = type.values[value];
    if (v === undefined) throw new Error(`enum index out of range: ${value}`);
    return v;
  }
  if (type.kind === 'string' && typeof value === 'string') {
    return unescapeString(stripQuotes(value));
  }
  if (type.kind === 'float' && typeof value === 'string') {
    return Number(value);
  }
  return value;
}

function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function unescapeString(s: string): string {
  return s.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

function stripQuotes(s: string): string {
  if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
  return s;
}

// Signal = DBC SG_ entry. Multiplexing uses a 4-state discriminated union
// so the validator can statically prevent cross-bucket overlaps.

export type ByteOrder = 'little-endian' | 'big-endian';
export type ValueType = 'unsigned' | 'signed' | 'float' | 'double';

export type Multiplexed =
  | { readonly kind: 'Plain' }
  | { readonly kind: 'Multiplexor' }
  | { readonly kind: 'Muxed'; readonly value: number }
  | { readonly kind: 'ExtendedMuxed'; readonly value: number };

export interface Signal {
  readonly name: string;
  readonly startBit: number;
  readonly length: number;
  readonly byteOrder: ByteOrder;
  readonly valueType: ValueType;
  readonly factor: number;
  readonly offset: number;
  readonly min: number;
  readonly max: number;
  readonly unit: string;
  readonly receivers: readonly string[];
  readonly multiplexed: Multiplexed;
  readonly valueTable?: string;
  readonly comment?: string;
  readonly valueTypeForSignal?: 'Defined' | 'Reserved';
  readonly commentGuards?: readonly string[];
}

// Accept either the canonical Multiplexed object or the shorthand string form
// ('Multiplexor' / 'Plain') for ergonomics. Strings are normalized to the
// discriminated-union shape on construction.
function normalizeMultiplexed(m: Multiplexed | 'Multiplexor' | 'Plain'): Multiplexed {
  if (typeof m === 'string') {
    return m === 'Multiplexor' ? { kind: 'Multiplexor' } : { kind: 'Plain' };
  }
  return m;
}

export function createSignal(args: {
  name: string;
  startBit: number;
  length: number;
  byteOrder: ByteOrder;
  valueType: ValueType;
  factor: number;
  offset: number;
  min: number;
  max: number;
  unit: string;
  receivers: readonly string[];
  multiplexed?: Multiplexed | 'Multiplexor' | 'Plain';
  valueTable?: string;
  comment?: string;
  valueTypeForSignal?: 'Defined' | 'Reserved';
  commentGuards?: readonly string[];
}): Signal {
  return {
    name: args.name,
    startBit: args.startBit,
    length: args.length,
    byteOrder: args.byteOrder,
    valueType: args.valueType,
    factor: args.factor,
    offset: args.offset,
    min: args.min,
    max: args.max,
    unit: args.unit,
    receivers: args.receivers,
    multiplexed: normalizeMultiplexed(args.multiplexed ?? { kind: 'Plain' }),
    ...(args.valueTable !== undefined ? { valueTable: args.valueTable } : {}),
    ...(args.comment !== undefined ? { comment: args.comment } : {}),
    ...(args.valueTypeForSignal !== undefined
      ? { valueTypeForSignal: args.valueTypeForSignal }
      : {}),
    ...(args.commentGuards !== undefined ? { commentGuards: args.commentGuards } : {}),
  };
}

export function isMultiplexor(s: Signal): boolean {
  return s.multiplexed.kind === 'Multiplexor';
}

export function isMuxed(s: Signal): boolean {
  return s.multiplexed.kind === 'Muxed' || s.multiplexed.kind === 'ExtendedMuxed';
}

// Bucket key: Plain signals share one bucket, the Multiplexor shares another,
// each Muxed value gets a bucket named by its value (ExtendedMuxed value
// uses the extmux: prefix to distinguish from a regular Muxed bucket).
export function muxBucket(s: Signal): string {
  switch (s.multiplexed.kind) {
    case 'Plain':
      return 'plain';
    case 'Multiplexor':
      return 'muxor';
    case 'Muxed':
      return String(s.multiplexed.value);
    case 'ExtendedMuxed':
      return `extmux:${s.multiplexed.value}`;
  }
}

/**
 * ⚠️4 frozen 2026-06-18: signal.overlap rules
 *
 * 1. The Multiplexor signal occupies a bit range that MUST NOT overlap any other signal
 *    in the same message (switch is exclusive).
 * 2. Plain (non-multiplexed) signals within a message MUST NOT overlap each other.
 * 3. Muxed signals MAY overlap across different mux buckets; they MUST NOT overlap
 *    within the same bucket (the bucket key is muxBucket(s) — for ExtendedMuxed, this
 *    also includes the extension value).
 * 4. Plain signals MUST NOT overlap with any Muxed signal (plain is always present).
 */

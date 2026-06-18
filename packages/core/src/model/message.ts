// Message = DBC BO_ entry.
// `isExtended` is auto-detected from the CAN ID at construction time:
// id > 0x7ff means 29-bit (CAN 2.0B extended), id <= 0x7ff means 11-bit.

import type { Signal } from './signal.js';

export interface Message {
  readonly id: number;
  readonly name: string;
  readonly dlc: number;
  readonly transmitter: string;
  readonly isExtended: boolean;
  readonly additionalTransmitters: readonly string[];
  readonly signals: readonly Signal[];
  readonly comment?: string;
  readonly muxExtensions?: ReadonlyMap<string, readonly number[]>;
}

export function createMessage(args: {
  id: number;
  name: string;
  dlc: number;
  transmitter: string;
  additionalTransmitters?: readonly string[];
  signals?: readonly Signal[];
  comment?: string;
  muxExtensions?: ReadonlyMap<string, readonly number[]>;
}): Message {
  return {
    id: args.id,
    name: args.name,
    dlc: args.dlc,
    transmitter: args.transmitter,
    isExtended: args.id > 0x7ff,
    additionalTransmitters: args.additionalTransmitters ?? [],
    signals: args.signals ?? [],
    ...(args.comment !== undefined ? { comment: args.comment } : {}),
    ...(args.muxExtensions !== undefined ? { muxExtensions: args.muxExtensions } : {}),
  };
}

// SignalGroup = DBC SIG_GROUP_ entry: a named bundle of signals on one message.
// `repetitions` mirrors the DBC repetition counter (>= 1, default 1).

export interface SignalGroup {
  readonly name: string;
  readonly messageId: number;
  readonly signalNames: readonly string[];
  readonly repetitions: number;
}

export function createSignalGroup(args: {
  name: string;
  messageId: number;
  signalNames: readonly string[];
  repetitions?: number;
}): SignalGroup {
  return {
    name: args.name,
    messageId: args.messageId,
    signalNames: args.signalNames,
    repetitions: args.repetitions ?? 1,
  };
}

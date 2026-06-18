// Node = DBC BU_ entry (a participating ECU / bus unit).
// `address` is optional because not every protocol assigns a numeric
// node address (e.g. CAN gateway without NmStationAddress).

export interface Node {
  readonly name: string;
  readonly address?: number;
  readonly comment?: string;
}

export function createNode(args: { name: string; address?: number; comment?: string }): Node {
  return {
    name: args.name,
    ...(args.address !== undefined ? { address: args.address } : {}),
    ...(args.comment !== undefined ? { comment: args.comment } : {}),
  };
}
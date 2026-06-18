// Network = the top-level immutable container for everything in a DBC file.
// All collections are readonly; mutators (addMessage, addNode) return a new
// Network so consumers can safely share and snapshot it.

import type {
  AttributeAssignment, AttributeDef,
  RelationAttributeAssignment, RelationAttributeDef,
} from './attributes/attribute.js';
import type { Message } from './message.js';
import type { Node } from './node.js';
import type { SignalGroup } from './signal-group.js';
import type { ValueTable } from './value-table.js';

// Comment location is a discriminated union so CM_ scopes (network, node,
// message, signal, value-table, env-var) can be disambiguated by the parser
// without re-parsing strings.
export interface Comment {
  readonly scope:
    | { readonly kind: 'network' }
    | { readonly kind: 'node'; readonly nodeName: string }
    | { readonly kind: 'message'; readonly messageId: number }
    | { readonly kind: 'signal'; readonly messageId: number; readonly signalName: string }
    | { readonly kind: 'valueTable'; readonly valueTableName: string }
    | { readonly kind: 'envVar'; readonly envVarName: string };
  readonly text: string;
}

export interface Network {
  readonly version: string;
  readonly nodes: readonly Node[];
  readonly messages: readonly Message[];
  readonly valueTables: readonly ValueTable[];
  readonly signalGroups: readonly SignalGroup[];
  readonly attributeDefs: readonly AttributeDef[];
  readonly attributeAssignments: readonly AttributeAssignment[];
  readonly relationAttributeDefs: readonly RelationAttributeDef[];
  readonly relationAttributeAssignments: readonly RelationAttributeAssignment[];
  readonly comments: readonly Comment[];
}

export function createNetwork(args: { version: string }): Network {
  return {
    version: args.version,
    nodes: [],
    messages: [],
    valueTables: [],
    signalGroups: [],
    attributeDefs: [],
    attributeAssignments: [],
    relationAttributeDefs: [],
    relationAttributeAssignments: [],
    comments: [],
  };
}

export function addMessage(
  net: Network,
  m: Omit<Message, 'isExtended' | 'additionalTransmitters' | 'signals'> & Partial<Pick<Message, 'additionalTransmitters' | 'signals'>>,
): Network {
  return {
    ...net,
    messages: [
      ...net.messages,
      {
        ...m,
        isExtended: m.id > 0x7ff,
        additionalTransmitters: m.additionalTransmitters ?? [],
        signals: m.signals ?? [],
      },
    ],
  };
}

export function addNode(net: Network, node: Node): Network {
  return { ...net, nodes: [...net.nodes, node] };
}
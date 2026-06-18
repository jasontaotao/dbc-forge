import type {
  AttributeDef,
  AttrValue,
} from '../model/attributes/attribute.js';
import type { Message } from '../model/message.js';
import type { Node } from '../model/node.js';
import type { Signal } from '../model/signal.js';


/** Per-field difference record produced by the differ. */
export type FieldDiff = { field: string; before: unknown; after: unknown };

/** Discriminated union of all change kinds the differ can emit. */
export type DiffChange =
  | { kind: 'message-added'; message: Message }
  | { kind: 'message-removed'; message: Message }
  | { kind: 'message-changed'; id: number; fieldDiffs: FieldDiff[] }
  | { kind: 'signal-added'; messageId: number; signal: Signal }
  | { kind: 'signal-removed'; messageId: number; signal: Signal }
  | { kind: 'signal-changed'; messageId: number; name: string; fieldDiffs: FieldDiff[] }
  | { kind: 'signal-renamed?'; messageId: number; from: string; to: string }
  | { kind: 'attr-def-added' | 'attr-def-removed' | 'attr-def-changed'; name: string; before?: AttributeDef; after?: AttributeDef }
  | { kind: 'attr-value-changed'; target: string; key: string; before: AttrValue | undefined; after: AttrValue | undefined }
  | { kind: 'node-added' | 'node-removed'; node: Node };

/** Summary of counts per change kind plus the full list of changes. */
export interface DiffReport {
  summary: {
    messagesAdded: number;
    messagesRemoved: number;
    messagesChanged: number;
    signalsAdded: number;
    signalsRemoved: number;
    signalsChanged: number;
    attributesChanged: number;
  };
  changes: DiffChange[];
}

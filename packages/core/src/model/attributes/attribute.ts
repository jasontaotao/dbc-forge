// DBC attribute (BA_DEF_ / BA_DEF_REL_) model.
// All DBC attributes are typed and immutable. We use discriminated unions on `kind`
// to keep the value representation in sync with its declared type at the type level.

export type AttrTarget = 'network' | 'message' | 'signal' | 'node';
export type AttrRelTarget = 'node-message' | 'node-signal';

export type AttrType =
  | { readonly kind: 'int'; readonly min: number; readonly max: number }
  | { readonly kind: 'hex'; readonly min: number; readonly max: number }
  | { readonly kind: 'float'; readonly min: number; readonly max: number }
  | { readonly kind: 'string' }
  | { readonly kind: 'enum'; readonly values: readonly string[] };

export type AttrValue = number | string;

export interface AttributeDef {
  readonly name: string;
  readonly target: AttrTarget;
  readonly type: AttrType;
  readonly defaultValue: AttrValue;
}

export interface RelationAttributeDef {
  readonly name: string;
  readonly target: AttrRelTarget;
  readonly type: AttrType;
  readonly defaultValue: AttrValue;
}

export type AttributeTargetRef =
  | { readonly kind: 'network' }
  | { readonly kind: 'message'; readonly messageId: number }
  | { readonly kind: 'signal'; readonly messageId: number; readonly signalName: string }
  | { readonly kind: 'node'; readonly nodeName: string };

export interface AttributeAssignment {
  readonly name: string;
  readonly target: AttributeTargetRef;
  readonly value: AttrValue;
}

export type RelationTargetRef =
  | {
      readonly kind: 'node-message';
      readonly nodeName: string;
      readonly messageId: number;
    }
  | {
      readonly kind: 'node-signal';
      readonly nodeName: string;
      readonly messageId: number;
      readonly signalName: string;
    };

export interface RelationAttributeAssignment {
  readonly name: string;
  readonly target: RelationTargetRef;
  readonly value: AttrValue;
}

import { describe, it, expect, expectTypeOf } from 'vitest';

import type {
  AttrTarget,
  AttrType,
  AttributeDef,
  AttributeAssignment,
  RelationAttributeDef,
  RelationAttributeAssignment,
} from '../../../src/model/attributes/attribute.js';

describe('attribute types', () => {
  it('AttrTarget covers all 4 targets', () => {
    const targets: AttrTarget[] = ['network', 'message', 'signal', 'node'];
    expect(targets).toHaveLength(4);
  });

  it('AttrType is a discriminated union (compile-time check)', () => {
    expectTypeOf<AttrType>().toMatchTypeOf<
      | { kind: 'int'; min: number; max: number }
      | { kind: 'hex'; min: number; max: number }
      | { kind: 'float'; min: number; max: number }
      | { kind: 'string' }
      | { kind: 'enum'; values: string[] }
    >();
  });

  it('AttributeDef holds target + type + default', () => {
    const def: AttributeDef = {
      name: 'GenMsgCycleTime',
      target: 'message',
      type: { kind: 'int', min: 0, max: 65535 },
      defaultValue: 0,
    };
    expect(def.name).toBe('GenMsgCycleTime');
  });

  it('RelationAttributeDef targets rel-only', () => {
    const def: RelationAttributeDef = {
      name: 'GenSigTimeoutTime',
      target: 'node-signal',
      type: { kind: 'int', min: 0, max: 65535 },
      defaultValue: 0,
    };
    expect(def.target).toBe('node-signal');
  });

  it('AttributeAssignment.target is a discriminated union', () => {
    const a1: AttributeAssignment = {
      name: 'GenMsgCycleTime',
      target: { kind: 'message', messageId: 0x100 },
      value: 100,
    };
    const a2: AttributeAssignment = {
      name: 'BusType',
      target: { kind: 'network' },
      value: 'CAN',
    };
    expect(a1.target.kind).toBe('message');
    expect(a2.target.kind).toBe('network');
  });

  it('RelationAttributeAssignment target includes node', () => {
    const a: RelationAttributeAssignment = {
      name: 'GenSigTimeoutTime',
      target: { kind: 'node-signal', nodeName: 'BCM', messageId: 0x100, signalName: 'X' },
      value: 500,
    };
    expect(a.target.kind).toBe('node-signal');
  });
});

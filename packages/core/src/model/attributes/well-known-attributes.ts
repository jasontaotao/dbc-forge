// Well-known Vector DBC attribute set.
// These names correspond to attributes that Vector CANdb++ / CANoe declare
// out-of-the-box. The build path uses them to auto-complete missing BA_DEF_
// declarations; the extract path preserves them when present.

import type { AttrTarget, AttrRelTarget, AttrType, AttrValue } from './attribute.js';

export const NETWORK_ATTRIBUTES = [
  'BusType', 'Baudrate', 'DBName', 'ProtocolType', 'NmType', 'NmBaseAddress',
] as const;

export const MESSAGE_ATTRIBUTES = [
  'GenMsgCycleTime', 'GenMsgSendType', 'GenMsgStartDelayTime', 'GenMsgDelayTime',
  'GenMsgNrOfRepetition', 'VFrameFormat', 'DiagState', 'DiagRequest', 'DiagResponse',
] as const;

export const SIGNAL_ATTRIBUTES = [
  'GenSigStartValue', 'GenSigSendType', 'GenSigInactiveValue', 'GenSigTimeoutValue',
] as const;

export const RELATION_ATTRIBUTES = ['GenSigTimeoutTime'] as const;

export const NODE_ATTRIBUTES = [
  'NmStationAddress', 'NmNode', 'NmMessageCount', 'ILUsed', 'NodeLayerModules',
] as const;

const ALL = new Set<string>([
  ...NETWORK_ATTRIBUTES, ...MESSAGE_ATTRIBUTES, ...SIGNAL_ATTRIBUTES,
  ...NODE_ATTRIBUTES, ...RELATION_ATTRIBUTES,
]);

export function isWellKnownAttribute(name: string): boolean {
  return ALL.has(name);
}

// Default type + target + value for every well-known attribute.
// The build writer uses this map to emit a missing BA_DEF_ + BA_DEF_DEF_ pair
// before the first BA_ assignment; see ⚠️5 freeze in core/README.md.
export const WELL_KNOWN_TYPES: ReadonlyMap<string, { target: AttrTarget | AttrRelTarget; type: AttrType; defaultValue: AttrValue }> = new Map([
  ['BusType', { target: 'network', type: { kind: 'enum', values: ['CAN', 'FlexRay', 'LIN', 'MOST'] }, defaultValue: 'CAN' }],
  ['Baudrate', { target: 'network', type: { kind: 'int', min: 0, max: 1_000_000 }, defaultValue: 500000 }],
  ['DBName', { target: 'network', type: { kind: 'string' }, defaultValue: '' }],
  ['ProtocolType', { target: 'network', type: { kind: 'enum', values: ['CAN', 'J1939', 'CANopen', 'TTP'] }, defaultValue: 'CAN' }],
  ['GenMsgCycleTime', { target: 'message', type: { kind: 'int', min: 0, max: 65535 }, defaultValue: 0 }],
  ['GenMsgSendType', { target: 'message', type: { kind: 'enum', values: ['Cyclic', 'NotUsed', 'NotDefined', 'CyclicAndSpontaneous', 'CyclicIfActive', 'Spontaneous', 'CyclicAndSpontaneousIfActive', 'CyclicIfActiveAndSpontaneous'] }, defaultValue: 'NotUsed' }],
  ['GenMsgStartDelayTime', { target: 'message', type: { kind: 'int', min: 0, max: 65535 }, defaultValue: 0 }],
  ['GenMsgDelayTime', { target: 'message', type: { kind: 'int', min: 0, max: 65535 }, defaultValue: 0 }],
  ['GenMsgNrOfRepetition', { target: 'message', type: { kind: 'int', min: 0, max: 65535 }, defaultValue: 0 }],
  ['VFrameFormat', { target: 'message', type: { kind: 'enum', values: ['StandardCAN', 'ExtendedCAN', 'reserved', 'reserved2', 'StandardCAN_FD', 'ExtendedCAN_FD', 'reserved3', 'reserved4'] }, defaultValue: 'StandardCAN' }],
  ['GenSigStartValue', { target: 'signal', type: { kind: 'float', min: -1e9, max: 1e9 }, defaultValue: 0 }],
  ['GenSigSendType', { target: 'signal', type: { kind: 'enum', values: ['Cyclic', 'NotUsed', 'NotDefined', 'CyclicAndSpontaneous', 'CyclicIfActive', 'Spontaneous', 'CyclicAndSpontaneousIfActive', 'CyclicIfActiveAndSpontaneous'] }, defaultValue: 'NotUsed' }],
  ['GenSigInactiveValue', { target: 'signal', type: { kind: 'float', min: -1e9, max: 1e9 }, defaultValue: 0 }],
  ['GenSigTimeoutValue', { target: 'signal', type: { kind: 'float', min: -1e9, max: 1e9 }, defaultValue: 0 }],
  ['GenSigTimeoutTime', { target: 'node-signal', type: { kind: 'int', min: 0, max: 65535 }, defaultValue: 0 }],
]);
import { describe, it, expect } from 'vitest';

import {
  createNetwork,
  addAttributeAssignment,
  addAttributeDef,
} from '../../../src/model/network.js';
import { attrDefMissing } from '../../../src/validate/rules/attr-def-missing.js';

describe('attr-def-missing', () => {
  it('passes when assignment has matching def', () => {
    let net = createNetwork({ version: '1.0' });
    net = addAttributeDef(net, { name: 'BusType', target: 'network', type: { kind: 'string' }, defaultValue: '' });
    net = addAttributeAssignment(net, { name: 'BusType', target: { kind: 'network' }, value: 'CAN' });
    expect(attrDefMissing.check(net)).toHaveLength(0);
  });

  it('fires when assignment has no matching def', () => {
    let net = createNetwork({ version: '1.0' });
    net = addAttributeAssignment(net, { name: 'Custom', target: { kind: 'network' }, value: 'x' });
    const issues = attrDefMissing.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('attr.def-missing');
    expect(issues[0]!.severity).toBe('error');
  });

  it('reports messageId in location for message target', () => {
    let net = createNetwork({ version: '1.0' });
    net = addAttributeAssignment(net, { name: 'Custom', target: { kind: 'message', messageId: 0x100 }, value: 1 });
    const issues = attrDefMissing.check(net);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.location).toEqual({ messageId: 0x100 });
  });

  it('reports messageId + signalName for signal target', () => {
    let net = createNetwork({ version: '1.0' });
    net = addAttributeAssignment(net, {
      name: 'Custom', target: { kind: 'signal', messageId: 0x100, signalName: 'S1' }, value: 1,
    });
    const issues = attrDefMissing.check(net);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.location).toEqual({ messageId: 0x100, signalName: 'S1' });
  });

  it('reports nodeName for node target', () => {
    let net = createNetwork({ version: '1.0' });
    net = addAttributeAssignment(net, { name: 'Custom', target: { kind: 'node', nodeName: 'ECU1' }, value: 1 });
    const issues = attrDefMissing.check(net);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.location).toEqual({ nodeName: 'ECU1' });
  });

  it('deduplicates same name+target across multiple assignments', () => {
    let net = createNetwork({ version: '1.0' });
    net = addAttributeAssignment(net, { name: 'Custom', target: { kind: 'network' }, value: 'a' });
    net = addAttributeAssignment(net, { name: 'Custom', target: { kind: 'network' }, value: 'b' });
    const issues = attrDefMissing.check(net);
    expect(issues).toHaveLength(1);
  });

  it('returns empty for empty Network', () => {
    const net = createNetwork({ version: '1.0' });
    expect(attrDefMissing.check(net)).toHaveLength(0);
  });
});

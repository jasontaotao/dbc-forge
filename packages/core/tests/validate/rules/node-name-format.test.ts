import { describe, it, expect } from 'vitest';

import {
  createNetwork,
  addNode,
} from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { nodeNameFormat } from '../../../src/validate/rules/node-name-format.js';

describe('node-name-format', () => {
  it('passes for valid node names', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addNode(net, createNode({ name: 'Gateway_1' }));
    expect(nodeNameFormat.check(net)).toHaveLength(0);
  });

  it('fires for invalid characters', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: '1BCM' }));
    const issues = nodeNameFormat.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('node.name-format');
    expect(issues[0]!.severity).toBe('error');
    expect(issues[0]!.location.nodeName).toBe('1BCM');
  });

  it('fires when name is longer than 32 chars', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'A'.repeat(33) }));
    const issues = nodeNameFormat.check(net);
    expect(issues.length).toBeGreaterThan(0);
  });
});

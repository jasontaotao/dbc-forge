import { describe, it, expect } from 'vitest';

import {
  createNetwork,
  addNode,
} from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { nodeNameDuplicate } from '../../../src/validate/rules/node-name-duplicate.js';

describe('node-name-duplicate', () => {
  it('passes for unique node names', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addNode(net, createNode({ name: 'GW' }));
    expect(nodeNameDuplicate.check(net)).toHaveLength(0);
  });

  it('fires when two nodes share a name', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addNode(net, createNode({ name: 'BCM' }));
    const issues = nodeNameDuplicate.check(net);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.rule).toBe('node.name-duplicate');
    expect(issues[0]!.severity).toBe('error');
    expect(issues[0]!.location.nodeName).toBe('BCM');
  });
});

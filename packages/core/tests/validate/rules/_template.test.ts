import { describe, it, expect } from 'vitest';

import { createNetwork } from '../../../src/model/network.js';
import { ruleTemplate } from '../../../src/validate/rules/_template.js';

describe('rule template (deleted in Phase 9.5.1)', () => {
  it('has the expected shape', () => {
    expect(ruleTemplate.id).toBe('template.example-rule');
    expect(ruleTemplate.severity).toBe('warning');
    expect(typeof ruleTemplate.check).toBe('function');
  });

  it('returns no issues for an empty network', () => {
    const net = createNetwork({ version: '' });
    expect(ruleTemplate.check(net)).toHaveLength(0);
  });
});

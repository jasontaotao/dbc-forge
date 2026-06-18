import { describe, it, expect } from 'vitest';

import { diff } from '../../src/diff/differ.js';
import { renderDiff } from '../../src/diff/render.js';
import { createNetwork, addMessage } from '../../src/model/network.js';

describe('renderDiff', () => {
  it('renders text format with Chinese summary', () => {
    const a = createNetwork({ version: '1.0' });
    const b = addMessage(a, { id: 0x100, name: 'M', dlc: 8, transmitter: 'N' });
    const report = diff(a, b);
    const text = renderDiff(report, 'text');
    expect(text).toContain('网络差异报告');
    expect(text).toContain('Message:');
  });

  it('renders JSON format', () => {
    const a = createNetwork({ version: '1.0' });
    const b = addMessage(a, { id: 0x100, name: 'M', dlc: 8, transmitter: 'N' });
    const report = diff(a, b);
    const json = renderDiff(report, 'json');
    const parsed = JSON.parse(json);
    expect(parsed.summary.messagesAdded).toBe(1);
  });
});

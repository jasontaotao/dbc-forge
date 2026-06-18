import { describe, it, expect } from 'vitest';
import { renderIssues } from '../../src/render/issues.js';
import type { ValidationIssue } from '@dbc-forge/core';

describe('renderIssues', () => {
  it('returns empty string for empty issues', () => {
    expect(renderIssues([])).toBe('');
  });

  it('renders a simple error with rule and message', () => {
    const issues: ValidationIssue[] = [
      {
        rule: 'signal-name-required',
        severity: 'error',
        location: {},
        message: 'Signal must have a name',
      },
    ];
    const out = renderIssues(issues);
    expect(out).toContain('[错误]');
    expect(out).toContain('signal-name-required');
    expect(out).toContain('Signal must have a name');
  });

  it('renders a warning with [警告] tag', () => {
    const issues: ValidationIssue[] = [
      {
        rule: 'unused-node',
        severity: 'warning',
        location: {},
        message: 'Node has no associated messages',
      },
    ];
    const out = renderIssues(issues);
    expect(out).toContain('[警告]');
  });

  it('formats location: sheet and row', () => {
    const issues: ValidationIssue[] = [
      {
        rule: 'message-id-format',
        severity: 'error',
        location: { sheet: 'Messages', row: 5 },
        message: 'Bad ID',
      },
    ];
    const out = renderIssues(issues);
    expect(out).toContain('sheet=Messages');
    expect(out).toContain('row=5');
  });

  it('formats location: messageId as hex', () => {
    const issues: ValidationIssue[] = [
      {
        rule: 'message-id-format',
        severity: 'error',
        location: { messageId: 256 },
        message: 'Bad ID',
      },
    ];
    const out = renderIssues(issues);
    expect(out).toContain('msg=0x100');
  });

  it('formats location: signalName and nodeName', () => {
    const issues: ValidationIssue[] = [
      {
        rule: 'signal-bit-length',
        severity: 'error',
        location: { signalName: 'Speed', nodeName: 'ECM' },
        message: 'Width exceeds message size',
      },
    ];
    const out = renderIssues(issues);
    expect(out).toContain('signal=Speed');
    expect(out).toContain('node=ECM');
  });

  it('renders multiple issues separated by newlines', () => {
    const issues: ValidationIssue[] = [
      { rule: 'a', severity: 'error', location: {}, message: 'm1' },
      { rule: 'b', severity: 'warning', location: {}, message: 'm2' },
    ];
    const out = renderIssues(issues);
    expect(out.split('\n').length).toBeGreaterThan(1);
    expect(out).toContain('a');
    expect(out).toContain('b');
  });
});

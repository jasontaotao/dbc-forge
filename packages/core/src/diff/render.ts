// Render a DiffReport as either pretty text (Chinese summary headers) or JSON.
// Kept as a separate file from differ.ts so that consumers can pick the differ
// without pulling the renderer (and vice versa) into their bundle.

import type { DiffReport, DiffChange } from './types.js';

export function renderDiff(report: DiffReport, format: 'text' | 'json'): string {
  if (format === 'json') {
    return JSON.stringify(report, null, 2);
  }
  return renderText(report);
}

function renderText(report: DiffReport): string {
  const lines: string[] = [];
  lines.push('=== 网络差异报告 ===');
  lines.push('');
  lines.push(
    `Message: +${report.summary.messagesAdded} / -${report.summary.messagesRemoved} / ~${report.summary.messagesChanged}`,
  );
  lines.push(
    `Signal:  +${report.summary.signalsAdded} / -${report.summary.signalsRemoved} / ~${report.summary.signalsChanged}`,
  );
  lines.push(`Attribute: ${report.summary.attributesChanged}`);
  lines.push('');

  for (const change of report.changes) {
    const prefix = changePrefix(change);
    lines.push(`${prefix} ${renderChangeSummary(change)}`);
    if ('fieldDiffs' in change) {
      for (const fd of change.fieldDiffs) {
        lines.push(`        ${fd.field}: ${formatValue(fd.before)} → ${formatValue(fd.after)}`);
      }
    }
  }
  return lines.join('\n');
}

function changePrefix(c: DiffChange): string {
  if (c.kind.endsWith('-added')) return '[+]';
  if (c.kind.endsWith('-removed')) return '[-]';
  if (c.kind === 'signal-renamed?') return '[?]';
  return '[~]';
}

function renderChangeSummary(c: DiffChange): string {
  switch (c.kind) {
    case 'message-added':
      return `Message added: 0x${c.message.id.toString(16)} ${c.message.name}`;
    case 'message-removed':
      return `Message removed: 0x${c.message.id.toString(16)} ${c.message.name}`;
    case 'message-changed':
      return `Message changed: 0x${c.id.toString(16)} (${c.fieldDiffs.length} field${c.fieldDiffs.length === 1 ? '' : 's'})`;
    case 'signal-added':
      return `Signal added: msg 0x${c.messageId.toString(16)} "${c.signal.name}"`;
    case 'signal-removed':
      return `Signal removed: msg 0x${c.messageId.toString(16)} "${c.signal.name}"`;
    case 'signal-changed':
      return `Signal changed: msg 0x${c.messageId.toString(16)} "${c.name}" (${c.fieldDiffs.length} field${c.fieldDiffs.length === 1 ? '' : 's'})`;
    case 'signal-renamed?':
      return `Signal renamed? msg 0x${c.messageId.toString(16)}: "${c.from}" → "${c.to}"`;
    case 'attr-def-added':
      return `AttributeDef added: "${c.name}"`;
    case 'attr-def-removed':
      return `AttributeDef removed: "${c.name}"`;
    case 'attr-def-changed':
      return `AttributeDef changed: "${c.name}"`;
    case 'attr-value-changed':
      return `Attribute value changed: ${c.target} ${c.key}: ${formatValue(c.before)} → ${formatValue(c.after)}`;
    case 'node-added':
      return `Node added: "${c.node.name}"`;
    case 'node-removed':
      return `Node removed: "${c.node.name}"`;
  }
}

function formatValue(v: unknown): string {
  if (v === undefined) return '(none)';
  if (typeof v === 'string') return `"${v}"`;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

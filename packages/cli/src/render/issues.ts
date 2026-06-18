import type { ValidationIssue } from '@dbc-forge/core';

/**
 * Render a list of validation issues into a multi-line, human-readable
 * string suitable for stderr. Each issue is prefixed with a severity tag
 * ([错误] or [警告]) and includes the rule name plus a compact location.
 */
export function renderIssues(issues: readonly ValidationIssue[]): string {
  return issues
    .map((i) => {
      const loc = formatLocation(i.location);
      const sev = i.severity === 'error' ? '[错误]' : '[警告]';
      const locPart = loc ? ` (${loc})` : '';
      return `${sev} ${i.rule}${locPart}\n        ${i.message}`;
    })
    .join('\n');
}

function formatLocation(loc: ValidationIssue['location']): string {
  const parts: string[] = [];
  if (loc.sheet) parts.push(`sheet=${loc.sheet}`);
  if (loc.row !== undefined) parts.push(`row=${loc.row}`);
  if (loc.messageId !== undefined) parts.push(`msg=0x${loc.messageId.toString(16).toUpperCase()}`);
  if (loc.signalName) parts.push(`signal=${loc.signalName}`);
  if (loc.nodeName) parts.push(`node=${loc.nodeName}`);
  return parts.join(' ');
}

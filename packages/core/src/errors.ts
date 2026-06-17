export interface ValidationIssue {
  rule: string;
  severity: 'error' | 'warning';
  location: {
    sheet?: string;
    row?: number;
    messageId?: number;
    signalName?: string;
    nodeName?: string;
  };
  message: string;
}

export class ValidationError extends Error {
  override readonly name = 'ValidationError' as const;
  constructor(public readonly issues: ValidationIssue[]) {
    super(`validation failed with ${issues.length} issue(s)`);
  }
}

export class ParseError extends Error {
  override readonly name = 'ParseError' as const;
  readonly line: number;
  readonly column: number;
  constructor(message: string, location: { line: number; column: number }) {
    super(`${message} at line ${location.line}:${location.column}`);
    this.line = location.line;
    this.column = location.column;
  }
}

export class IOError extends Error {
  override readonly name = 'IOError' as const;
  readonly path: string;
  override readonly cause?: unknown;
  constructor(message: string, context: { path: string; cause?: unknown }) {
    super(`${message}: ${context.path}`);
    this.path = context.path;
    if (context.cause !== undefined) {
      this.cause = context.cause;
    }
  }
}

export class UsageError extends Error {
  override readonly name = 'UsageError' as const;
  readonly hint?: string;
  constructor(message: string, context: { hint?: string } = {}) {
    super(message);
    if (context.hint !== undefined) {
      this.hint = context.hint;
    }
  }
}

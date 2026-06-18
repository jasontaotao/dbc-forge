import { ValidationError, ParseError, IOError, UsageError } from '@dbc-forge/core';

export interface RenderedError {
  message: string;
  code: 1 | 2 | 3;
}

/**
 * Convert an unknown thrown value into a human-readable CLI message plus
 * an exit code. Exits codes:
 *   1 = validation / parse failure
 *   2 = I/O error (file not found, permission denied, etc.)
 *   3 = usage error (bad args, missing required option)
 */
export function renderError(err: unknown): RenderedError {
  if (err instanceof UsageError) {
    const hint = err.hint ? `\n提示: ${err.hint}` : '';
    return { message: `参数错误: ${err.message}${hint}`, code: 3 };
  }
  if (err instanceof IOError) {
    return { message: `I/O 错误: ${err.message} (${err.path})`, code: 2 };
  }
  if (err instanceof ParseError) {
    return { message: `解析错误: ${err.message}`, code: 1 };
  }
  if (err instanceof ValidationError) {
    return { message: `校验失败: ${err.issues.length} 个问题`, code: 1 };
  }
  const msg = err instanceof Error ? err.message : String(err);
  return { message: `未知错误: ${msg}`, code: 1 };
}

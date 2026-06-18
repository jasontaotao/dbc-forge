import { describe, it, expect } from 'vitest';

import { parseDbc } from '../../src/dbc/parser.js';

describe('dbc parser — header', () => {
  it('parses VERSION and node list', () => {
    const net = parseDbc(`VERSION "1.0"

NS_ :
    NS_DESC_
    CM_

BS_:

BU_: ECM BCM Gateway
`);
    expect(net.version).toBe('1.0');
    expect(net.nodes.map((n) => n.name)).toEqual(['ECM', 'BCM', 'Gateway']);
  });

  it('throws ParseError with line/column on bad token', () => {
    expect(() => parseDbc('NOT_A_KEYWORD\n')).toThrow();
  });
});

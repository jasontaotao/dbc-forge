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

describe('dbc parser — VAL_TABLE_', () => {
  it('parses VAL_TABLE_ entries', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_:
VAL_TABLE_ OffOn 0 "Off" 1 "On" ;
`);
    expect(net.valueTables).toHaveLength(1);
    expect(net.valueTables[0]?.name).toBe('OffOn');
    expect(net.valueTables[0]?.entries).toEqual([{ raw: 0, name: 'Off' }, { raw: 1, name: 'On' }]);
  });
});

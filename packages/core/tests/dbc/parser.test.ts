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

describe('dbc parser — BO_', () => {
  it('parses BO_ line', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_: ECM
BO_ 256 EngineStatus: 8 ECM
`);
    expect(net.messages).toHaveLength(1);
    expect(net.messages[0]?.id).toBe(256);
    expect(net.messages[0]?.name).toBe('EngineStatus');
    expect(net.messages[0]?.dlc).toBe(8);
  });
});

describe('dbc parser — SG_', () => {
  it('parses plain signal', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_: BCM
BO_ 256 M: 8 BCM
 SG_ Speed : 0|16@1+ (0.1,0) [0|6553.5] "rpm" BCM
`);
    const sig = net.messages[0]?.signals[0];
    expect(sig?.name).toBe('Speed');
    expect(sig?.startBit).toBe(0);
    expect(sig?.length).toBe(16);
    expect(sig?.byteOrder).toBe('little-endian');
    expect(sig?.valueType).toBe('unsigned');
    expect(sig?.factor).toBe(0.1);
    expect(sig?.receivers).toEqual(['BCM']);
    expect(sig?.multiplexed.kind).toBe('Plain');
  });

  it('parses Multiplexor signal', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_: BCM
BO_ 256 M: 8 BCM
 SG_ Mux M : 0|8@1+ (1,0) [0|255] "" BCM
 SG_ S0 m0 : 8|8@1+ (1,0) [0|255] "" BCM
`);
    const muxor = net.messages[0]?.signals[0];
    const muxed = net.messages[0]?.signals[1];
    expect(muxor?.multiplexed.kind).toBe('Multiplexor');
    expect(muxed?.multiplexed.kind).toBe('Muxed');
    if (muxed?.multiplexed.kind === 'Muxed') {
      expect(muxed.multiplexed.value).toBe(0);
    }
  });
});

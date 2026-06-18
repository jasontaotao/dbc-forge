import { describe, it, expect } from 'vitest';

import { parseDbc } from '../../src/dbc/parser.js';
import { writeDbc } from '../../src/dbc/writer.js';
import { addNode, createNetwork } from '../../src/model/network.js';

describe('dbc writer — header', () => {
  it('emits VERSION + NS_ + BS_ + BU_', () => {
    const n0 = createNetwork({ version: '1.0' });
    const n1 = addNode(n0, { name: 'ECM' });
    const out = writeDbc(n1);
    expect(out).toMatch(/^VERSION "1\.0"/);
    expect(out).toMatch(/NS_ :/);
    expect(out).toMatch(/BS_:/);
    expect(out).toMatch(/BU_: ECM/);
  });

  it('emits multiple nodes in BU_', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, { name: 'ECM' });
    net = addNode(net, { name: 'BCM' });
    const out = writeDbc(net);
    expect(out).toMatch(/BU_: ECM BCM/);
  });
});

describe('dbc writer — VAL_TABLE_', () => {
  it('emits VAL_TABLE_ entries', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_:
VAL_TABLE_ OffOn 0 "Off" 1 "On" ;
`);
    const out = writeDbc(net, { mode: 'extract' });
    expect(out).toMatch(/VAL_TABLE_ OffOn 0 "Off" 1 "On" ;/);
  });
});

describe('dbc writer — BO_ + SG_', () => {
  it('emits plain signal', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_: BCM
BO_ 256 M: 8 BCM
 SG_ Speed : 0|16@1+ (0.1,0) [0|6553.5] "rpm" BCM
`);
    const out = writeDbc(net, { mode: 'extract' });
    expect(out).toMatch(/BO_ 256 M: 8 BCM/);
    expect(out).toMatch(/SG_ Speed : 0\|16@1\+ \(0\.1,0\) \[0\|6553\.5\] "rpm" BCM/);
  });

  it('emits BO_ + SG_ with mux', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_: BCM ECM
BO_ 256 M: 8 ECM
 SG_ Mux M : 0|8@1+ (1,0) [0|255] "" BCM
 SG_ Speed m0M : 8|16@1+ (0.1,0) [0|6553.5] "rpm" BCM
`);
    const out = writeDbc(net, { mode: 'extract' });
    expect(out).toMatch(/BO_ 256 M: 8 ECM/);
    expect(out).toMatch(/SG_ Mux M :/);
    expect(out).toMatch(/SG_ Speed m0M :/);
  });

  it('emits signed big-endian signal', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_: BCM
BO_ 256 M: 8 BCM
 SG_ EngineTemp : 16|8@0- (1,-40) [-40|215] "degC" BCM
`);
    const out = writeDbc(net, { mode: 'extract' });
    expect(out).toMatch(/SG_ EngineTemp : 16\|8@0- \(1,-40\) \[-40\|215\] "degC" BCM/);
  });
});

describe('dbc writer — BO_TX_BU_', () => {
  it('emits BO_TX_BU_ for additional transmitters', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_: ECM BCM Gateway
BO_ 256 M: 8 ECM
BO_TX_BU_ 256 : BCM,Gateway;
`);
    const out = writeDbc(net, { mode: 'extract' });
    expect(out).toMatch(/BO_TX_BU_ 256 : BCM,Gateway;/);
  });
});

describe('dbc writer — SIG_VALTYPE_', () => {
  it('emits SIG_VALTYPE_ for Reserved', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_: BCM
BO_ 256 M: 8 BCM
 SG_ Rsv : 0|8@1+ (1,0) [0|255] "" BCM
SIG_VALTYPE_ 256 Rsv : 1;
`);
    const out = writeDbc(net, { mode: 'extract' });
    expect(out).toMatch(/SIG_VALTYPE_ 256 Rsv : 1;/);
  });
});

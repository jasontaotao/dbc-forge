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

describe('dbc writer — VAL_', () => {
  it('emits VAL_ entries for signal value tables', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_: BCM
BO_ 256 M: 8 BCM
 SG_ Status : 0|8@1+ (1,0) [0|2] "" BCM
VAL_ 256 Status 0 "Off" 1 "On" 2 "Auto" ;
`);
    const out = writeDbc(net, { mode: 'extract' });
    expect(out).toMatch(/VAL_ 256 Status 0 "Off" 1 "On" 2 "Auto" ;/);
  });
});

describe('dbc writer — BA_DEF_ + BA_ + CM_', () => {
  it('emits BA_DEF_ + BA_DEF_DEF_ + BA_ + CM_', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_: BCM ECM

CM_ "Network comment";

BA_DEF_  BO_  "GenMsgCycleTime" INT 0 65535;
BA_DEF_DEF_  "GenMsgCycleTime" 0;
BA_ "GenMsgCycleTime" BO_ 256 100;
BO_ 256 M: 8 ECM
 SG_ Status : 0|8@1+ (1,0) [0|2] "" BCM
VAL_ 256 Status 0 "Off" 1 "On" 2 "Auto" ;
`);
    const out = writeDbc(net, { mode: 'extract' });
    expect(out).toMatch(/CM_ "Network comment";/);
    expect(out).toMatch(/BA_DEF_ {2}BO_ {2}"GenMsgCycleTime" INT 0 65535;/);
    expect(out).toMatch(/BA_DEF_DEF_ {2}"GenMsgCycleTime" 0;/);
    expect(out).toMatch(/BA_ "GenMsgCycleTime" BO_ 256 100;/);
  });

  it('emits ENUM BA_DEF_', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_:
BA_DEF_  BO_  "GenMsgSendType" ENUM  "Cyclic","NotUsed","NotDefined";
BA_DEF_DEF_  "GenMsgSendType" "NotUsed";
`);
    const out = writeDbc(net, { mode: 'extract' });
    expect(out).toMatch(/BA_DEF_ {2}BO_ {2}"GenMsgSendType" ENUM {2}"Cyclic","NotUsed","NotDefined";/);
  });

  it('emits STRING BA_DEF_', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_:
BA_DEF_  "BusName" STRING;
BA_DEF_DEF_  "BusName" "";
`);
    const out = writeDbc(net, { mode: 'extract' });
    expect(out).toMatch(/BA_DEF_ {2}"BusName" STRING;/);
  });

  it('emits BA_ for signal and node targets', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_: ECM
BA_DEF_  SG_  "GenSigStartValue" FLOAT -1e9 1e9;
BA_DEF_DEF_  "GenSigStartValue" 0;
BA_ "GenSigStartValue" SG_ 256 Speed 0.5;
BA_ "NmStationAddress" BU_ ECM 1;
BO_ 256 M: 8 ECM
 SG_ Speed : 0|16@1+ (0.1,0) [0|6553.5] "rpm" ECM
`);
    const out = writeDbc(net, { mode: 'extract' });
    expect(out).toMatch(/BA_ "GenSigStartValue" SG_ 256 Speed 0\.5;/);
    expect(out).toMatch(/BA_ "NmStationAddress" BU_ ECM 1;/);
  });

  it('emits CM_ for message scope', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_: ECM

CM_ BO_ 256 "Engine status message";

BO_ 256 M: 8 ECM
 SG_ Speed : 0|16@1+ (0.1,0) [0|6553.5] "rpm" ECM
`);
    const out = writeDbc(net, { mode: 'extract' });
    expect(out).toMatch(/CM_ BO_ 256 "Engine status message";/);
  });

  it('emits CM_ for signal scope', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_: ECM
BO_ 256 M: 8 ECM
 SG_ Speed : 0|16@1+ (0.1,0) [0|6553.5] "rpm" ECM

CM_ SG_ 256 Speed "Engine speed in rpm";
`);
    const out = writeDbc(net, { mode: 'extract' });
    expect(out).toMatch(/CM_ SG_ 256 Speed "Engine speed in rpm";/);
  });
});

describe('dbc writer — SIG_GROUP_', () => {
  it('emits SIG_GROUP_', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_:
BO_ 256 M: 8 Vector__XXX
 SG_ S1 : 0|8@1+ (1,0) [0|255] "" Vector__XXX
 SG_ S2 : 8|8@1+ (1,0) [0|255] "" Vector__XXX
SIG_GROUP_ 256 SG_Engine 1 2 : 1;
`);
    const out = writeDbc(net, { mode: 'extract' });
    expect(out).toMatch(/SIG_GROUP_ 256 SG_Engine 1 2 : 1;/);
  });
});

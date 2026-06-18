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

describe('dbc parser — BA_DEF_', () => {
  it('parses BA_DEF_ for INT', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_:
BA_DEF_  BO_  "GenMsgCycleTime" INT 0 65535;
BA_DEF_DEF_  "GenMsgCycleTime" 0;
`);
    expect(net.attributeDefs).toHaveLength(1);
    expect(net.attributeDefs[0]?.name).toBe('GenMsgCycleTime');
    expect(net.attributeDefs[0]?.type.kind).toBe('int');
  });
});

describe('dbc parser — BA_', () => {
  it('parses BA_ for message attribute', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_:
BA_DEF_  BO_  "GenMsgCycleTime" INT 0 65535;
BA_DEF_DEF_  "GenMsgCycleTime" 0;
BA_ "GenMsgCycleTime" BO_ 256 100;
`);
    expect(net.attributeAssignments).toHaveLength(1);
    expect(net.attributeAssignments[0]?.name).toBe('GenMsgCycleTime');
    expect(net.attributeAssignments[0]?.target).toEqual({ kind: 'message', messageId: 256 });
    expect(net.attributeAssignments[0]?.value).toBe(100);
  });
});

describe('dbc parser — CM_', () => {
  it('parses CM_ at network level', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_:
CM_ "This is a network comment";
`);
    expect(net.comments).toHaveLength(1);
    expect(net.comments[0]?.scope).toEqual({ kind: 'network' });
    expect(net.comments[0]?.text).toBe('This is a network comment');
  });
});

describe('dbc parser — VAL_', () => {
  it('parses VAL_ entries to message signal value table', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_: BCM
BO_ 256 M: 8 BCM
 SG_ Status : 0|8@1+ (1,0) [0|2] "" BCM
VAL_ 256 Status 0 "Off" 1 "On" 2 "Auto" ;
`);
    const sig = net.messages[0]?.signals[0];
    expect(sig?.valueTable).toBeDefined();
    const vt = net.valueTables.find((v) => v.name === sig?.valueTable);
    expect(vt?.entries).toEqual([
      { raw: 0, name: 'Off' }, { raw: 1, name: 'On' }, { raw: 2, name: 'Auto' },
    ]);
  });
});

describe('dbc parser — SIG_GROUP_', () => {
  it('parses SIG_GROUP_', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_:
SIG_GROUP_ 256 SG_Engine 1 2 : 1;
`);
    expect(net.signalGroups).toHaveLength(1);
    expect(net.signalGroups[0]?.name).toBe('SG_Engine');
    expect(net.signalGroups[0]?.messageId).toBe(256);
  });
});

describe('dbc parser — SIG_VALTYPE_', () => {
  it('parses SIG_VALTYPE_', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_: BCM
BO_ 256 M: 8 BCM
 SG_ Rsv : 0|8@1+ (1,0) [0|255] "" BCM
SIG_VALTYPE_ 256 Rsv : 1;
`);
    const sig = net.messages[0]?.signals[0];
    expect(sig?.valueTypeForSignal).toBe('Reserved');
  });
});

describe('dbc parser — BO_TX_BU_', () => {
  it('parses BO_TX_BU_', () => {
    const net = parseDbc(`VERSION "1.0"
NS_ :
BS_:
BU_: ECM BCM
BO_ 256 M: 8 ECM
BO_TX_BU_ 256 : BCM,Gateway;
`);
    expect(net.messages[0]?.additionalTransmitters).toEqual(['BCM', 'Gateway']);
  });
});

describe('dbc parser — full DBC integration', () => {
  it('parses a full Vector-like DBC', () => {
    const dbc = `VERSION "1.0"
NS_ :
    NS_DESC_
    CM_
    BA_DEF_
    BA_
    VAL_
    CAT_DEF_
    CAT_
    FILTER
    BA_DEF_DEF_
    EV_DATA_
    ENVVAR_DATA_
    SGTYPE_
    SGTYPE_VAL_
    BA_DEF_SGTYPE_
    BA_SGTYPE_
    SIG_TYPE_REF_
    VAL_TABLE_
    SIG_GROUP_
    SIG_VALTYPE_
    SIGTYPE_VALTYPE_
    BO_TX_BU_
    BA_DEF_REL_
    BA_REL_
    BA_DEF_DEF_REL_
    BU_SG_REL_
    BU_EV_REL_
    BU_BO_REL_
    SG_MUL_VAL_

BS_:

BU_: ECM BCM Gateway

BO_ 256 EngineStatus: 8 ECM
 SG_ Mux M : 0|8@1+ (1,0) [0|255] "" BCM
 SG_ EngineSpeed m0M : 8|16@1+ (0.1,0) [0|6553.5] "rpm" BCM
 SG_ EngineTemp m1M : 24|8@1+ (1,-40) [-40|215] "degC" BCM

BO_ 257 GW_Status: 8 Gateway
 SG_ GW_Alive : 0|8@1+ (1,0) [0|255] "" BCM

CM_ "Network comment";
CM_ BU_ ECM "ECM body controller";
CM_ BO_ 256 "Engine status msg";
CM_ SG_ 256 EngineSpeed "Engine RPM signal";

BA_DEF_  BO_  "GenMsgCycleTime" INT 0 65535;
BA_DEF_  BU_  "NmStationAddress" INT 0 255;
BA_DEF_  SG_  "GenSigStartValue" FLOAT -1000000 1000000;
BA_DEF_DEF_  "GenMsgCycleTime" 0;
BA_DEF_DEF_  "NmStationAddress" 0;
BA_DEF_DEF_  "GenSigStartValue" 0;
BA_ "GenMsgCycleTime" BO_ 256 100;
BA_ "NmStationAddress" BU_ ECM 16;
BA_ "GenSigStartValue" SG_ 256 EngineSpeed 0;

SIG_GROUP_ 256 SG_Engine 1 2 : 1;
SG_MUL_VAL_ 256 EngineSpeed 0 ;
SG_MUL_VAL_ 256 EngineTemp 1 ;
BO_TX_BU_ 256 : BCM;
`;
    const net = parseDbc(dbc);
    expect(net.messages).toHaveLength(2);
    expect(net.messages[0]?.signals).toHaveLength(3);
    expect(net.messages[0]?.signals[0]?.multiplexed.kind).toBe('Multiplexor');
    expect(net.messages[0]?.signals[1]?.multiplexed.kind).toBe('Muxed');
    expect(net.messages[0]?.additionalTransmitters).toEqual(['BCM']);
    expect(net.signalGroups).toHaveLength(1);
    expect(net.comments.length).toBeGreaterThanOrEqual(4);
    expect(net.attributeAssignments).toHaveLength(3);
  });
});

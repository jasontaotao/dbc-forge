import { describe, it, expect } from 'vitest';

import { parseDbc } from '../../src/dbc/parser.js';
import { writeDbc } from '../../src/dbc/writer.js';

const SAMPLE = `VERSION "1.0"

NS_ :
    NS_DESC_
    CM_

BS_:

BU_: ECM BCM

BO_ 256 EngineStatus: 8 ECM
 SG_ EngineSpeed : 0|16@1+ (0.1,0) [0|6553.5] "rpm" BCM
 SG_ EngineTemp : 16|8@1+ (1,-40) [-40|215] "degC" BCM

BA_DEF_  BO_  "GenMsgCycleTime" INT 0 65535;
BA_DEF_DEF_  "GenMsgCycleTime" 100;
BA_ "GenMsgCycleTime" BO_ 256 100;
`;

describe('DBC round-trip', () => {
  it('parses → writes → parses yields same Network', () => {
    const a = parseDbc(SAMPLE);
    const out = writeDbc(a, { mode: 'extract' });
    const b = parseDbc(out);
    expect(b.version).toBe(a.version);
    expect(b.messages).toHaveLength(a.messages.length);
    expect(b.messages[0]?.signals).toHaveLength(a.messages[0]?.signals.length ?? 0);
    expect(b.messages[0]?.signals[0]?.name).toBe(a.messages[0]?.signals[0]?.name);
    expect(b.messages[0]?.signals[0]?.factor).toBe(a.messages[0]?.signals[0]?.factor);
  });
});

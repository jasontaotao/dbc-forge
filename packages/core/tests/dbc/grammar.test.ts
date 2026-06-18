import { describe, it, expect } from 'vitest';

import { DBC_KEYWORDS, isDbcKeyword } from '../../src/dbc/grammar.js';

describe('dbc grammar keywords', () => {
  it('declares all standard keywords', () => {
    expect(DBC_KEYWORDS.VERSION).toBe('VERSION');
    expect(DBC_KEYWORDS.BS_).toBe('BS_');
    expect(DBC_KEYWORDS.BU_).toBe('BU_');
    expect(DBC_KEYWORDS.VAL_TABLE_).toBe('VAL_TABLE_');
    expect(DBC_KEYWORDS.BO_).toBe('BO_');
    expect(DBC_KEYWORDS.SG_).toBe('SG_');
    expect(DBC_KEYWORDS.BA_DEF_).toBe('BA_DEF_');
    expect(DBC_KEYWORDS.BA_).toBe('BA_');
    expect(DBC_KEYWORDS.BA_DEF_DEF_).toBe('BA_DEF_DEF_');
    expect(DBC_KEYWORDS.BA_DEF_REL_).toBe('BA_DEF_REL_');
    expect(DBC_KEYWORDS.BA_REL_).toBe('BA_REL_');
    expect(DBC_KEYWORDS.CM_).toBe('CM_');
    expect(DBC_KEYWORDS.VAL_).toBe('VAL_');
    expect(DBC_KEYWORDS.SIG_GROUP_).toBe('SIG_GROUP_');
    expect(DBC_KEYWORDS.SIG_VALTYPE_).toBe('SIG_VALTYPE_');
    expect(DBC_KEYWORDS.BO_TX_BU_).toBe('BO_TX_BU_');
    expect(DBC_KEYWORDS.SG_MUL_VAL_).toBe('SG_MUL_VAL_');
  });

  it('isDbcKeyword detects any known keyword', () => {
    expect(isDbcKeyword('VERSION')).toBe(true);
    expect(isDbcKeyword('SG_')).toBe(true);
    expect(isDbcKeyword('FOO_BAR_')).toBe(false);
  });
});

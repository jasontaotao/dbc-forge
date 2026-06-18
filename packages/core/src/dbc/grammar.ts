// DBC grammar keyword constants and emit order.
// The keyword set is the canonical Vector CANdb++ / DBCplusplus vocabulary
// that we recognize on parse and emit on build. EV_ and ENVVAR_DATA_ are
// explicitly listed so they can be skipped (YAGNI) without throwing.

export const DBC_KEYWORDS = {
  VERSION: 'VERSION',
  NS_: 'NS_',
  BS_: 'BS_',
  BU_: 'BU_',
  VAL_TABLE_: 'VAL_TABLE_',
  BO_: 'BO_',
  SG_: 'SG_',
  BA_DEF_: 'BA_DEF_',
  BA_: 'BA_',
  BA_DEF_DEF_: 'BA_DEF_DEF_',
  BA_DEF_REL_: 'BA_DEF_REL_',
  BA_DEF_DEF_REL_: 'BA_DEF_DEF_REL_',
  BA_REL_: 'BA_REL_',
  CM_: 'CM_',
  VAL_: 'VAL_',
  SIG_GROUP_: 'SIG_GROUP_',
  SIG_VALTYPE_: 'SIG_VALTYPE_',
  BO_TX_BU_: 'BO_TX_BU_',
  SG_MUL_VAL_: 'SG_MUL_VAL_',
  EV_: 'EV_',
  ENVVAR_DATA_: 'ENVVAR_DATA_',
} as const;

const ALL_KEYWORDS = new Set<string>(Object.values(DBC_KEYWORDS));

export function isDbcKeyword(token: string): boolean {
  return ALL_KEYWORDS.has(token);
}

export const DBC_EMIT_ORDER: readonly (keyof typeof DBC_KEYWORDS)[] = [
  'VERSION',
  'NS_',
  'BS_',
  'BU_',
  'VAL_TABLE_',
  'BO_',
  'BO_TX_BU_',
  'SG_',
  'SIG_VALTYPE_',
  'SG_MUL_VAL_',
  'VAL_',
  'BA_DEF_',
  'BA_DEF_REL_',
  'BA_DEF_DEF_',
  'BA_DEF_DEF_REL_',
  'BA_',
  'BA_REL_',
  'SIG_GROUP_',
  'CM_',
];

// Validator orchestrator.
//
// Runs every registered rule against a Network and aggregates the issues into
// {errors, warnings}. In `build` mode the engine treats every error as a build
// failure; in `extract` and `diff` modes errors are demoted to warnings because
// we are introspecting potentially-malformed input from the wild (DBC files
// exported by tools that disagree with Vector's strict invariants) or comparing
// two networks where neither side is canonical.

import type { ValidationIssue } from '../errors.js';
import type { Network } from '../model/network.js';

import { attrDefMissing } from './rules/attr-def-missing.js';
import { attrRelTargetExists } from './rules/attr-rel-target-exists.js';
import { attrTargetExists } from './rules/attr-target-exists.js';
import { attrValueRange } from './rules/attr-value-range.js';
import { attrValueTypeMismatch } from './rules/attr-value-type-mismatch.js';
import { messageCycleTimeRequired } from './rules/message-cycle-time-required.js';
import { messageDlcRange } from './rules/message-dlc-range.js';
import { messageIdDuplicate } from './rules/message-id-duplicate.js';
import { messageIdRange } from './rules/message-id-range.js';
import { messageNameDuplicate } from './rules/message-name-duplicate.js';
import { messageNameFormat } from './rules/message-name-format.js';
import { messageTransmitterExists } from './rules/message-transmitter-exists.js';
import { muxExtendedConsistency } from './rules/mux-extended-consistency.js';
import { muxMuxedValueInRange } from './rules/mux-muxed-value-in-range.js';
import { muxSwitchExactlyOne } from './rules/mux-switch-exactly-one.js';
import { muxSwitchRequiredWhenMux } from './rules/mux-switch-required-when-mux.js';
import { networkBaudrateRequired } from './rules/network-baudrate-required.js';
import { networkBusTypeRequired } from './rules/network-bus-type-required.js';
import { nodeNameDuplicate } from './rules/node-name-duplicate.js';
import { nodeNameFormat } from './rules/node-name-format.js';
import { nodeUnreferenced } from './rules/node-unreferenced.js';
import { signalBitRange } from './rules/signal-bit-range.js';
import { signalByteOrderValid } from './rules/signal-byte-order-valid.js';
import { signalFactorNonzero } from './rules/signal-factor-nonzero.js';
import { signalFloatLength } from './rules/signal-float-length.js';
import { signalLengthPositive } from './rules/signal-length-positive.js';
import { signalNameDuplicateInMessage } from './rules/signal-name-duplicate-in-message.js';
import { signalNameFormat } from './rules/signal-name-format.js';
import { signalOverlap } from './rules/signal-overlap.js';
import { signalPhysicalRange } from './rules/signal-physical-range.js';
import { signalReceiverExists } from './rules/signal-receiver-exists.js';
import { signalUnitWhenFactor } from './rules/signal-unit-when-factor.js';
import { signalValueTypeValid } from './rules/signal-value-type-valid.js';
import { vtDuplicateRawValue } from './rules/vt-duplicate-raw-value.js';
import { vtSignalBoundExists } from './rules/vt-signal-bound-exists.js';
import { vtValueInSignalRange } from './rules/vt-value-in-signal-range.js';

export type ValidationMode = 'build' | 'extract' | 'diff';

export interface ValidationResult {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

const RULES = [
  networkBusTypeRequired, networkBaudrateRequired,
  nodeNameFormat, nodeNameDuplicate, nodeUnreferenced,
  messageIdDuplicate, messageIdRange, messageDlcRange, messageNameFormat, messageNameDuplicate, messageTransmitterExists, messageCycleTimeRequired,
  signalBitRange, signalLengthPositive, signalOverlap, signalByteOrderValid, signalValueTypeValid, signalFactorNonzero, signalPhysicalRange, signalNameFormat, signalNameDuplicateInMessage, signalReceiverExists, signalUnitWhenFactor, signalFloatLength,
  muxSwitchExactlyOne, muxSwitchRequiredWhenMux, muxMuxedValueInRange, muxExtendedConsistency,
  vtDuplicateRawValue, vtSignalBoundExists, vtValueInSignalRange,
  attrDefMissing, attrValueTypeMismatch, attrValueRange, attrTargetExists, attrRelTargetExists,
] as const;

export function validate(
  net: Network,
  opts: { mode?: ValidationMode } = {},
): ValidationResult {
  const mode = opts.mode ?? 'build';
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  for (const rule of RULES) {
    const issues = rule.check(net);
    for (const issue of issues) {
      if (issue.severity === 'error' && (mode === 'extract' || mode === 'diff')) {
        warnings.push({ ...issue, severity: 'warning' });
      } else if (issue.severity === 'error') {
        errors.push(issue);
      } else {
        warnings.push(issue);
      }
    }
  }
  return { errors, warnings };
}

// Rule: message.cycle-time-required
// When GenMsgSendType is one of the Cyclic* variants, GenMsgCycleTime must be > 0,
// otherwise the bus schedule is undefined.

import type { ValidationIssue } from '../../errors.js';
import type { Network } from '../../model/network.js';

const CYCLIC_SEND_TYPES = new Set([
  'Cyclic',
  'CyclicAndSpontaneous',
  'CyclicIfActive',
  'CyclicAndSpontaneousIfActive',
  'CyclicIfActiveAndSpontaneous',
]);

export const messageCycleTimeRequired = {
  id: 'message.cycle-time-required',
  severity: 'error' as const,
  check(net: Network): ValidationIssue[] {
    const sendTypeByMsg = new Map<number, string>();
    const cycleTimeByMsg = new Map<number, number>();
    for (const a of net.attributeAssignments) {
      if (a.target.kind !== 'message') continue;
      const id = a.target.messageId;
      if (a.name === 'GenMsgSendType' && typeof a.value === 'string') {
        sendTypeByMsg.set(id, a.value);
      } else if (a.name === 'GenMsgCycleTime' && typeof a.value === 'number') {
        cycleTimeByMsg.set(id, a.value);
      }
    }
    const issues: ValidationIssue[] = [];
    for (const m of net.messages) {
      const sendType = sendTypeByMsg.get(m.id);
      if (!sendType || !CYCLIC_SEND_TYPES.has(sendType)) continue;
      const cycle = cycleTimeByMsg.get(m.id) ?? 0;
      if (!(cycle > 0)) {
        issues.push({
          rule: this.id,
          severity: this.severity,
          location: { messageId: m.id },
          message: `消息 "${m.name}" 使用 Cyclic 发送类型 (${sendType}) 但 GenMsgCycleTime 必须 > 0`,
        });
      }
    }
    return issues;
  },
};

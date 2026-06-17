# dbc-forge — 汽车 DBC 文件生成工具设计文档

| 字段 | 值 |
|---|---|
| 项目代号 | `dbc-forge` |
| 日期 | 2026-06-17 |
| 状态 | Design (待 user 审阅) |
| 范围 | Excel/CSV 通信矩阵 ↔ DBC 双向转换 + 语义 diff |
| 后续 | 通过 `superpowers:writing-plans` 生成实施计划 |

---

## 1. 目标与非目标

### 1.1 目标

为汽车 CAN 通信开发流程提供一个**独立、严格、可嵌入**的 DBC 文件工具链：

1. 把 **Vector CANdb++ 标准矩阵格式** 的 Excel 通信矩阵转换为合法 DBC
2. 把 DBC 反向导出为 Vector 矩阵 Excel（保留所有可表达的语义）
3. 对两份输入（任意 xlsx/dbc 组合）做**语义化 diff**，输出人类可读 + 机器可读两种报告
4. Strict 校验：任何违反 DBC 语义或 Vector 矩阵约束的输入都拒绝生成，一轮报齐所有问题
5. 作为 `@dbc-forge/core` npm 包，未来可被 `claude-AutosarCfg`（Electron+TS）直接嵌入

### 1.2 非目标 (YAGNI)

- 不支持 SYM、KCD、ARXML 等其他格式（首版只 Excel ↔ DBC）
- 不做 CAN 在线抓包反向推导 (DBC discovery)
- 不内置 GUI（CLI + 库）
- 不支持 LIN、FlexRay 信号（DBC 协议本身不覆盖）
- 不支持 J1939 传输层 / NMEA 2000 扩展（标准 + mux/29bit/attrs 已覆盖 90% 乘用车场景）
- 不支持 EV_ / ENVVAR_DATA_ 环境变量（仿真用，MVP 跳过 + warning）
- **不支持 CSV 矩阵输入/输出 (工程界事实失传, 2026-06-18 决策 YAGNI)**

## 2. 关键决策

| 维度 | 决策 | 理由 |
|---|---|---|
| 输入源 | Excel 通信矩阵 | OEM/Tier1 实际工作流 |
| Excel 模板 | Vector 标准矩阵格式 | Vector 生态事实标准，列约定稳定 |
| DBC 特性范围 | 标准 + mux + 29bit + BA_DEF_/BA_/BA_REL_ | 覆盖乘用车 + 复杂网关场景 |
| 技术栈 | TypeScript 独立 CLI/库 (pnpm workspace) | 与 AutosarCfg 同栈，可被嵌入 |
| 校验策略 | Strict —— 任何违反都中止 | 上游矩阵质量必须由工具守住 |
| MVP 范围 | Excel→DBC + DBC→Excel + diff | 闭环可用，支持版本管理 |
| DBC 实现路径 | 自研 parser/writer，零第三方 DBC 依赖 | 控制权完整，strict + mux 难找现成库 |

（完整内容见用户原始 message，本文件作为快照提交）

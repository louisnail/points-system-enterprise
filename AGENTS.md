# 项目开发规则

## 🔴 上下文恢复协议（最高优先级，每次对话必须执行）

**在执行任何开发任务之前，你必须按顺序阅读以下两个文件：**

1. **本文件** `AGENTS.md` — 技术规则和约束
2. **`CONTEXT.md`** — 🔥 **当前开发状态、决策变更记录、已废弃需求**

> `积分管理系统-企业版-技术方案.md` 仅在需要查阅具体模块规格时再读，日常不必每次加载。

**⚠️ 关键规则：**
- `CONTEXT.md` 中的「已废弃的决策」章节记录了所有已被推翻的需求和方案。**你绝不能使用已废弃的方案进行开发。**
- 如果你的记忆与 `CONTEXT.md` 的内容冲突，**以 CONTEXT.md 为准**。
- 读完三个文件后，你必须用一句话确认当前状态，然后再开始工作。
- 每当发生需求变更、完成功能、做出重要决策时，**你必须主动更新 CONTEXT.md**，无需用户提醒。

---

## 工作目录（不可变）

**所有开发必须在 `/Users/td/Documents/积分系统-企业版/` 目录下进行。**

- 禁止在 `/Users/td/Documents/积分系统/prototype.html` 或其他目录进行任何改动
- 每次会话恢复、上下文切换后，必须先确认当前工作目录

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Vue 3 Composition API + TypeScript | 3.4+ |
| UI 组件库 | Ant Design Vue（`a-` 前缀） | 4.2.3 |
| 状态管理 | Pinia（Composition API 风格） | 2.x |
| 样式 | Less | 4.x |
| HTTP | Axios，baseURL: `/api` | 1.x |
| 后端框架 | NestJS + TypeORM + MySQL | 10.x |

## 约束

- 组件库仅使用 Ant Design Vue，**禁止使用 Element Plus**
- 图表使用纯 SVG 实现，不依赖 echarts（雷达图等自定义图表）
- API 调用统一走 `frontend/src/api/request.ts` 封装的 axios 实例
- Pinia store 使用 Composition API 风格（`defineStore('name', () => { ... })`）
- 后端路由统一前缀 `/api`，通过 `app.setGlobalPrefix('api')` 设置

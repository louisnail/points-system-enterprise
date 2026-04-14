# CONTEXT.md — 项目实时状态文件

> **本文件是开发过程的"活记忆"，用于在上下文压缩或新对话时恢复 AI 的完整认知。**

---

## 🕐 上下文时间水位线

| 字段 | 值 |
|------|-----|
| **最后验证日期** | 2026-03-26 |
| **有效起始日期** | 2026-03-18 |
| **下次清理建议** | 当条目超过 20 条，或距上次清理超过 2 周 |

**AI 阅读规则：**
- **「有效起始日期」之前的条目**：已归档为历史，仅在用户明确追溯时才参考，日常开发**忽略**。
- **「有效起始日期」之后的条目**：是当前有效上下文，必须全部理解和遵守。
- **「最后验证日期」**：表示本文件内容最后一次被人工确认为准确的时间。如果当前日期距此日期超过 7 天，AI 应主动提醒用户："CONTEXT.md 已超过 7 天未验证，建议确认内容是否仍然准确。"

**用户清理指令：** 当你觉得文件太长或条目太旧时，对 AI 说：
```
请清理 CONTEXT.md：
- 把 YYYY-MM-DD 之前的条目归档到「历史归档」章节（只保留一句话摘要）
- 把「有效起始日期」更新为 YYYY-MM-DD
- 把「最后验证日期」更新为今天
```

---

## ⚠️ AI 必读指令（最高优先级）

### 每次对话开始时，你必须执行以下操作：

1. **先读两个文件**，按此顺序：
   - `AGENTS.md` — 技术规则和约束（什么能做、什么不能做）
   - `CONTEXT.md`（本文件） — 当前开发状态（现在在做什么、做到哪了）
   - *`积分管理系统-企业版-技术方案.md` 仅在需要查阅具体规格时再读，日常不必每次加载*

2. **本文件的内容优先级高于你的"记忆"**。如果你的记忆和本文件冲突，**以本文件为准**。

3. **只关注「有效起始日期」之后的条目。** 之前的内容已归档，除非用户明确要求追溯，否则忽略。

4. **检查「最后验证日期」。** 如果距今超过 7 天，先提醒用户确认文件内容是否仍然准确，再开始工作。

5. **读完后，用一句话确认你理解了当前状态**，例如：
   > "已读取项目上下文（有效期从 2026-03-13 起）。当前处于 Phase 4，上次完成了 XXX，下一步是 YYY。"

### 何时更新本文件（你必须主动执行）：

以下任何情况发生时，**你必须立即更新本文件对应章节**，不需要用户提醒：

- **需求变更**：用户说"这个不要了""改成另一种做法""之前的方案废弃" → 更新「已废弃的决策」和「当前有效决策」
- **完成一个功能**：→ 更新「开发进度」，将已完成项移入已完成列表
- **做出重要技术决策**：→ 更新「当前有效决策」，记录决策内容和原因
- **遇到问题/阻塞**：→ 更新「已知问题」
- **开始新任务**：→ 更新「当前正在做」
- **对话结束或变长时**：→ 更新「最后验证日期」为当天

### 更新格式要求：

- 每条记录必须带日期，格式：`[YYYY-MM-DD]`
- 废弃决策必须说明**废弃原因**和**替代方案**
- 保持简洁，每条不超过 2 行

---

## 一、项目总览

- **项目**：积分管理系统-企业版
- **目录**：`/Users/td/Documents/积分系统-企业版/`
- **架构**：Monorepo（frontend + backend + shared）
- **技术栈**：Vue 3 + Ant Design Vue + NestJS + TypeORM + MySQL
- **当前阶段**：Phase 7 进行中（季度之星增强：奖章SVG+头像配置+分享/下载）

---

## 二、开发进度

### 已完成

| 阶段 | 内容 | 完成日期 |
|------|------|---------|
| Phase 1 | 基础框架 + 员工/部门管理 + 指标库 + 榜单配置 | 已完成 |
| Phase 2 | 积分录入 + 过程分维护 + 审核流程 | 已完成 |
| Phase 3 | 排名计算 + 月度排名 + 季度之星 | 已完成 |
| 原型 v2.1 | prototype.html 全页面 CRUD 闭环 + 搜索筛选 + 状态管理 | 2026-03-13 |
| Phase 4 — 驾驶舱 | CockpitView.vue 全量重写（8KPI+6SVG图表+3洞察+4Tabs+AI抽屉）+ cockpit-data.ts | 2026-03-16 |
| Phase 4 — 黑榜配置 | BlackRanking.vue 增加排名配置抽屉（按人数/按比例+保存到系统配置）+ 月份选择器 | 2026-03-16 |
| Phase 4 — 员工管理增强 | 5个状态统计卡片 + "冻结"→"禁用"语义 + 操作列按状态差异化 + 编辑弹窗加状态字段 | 2026-03-16 |
| Phase 4 — 指标列表增强 | 积分归类筛选下拉 + 字段管理抽屉（显隐Switch+排序） + 列拖拽排序 | 2026-03-16 |
| Phase 4 — 侧边栏v2.1 | 移除龙虎榜入口，菜单结构对齐技术方案4.5路由表（19条） | 2026-03-16 |
| Phase 4 — 部门树美化 | showLine+blockNode+自定义#title卡片节点（名称+层级Tag+人数Badge）+ 选中态蓝色左边框 + 布局7/17 + 主管设置弹窗 + 编辑防循环TreeSelect + 子部门层级自动推算 | 2026-03-16 |
| Phase 4 — 工作台真实数据 | DashboardView.vue 接入5个API（员工/积分/指标/榜单/待审核）+ 欢迎栏（用户头像+问候+角色）+ 快捷入口6个 + 系统概况 + 待审核提醒 | 2026-03-16 |
| Phase 4 — 全栈测试通过 | Docker(MySQL8+Redis7)+NestJS+Vue全栈启动成功，migration+seed完成，9个页面浏览器测试通过，console无报错，TS编译0错误 | 2026-03-16 |
| Phase 4.5 — 积分审核修复 | 4.5-6：修复积分审核500错误（NaN注入SQL），改findAll用findAndCount+类型安全where；审核PUT正常 | 2026-03-16 |
| Phase 4.5 — 批量导入增强 | 4.5-5：部分成功模式 + Modal.warning显示失败详情（QuickEntry.vue + CurrentUserList.vue） | 2026-03-16 |
| Phase 4.5 — 部门管理增强 | 4.5-3：添加manager_id列+ManyToOne关系；新增GET /departments/:id/employees端点；DepartmentManage.vue完全重写（右侧员工表格+搜索+归属筛选）；update()显式字段白名单 | 2026-03-16 |
| Phase 4.5 — 员工管理增强 | 4.5-1：新增GET /users/stats统计端点；findAll添加rankingListId筛选；导出增加榜单名/排名/入职日期/base地列；导入改为部门名称匹配（非ID）；前端：统计卡片接入真实API + 字段管理抽屉（显隐+拖拽+必填保护）+ 榜单筛选下拉 + 列拖拽排序 + 部门三级路径显示 | 2026-03-16 |
| Phase 4.5 — 历史员工增强 | 4.5-2：HistoryUserList.vue完全重写：新增处理时间列(updatedAt)、字段管理抽屉（显隐+拖拽）、列拖拽排序、归属筛选、部门路径显示 | 2026-03-16 |
| Phase 4.5 — 指标字段管理 | 4.5-4：IndicatorList.vue字段管理抽屉改为拖拽排序（替换箭头按钮）+ HolderOutlined拖拽手柄 | 2026-03-16 |
| Phase 4.5 — 驾驶舱优化 | 4.5-7：布局padding优化（16px 24px）；组件配置抽屉（9个模块独立显隐控制）；html-to-image导出PNG；Fullscreen API大屏模式（含退出监听） | 2026-03-16 |
| Phase 5 — Bug 修复 | 5.1: 积分录入月份 Bug 修复（belongMonth 传参+格式校验）；5.2: 员工编辑后表格不更新修复（显式字段赋值+剥离关系对象）；5.3: 排名搜索栏对齐修复（a-form-item 包裹） | 2026-03-17 |
| Phase 5 — 字段名称统一 | 5.4: 全系统"所属月份"→"归属月份"、"指标分类"→"管控项"、"评价指标"→"评价维度"、"指标分值"→"标准分值" | 2026-03-17 |
| Phase 5 — 部门层级移除 | 5.5: 完全移除部门层级概念（levelMap/levelColorMap/tag/form-item/level条件），entity.level 改为 nullable | 2026-03-17 |
| Phase 5 — 字段池 composable | 5.6: 新建 useFieldPool.ts 可复用 composable（localStorage 持久化+拖拽排序+显隐控制），已在员工管理和积分录入中集成 | 2026-03-17 |
| Phase 5 — 批量调整部门 | 5.7: 员工管理新增行选择+批量调整部门弹窗，后端 PUT /users/batch-department 批量更新 | 2026-03-17 |
| Phase 5 — 积分跳转引导 | 5.8: 员工管理积分列 router-link 跳转积分明细页，注册 /point/detail 路由 | 2026-03-17 |
| Phase 5 — 积分录入增强 | 5.9: 选中员工后显示部门/归属/榜单只读信息；记录表格扩展为11列；后端 findAll 加载 user.department+user.rankingList 关联 | 2026-03-17 |
| Phase 5 — 积分编辑 API | 5.10: PUT /points/:id 端点，支持修改分值/事由/归属月份；已通过记录修改时事务内原子同步 user.totalPoints（delta 计算） | 2026-03-17 |
| Phase 5 — 积分字段管理 | 5.11: 积分录入记录表格集成 useFieldPool composable 字段管理抽屉 | 2026-03-17 |
| Phase 5 — 积分明细页面 | 5.12: 新建 PointDetail.vue，7 项筛选器 + 字段管理 + 编辑弹窗；后端 findAll 重写为 QueryBuilder 支持跨表筛选 | 2026-03-17 |
| Phase 5 — 展示大屏重构 | 5.13: DisplayScreen.vue 完全重写：grid-layout-plus 自由拖拽布局 + 纯 SVG 图表（移除 echarts）+ 配置抽屉 + localStorage 持久化布局 + Fullscreen API | 2026-03-17 |
| Phase 5.5 — R4 菜单修复 | 积分明细菜单缺失修复：AppSidebar.vue 添加 ProfileOutlined import + point-detail 菜单项 | 2026-03-17 |
| Phase 5.5 — R2 部门三级列 | 员工管理/历史员工部门列拆分为一级/二级/三级部门3列（buildDeptLevelMap），只显示前3级 | 2026-03-17 |
| Phase 5.5 — R3 员工调动 | 部门管理新增行选择+调整部门弹窗（TreeSelect），调用 batchUpdateDepartment API | 2026-03-17 |
| Phase 5.5 — R1 动态自定义字段 | 后端: custom_field_definition entity+service+controller+module, User/Indicator 新增 customFields JSON 列; 前端: custom-field.api + useCustomFields composable + useFieldPool 升级(isCustom+updateAllFields) + 员工管理/指标管理集成(字段管理抽屉含新增/隐藏/删除/自定义标签+表单动态渲染) | 2026-03-17 |
| Phase 6.0 — F4 排名月份筛选 | ranking.service.ts 添加 belongMonth 过滤条件；MonthlyRanking.vue 移除榜单关联下拉，改为显示"榜单数量"统计 | 2026-03-17 |
| Phase 6.0 — F2 员工部门编辑 | user.service.ts update() 修复 TypeORM 关系对象缓存导致 FK 更新被忽略（delete relationship refs after FK assignment） | 2026-03-17 |
| Phase 6.0 — F3 积分时间格式 | QuickEntry.vue + PointDetail.vue 添加 formatDateTime() 渲染 "YYYY年MM月DD日 HH:mm" 中文格式 | 2026-03-17 |
| Phase 6.0 — F1 表格横滚背景 | CurrentUserList/HistoryUserList/PointDetail 添加 :scroll="{ x: scrollX }" computed 属性 | 2026-03-17 |
| Phase 6.0 — F5 黑榜真实数据 | BlackRanking.vue 重写：移除 mock，接入 getMonthlyRanking/getRankingLists/getSystemConfigs API | 2026-03-17 |
| Phase 6.0 — F7 红榜页面 | 新建 RedRanking.vue：Grid 卡片 + HTML5 拖拽 + localStorage 持久化 + 红色主题；路由 + 侧边栏 FireOutlined | 2026-03-17 |
| Phase 6.0 — F6 季度之星导入 | 后端 importFromRanking()（季度→3月聚合+TopN+去重）+ POST /quarter-stars/import；前端导入弹窗 | 2026-03-17 |
| Phase 6.1 — B1 过程分排名修复 | ranking.service.ts 过程分查询改为 PointRecord(pointStatus=1,auditStatus=1)，修复排名和黑榜过程分均为0的问题 | 2026-03-17 |
| Phase 6.1 — B3 排名导出 | ranking.service.ts exportExcel(ExcelJS 11列) + GET /rankings/export + 前端导出按钮 | 2026-03-17 |
| Phase 6.1 — B6 季度之星500修复 | 创建 migration 1710000000003-AddQuarterStarTable + controller 参数校验(null/NaN防护) | 2026-03-17 |
| Phase 6.1 — B5 积分明细导出 | point.service.ts exportExcel(ExcelJS 15列) + GET /points/export + 前端导出按钮+筛选透传 | 2026-03-17 |
| Phase 6.1 — B4 导出全字段+模板必填标记 | user.service.ts 导出扩展19列+模板扩展16列(*必填标记：工号/姓名/归属组织/部门名称) | 2026-03-17 |
| Phase 6.1 — B2 红榜榜单管理 | RedRanking.vue 配置抽屉(Switch可见+InputNumber TopN/per list) + localStorage持久化 + visibleCards过滤 | 2026-03-17 |
| Phase 6.1 — B7 表格列宽优化 | 6个表格页面添加resizable列+@resizeColumn拖拽调整+列宽加宽+ellipsis tooltip+全局CSS间距优化 | 2026-03-17 |
| Phase 6.2 — C4 字段命名统一 | PointDetail/AuditList/QuickEntry 列名"类型"统一为"积分状态"，宽度微调 | 2026-03-17 |
| Phase 6.2 — C6 排名去"+"号 | MonthlyRanking/RedRanking 正分显示移除"+"前缀 | 2026-03-17 |
| Phase 6.2 — C5 导出按钮分组 | PointDetail.vue 导出+字段管理按钮用 a-space 包裹分组 | 2026-03-17 |
| Phase 6.2 — C8 部门递归查询 | department.service getEmployees 递归查询所有子部门员工(getDescendantIds)，leftJoin department 返回部门名 | 2026-03-17 |
| Phase 6.2 — C2 积分状态显示 | QuickEntry 指标下拉显示[过程分/结果分]标注，待提交列表新增积分状态列 | 2026-03-17 |
| Phase 6.2 — C3 榜单筛选+批量 | indicator entity新增rankingListId FK(nullable)+migration；findAll支持rankingListId过滤(含NULL通用)；batchSetRankingList批量设置；IndicatorList新增行选择+批量设置榜单+关联榜单列+编辑表单；QuickEntry按用户榜单过滤指标 | 2026-03-17 |
| Phase 6.2 — C1 字段管理增强 | fieldKey自动生成(backend cf_{timestamp})；移除前端fieldKey输入框；新增编辑弹窗(displayName+fieldType+options+isRequired)；IndicatorList+CurrentUserList双页面同步 | 2026-03-17 |
| Phase 6.2 — C7 季度之星重设计 | QuarterStar.vue重写为RedRanking风格卡片布局(按榜单分组)；HTML5拖拽排序；a-color-picker自定义卡片颜色；localStorage持久化配置；展示配置抽屉(可见性+颜色) | 2026-03-17 |
| Phase 6.3 — Part A UI修复(13项) | A1-A3:IndicatorList/CurrentUserList resizable列+scroll+批量操作始终可见+字段全可隐藏；A4-A5:QuickEntry积分状态标签+三级部门；A6:PointDetail三级部门列；A7-A8-A12:MonthlyRanking榜单筛选下拉+完整字段管理(useFieldPool+useCustomFields)+姓名点击EmployeeDrawer；A9-A10:topN移除+API错误处理改进 | 2026-03-18 |
| Phase 6.3 — Part B 积分画像 | 全新Score Profile模块：migration(score_profile_template+score_profile_dimension+default seed)；后端entity+service(模板匹配ranking_list>position>default+维度计算category/indicator/custom+参考值average/max/fixed)+controller(6 endpoints)+module；前端score-profile.api+ScoreProfileConfig.vue(模板CRUD+维度拖拽+管控项批量添加+指标选择)；EmployeeDrawer重写(接入getUserScoreProfile API+雷达图)；ConfigManage移除旧雷达配置；删除radar-config.store.ts；路由+侧边栏重构(榜单配置移入人员管理+积分画像配置加入系统管理) | 2026-03-18 |
| Phase 7 — 季度之星奖章+头像 | QuarterStar.vue：排名1-3显示金银铜SVG奖章(linearGradient+ribbon+glow)，4+纯数字无#；移除姓名首字母圆形头像；新增头像显示配置(无/头像)；批量上传头像(文件名=工号)；后端uploadAvatars+getAvatarMap+静态文件服务；main.ts useStaticAssets(/uploads) | 2026-03-18 |
| Phase 7 — 季度之星分享下载 | 新建QuarterStarShare.vue公开分享页(无需登录)；路由/quarter-star-share(public:true)；后端published/quarters/avatars三端点添加@Public()装饰器；QuarterStar.vue新增分享链接按钮(clipboard复制)+下载图片按钮(html-to-image toPng)；截图时CSS隐藏编辑/移除按钮(.capturing类) | 2026-03-18 |
| Phase 8 — 积分与排名年度大表 | MonthlyRanking.vue完全重写为"积分与排名"：年度选择+榜单筛选+关键词搜索+Excel导出+字段管理抽屉(base/月/季/荣誉分组)；70+列嵌套表头(12月+4季度+环比+排名)；后端getAnnualRanking(单SQL聚合)+getUserMonthlyTrend+exportAnnualExcel(ExcelJS合并表头)；ranking.controller 3新端点；ranking.api 3新函数；SvgTrendChart.vue纯SVG折线图组件；路由+侧边栏"排名查看"→"积分与排名" | 2026-03-25 |
| Phase 8 — 员工画像增强 | EmployeeDrawer.vue：所属榜单卡片替代结果分+积分荣誉标签展示+积分走势SVG折线图(getUserMonthlyTrend API) | 2026-03-25 |
| Phase 8 — 黑榜卡片重构 | BlackRanking.vue从表格重写为Grid卡片布局(匹配RedRanking风格)；黑色渐变头(#1a1a2e→#16213e)；灰度警告徽章(倒数1:#434343/倒数2:#595959/倒数3:#8c8c8c)；HTML5拖拽排序+榜单显隐配置+localStorage持久化 | 2026-03-25 |
| Phase 8 — 评奖模块 | 全新Award Management全栈模块：migration(award表13字段+3FK+3索引)；后端award.entity+award.service(findAll/getStats/create/update/remove/exportExcel+applyFilters复用+getDescendantDeptIds递归)+award.controller(6个REST端点)+award.module；前端award.api(6函数)+AwardManage.vue(年/季/部门/状态筛选+3统计卡片+CRUD表格+编辑弹窗+Excel导出)；路由+侧边栏GiftOutlined | 2026-03-25 |
| Phase 8 — 副榜排名 | ranking_list新增isSecondary字段；user新增secondaryRankingListId+secondaryRankingList关系；ranking.service新增getSecondaryRanking()（通过indicator.ranking_list_id过滤积分）；ranking.controller新增GET /rankings/secondary；前端ranking.api新增getSecondaryRanking()；RedRanking/BlackRanking根据isSecondary自动选择API；CurrentUserList编辑表单新增副榜下拉框；user.service支持secondaryRankingListId查询和更新；migration 1710000000008 | 2026-03-26 |
| Phase 8.1 — 积分归类匹配校验 | 前端QuickEntry.vue: isIndicatorMatchUser()校验+通用积分豁免；后端point.service create/importFromExcel: 榜单匹配校验+通用积分豁免；indicator.service searchByKeyword: 通用积分类型指标搜索支持+rankingListType返回 | 2026-03-26 |
| Phase 8.1 — 主副榜积分隔离 | ranking.service getMonthlyRanking/aggregateYearScores: innerJoin indicator排除isSecondary副榜指标；point.service audit/updateRecord/voidRecord: 副榜指标不更新user.totalPoints；findOne加载indicator.rankingList关系 | 2026-03-26 |
| Phase 8.1 — 积分公式修正 | 统一全系统积分计算公式：月度积分=当月过程分+截止该月累计结果分；当前积分=当月月度积分；季度积分=季度内过程分之和+截止季末累计结果分。涉及ranking.service的getAnnualRanking/getUserMonthlyTrend/getMonthlyRanking/getSecondaryRanking四个方法重写 | 2026-03-26 |
| Phase 8.1 — 积分与排名UI | MonthlyRanking.vue: 搜索框移至榜单下拉左侧+积分列添加sorter排序 | 2026-03-26 |

### 当前正在做

<!-- AI：每次开始新任务时更新这里，完成后移到「已完成」-->

**[2026-03-26] Phase 8.1 积分逻辑修正全部完成：**
- 积分归类匹配校验（前端+后端+导入）
- 通用积分搜索和豁免逻辑
- 主副榜积分完全隔离（排名+totalPoints）
- 积分计算公式统一（累计结果分：月度/季度/当前积分/红黑榜/员工画像走势）
- UI优化（搜索框位置+积分列排序）
- 前后端 TS 编译均 0 错误，API 验证通过

**[2026-03-25] 评奖模块全栈实现完成：**
- 后端：award entity/service/controller/module + migration
- 前端：award.api + AwardManage.vue + 路由 + 侧边栏
- 前后端 TS 编译均 0 错误，等待用户手动验证

**[2026-03-23] 积分录入模块重写 — 手动测试中：**
- QuickEntry.vue 完全重写为左右分栏+4步骤引导布局
- 后端新增 GET /indicators/search 指标文本搜索端点（关键词分词+评分匹配）
- 前端新增 searchIndicators API 函数
- 右侧预览卡片区（编辑/删除/批量提交）
- 保留批量导入Tab和底部记录表格
- 前后端 TS 编译均 0 错误，等待用户手动验证

**[2026-03-18] 技术方案 v3.0 升版完成**：从设计规格升级为系统现状规格，覆盖 Phase 4.5 ~ 6.3 全部变更

### 待开发（Phase 7 剩余）

- AI 智能匹配
- 钉钉消息通知
- 移动端适配

---

## 三、当前有效决策

<!-- AI：每次做出重要决策时，在这里追加一条。格式：[日期] 决策内容 — 原因 -->

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-03-13 | UI 组件库使用 Ant Design Vue，禁止 Element Plus | 企业版统一规范 |
| 2026-03-13 | 员工状态"冻结"更名为"禁用"，语义为"不参与排名" | v2.1 需求迭代 |
| 2026-03-13 | 图表使用纯 SVG 实现，不依赖 echarts | AGENTS.md 约束 |
| 2026-03-13 | 归属组织为 4 种：TD/XD/TY/WB | v2.1 新增 XD |
| 2026-03-13 | 积分归类为下拉选项筛选，非独立管理页面 | Phase 变更简化 |
| 2026-03-16 | 驾驶舱 mock 数据抽离到 `cockpit-data.ts` | 数据与视图分离，文件可读性 |
| 2026-03-16 | 驾驶舱 KPI 卡片为 8 张（4x2 grid），按技术方案 4.4.17 | 技术方案为权威规格 |
| 2026-03-16 | 全栈启动命令：`docker compose -p points-enterprise up -d` → backend `npm run start:dev` → frontend `npm run dev` | 开发环境标准化 |
| 2026-03-16 | 登录账号：工号 000001 / 密码 admin123（super_admin 角色） | seed 脚本初始化 |
| 2026-03-16 | 员工管理字段管理支持新增/删除/修改自定义字段 + 拖拽排序 + 显隐控制 | 4.5需求：管理员灵活配置 |
| 2026-03-16 | 必填字段（姓名/部门/职级/归属）不可删除/隐藏 | 4.5需求：业务数据完整性 |
| 2026-03-16 | 导入导出使用实际文字（部门名/榜单名），不使用编号ID | 4.5需求：数据可读性 |
| 2026-03-16 | 部门管理人员归属改为「标记方式」体现，不分三个组 | 4.5需求：简化归属展示 |
| 2026-03-16 | 部门排序改为树节点拖拽，移除 sort_order 手动输入 | 4.5需求：交互优化 |
| 2026-03-16 | 批量导入采用「部分成功」模式，一行失败不影响其他行 | 4.5需求：导入容错 |
| 2026-03-16 | 积分录入月份选择使用中文数字（一月~十二月） | 4.5需求：本地化 |
| 2026-03-16 | 驾驶舱支持组件配置管理（类飞书多维表）+ 图表类型切换 + 导出图片 | 4.5需求：灵活配置 |
| 2026-03-16 | 大屏展示从 Phase 5 提前到 Phase 4.5，作为驾驶舱子功能（电脑端全屏） | 4.5需求调整 |
| 2026-03-17 | 字段管理采用系统字段池选择模式（非动态自定义字段），useFieldPool composable 复用 | Phase 5 用户确认 |
| 2026-03-17 | 完全移除部门层级概念（集团/事业部/交付组），entity.level 保留但 nullable | Phase 5 用户确认 |
| 2026-03-17 | 展示大屏采用自由拖拽布局（grid-layout-plus），非固定预设 | Phase 5 用户确认 |
| 2026-03-17 | 积分记录编辑已通过记录时使用事务保护 totalPoints 原子同步 | Phase 5 数据一致性保障 |
| 2026-03-17 | 积分明细查询后端改用 QueryBuilder，支持跨表筛选（部门/榜单/管控项/关键词） | Phase 5 复杂筛选需求 |
| 2026-03-17 | 部门列拆分为一级/二级/三级部门3个固定列，只显示树的前3级 | Phase 5.5 R2 用户确认 |
| 2026-03-17 | 动态自定义字段（DB 持久化 custom_field_definition），覆盖员工管理和指标管理 | Phase 5.5 R1 需求反转 |
| 2026-03-17 | 字段管理抽屉支持：新增自定义字段、隐藏(EyeInvisibleOutlined)、删除、自定义标签、必填标签 | Phase 5.5 用户反馈 |
| 2026-03-17 | useFieldPool 新增 updateAllFields() 支持动态合并自定义字段 + isCustom 标记 | Phase 5.5 架构升级 |
| 2026-03-17 | 月度排名页面移除榜单关联下拉，排名结果按 belongMonth 过滤 | Phase 6.0 F4 简化排名筛选 |
| 2026-03-17 | TypeORM update 时 delete 关系对象引用再 save，防止 FK 被旧关系覆盖 | Phase 6.0 F2 根因修复 |
| 2026-03-17 | 红榜采用 HTML5 原生拖拽（无外部依赖），Grid 卡片布局 + localStorage 持久化 | Phase 6.0 F7 技术选型 |
| 2026-03-17 | 季度之星导入：季度→3月聚合 totalScore + TopN + 去重已有记录 | Phase 6.0 F6 业务逻辑 |
| 2026-03-17 | 过程分排名查询从 ProcessPointHistory 改为 PointRecord(pointStatus=1)，统一数据来源 | Phase 6.1 B1 根因修复 |
| 2026-03-17 | 所有数据表格列支持 resizable 拖拽调整宽度（antdv4 @resizeColumn 原生事件） | Phase 6.1 B7 交互优化 |
| 2026-03-17 | 字段命名统一："类型"全部改为"积分状态"（PointDetail/AuditList/QuickEntry） | Phase 6.2 C4 用户要求 |
| 2026-03-17 | 自定义字段 fieldKey 由后端自动生成（cf_{timestamp}），前端不再要求手动填写 | Phase 6.2 C1 用户反馈 |
| 2026-03-17 | 指标新增 ranking_list_id FK（nullable），NULL表示通用指标，录入时按用户榜单过滤 | Phase 6.2 C3 需求 |
| 2026-03-17 | 季度之星改为 RedRanking 风格卡片布局（按榜单分组+自定义颜色+拖拽排序） | Phase 6.2 C7 重设计 |
| 2026-03-17 | 部门员工查询改为递归（含所有子部门员工），非仅直属 | Phase 6.2 C8 需求 |
| 2026-03-18 | 积分画像采用数据库模板系统（score_profile_template + score_profile_dimension），替代旧的 localStorage radar-config.store | Phase 6.3 需求 |
| 2026-03-18 | 画像模板匹配优先级：ranking_list > position > default | Phase 6.3 用户确认 |
| 2026-03-18 | 维度数据来源三种：category(管控项) / indicator(单指标) / custom(自定义) | Phase 6.3 用户确认 |
| 2026-03-18 | 参考值类型三种：average(全员平均) / max(全员最大) / fixed(固定值) | Phase 6.3 用户确认 |
| 2026-03-18 | 榜单配置移入人员管理子菜单，积分画像配置加入系统管理子菜单 | Phase 6.3 A13 侧边栏重构 |
| 2026-03-18 | 技术方案从 v2.1 升版至 v3.0，从设计规格转为系统现状规格，覆盖 Phase 4.5~6.3 全部变更 | 确保文档与实现一致 |
| 2026-03-18 | 季度之星排名1-3显示金银铜SVG奖章（内嵌数字），4+显示纯数字无#前缀 | Phase 7 用户要求氛围感 |
| 2026-03-18 | 季度之星头像配置：无/头像两种模式，批量上传以工号命名，存储在 uploads/quarter-star-avatars/ | Phase 7 用户要求可配置头像 |
| 2026-03-18 | 季度之星发布后支持公开分享（/quarter-star-share 无需登录），published/quarters/avatars 三端点 @Public() | Phase 7 用户要求员工可直达查看 |
| 2026-03-18 | 季度之星下载图片时隐藏编辑/移除按钮（.capturing CSS 类控制） | Phase 7 用户要求下载无管理信息 |
| 2026-03-25 | "排名查看"更名为"积分与排名"，为年度全量大表（12月+4季度+环比+排名+荣誉） | 用户要求年度维度全面展示 |
| 2026-03-25 | 年度排名后端使用单SQL聚合（GROUP BY userId,month,pointStatus），避免N+1查询 | 性能优化 |
| 2026-03-25 | 黑榜排名徽章使用灰度警告色（#434343/#595959/#8c8c8c），不用金银铜 | 用户明确要求：倒数排名不应用荣誉色 |
| 2026-03-25 | 黑榜从表格改为Grid卡片布局（匹配红榜风格），黑色渐变头部 | 用户要求统一红黑榜视觉风格 |
| 2026-03-25 | 员工画像增加积分走势SVG折线图+积分荣誉标签 | 用户要求完善员工画像维度 |
| 2026-03-25 | 评奖模块为独立CRUD页面，评奖记录手动创建（非从排名自动导入） | 用户明确要求手动管理 |
| 2026-03-25 | 评奖记录冗余department_id/company_belong/ranking_list_id（创建时从User快照，编辑不更新） | 员工调岗不影响历史评奖记录 |
| 2026-03-25 | 入选月份字段名selected_month（非归属月份），筛选支持年度+季度粒度 | 用户修正术语 |
| 2026-03-26 | 副榜采用"积分归类过滤"方案：ranking_list新增isSecondary字段，user新增secondaryRankingListId；副榜排名独立端点（getSecondaryRanking），通过indicator.ranking_list_id过滤积分 | 最小改动方案，不修改现有主榜逻辑 |
| 2026-03-26 | 每位员工最多1个副榜（secondaryRankingListId），主榜积分和副榜积分完全隔离 | 用户确认1个副榜就够 |
| 2026-03-26 | 积分计算统一公式：月度积分(M)=M月过程分+截止M月累计结果分；当前积分=当月月度积分；**季度积分=季度内各月结果分之和+季度当前月过程分**（过程分不跨月累加，锚定在所属月，不一定会转为结果分）；年度同理。季度当前月=min(当前月,季末月)，过去季度取季末月 | 用户明确：过程分是过程状态不累加，只有结果分是确定状态可累加 |
| 2026-03-26 | 积分归类必须匹配用户榜单（主榜或副榜），通用积分(rankingListType='通用积分')豁免匹配 | 用户要求防止错误录入 |
| 2026-03-26 | 荣誉仅展示已完全过去的月份（次月展示），季度荣誉不自动生成 | 避免显示未结算月份荣誉 |

---

## 四、已废弃的决策（⚠️ 关键防失忆区）

<!-- AI：这是最重要的章节。每当用户说"不要了""改掉""废弃"时，必须在这里记录。
     格式：[日期] 废弃了什么 → 改成了什么 — 为什么废弃
     ⚠️ 即使上下文被压缩，只要读到这里，你就知道什么不该再做。 -->

| 日期 | 废弃内容 | 替代方案 | 废弃原因 |
|------|---------|---------|---------|
| 2026-03-13 | 原 Element Plus 组件库 | Ant Design Vue | 企业版统一 UI 规范 |
| 2026-03-13 | 原"冻结/解冻"状态术语 | "禁用/启用" | 语义更清晰 |
| 2026-03-13 | 4 步骤 AI 匹配录入流程 | 表单 + 双 Tab 设计 | Phase 变更简化 |
| 2026-03-13 | 积分归类独立管理页面 | 下拉选项筛选 | Phase 变更简化 |
| 2026-03-13 | 归属组织仅 3 种（TD/TY/WB） | 4 种（TD/XD/TY/WB） | 新增小盾（XD）|
| 2026-03-16 | 旧版 CockpitView 的 echarts 图表 | 纯 SVG 重写 | AGENTS.md 禁用 echarts |
| 2026-03-16 | 旧版 CockpitView 的 3-tab+4KPI+2图表 | 8KPI+6图表+3洞察+4Tabs 全新布局 | 技术方案 v2.1 4.4.17 |
| 2026-03-16 | 部门管理 sort_order 手动输入排序 | 树节点拖拽排序 | 4.5需求：交互更直观 |
| 2026-03-16 | 部门人员归属分三组显示（TD组/TY组/WB组） | 标记方式体现归属（Tag标签）+ 筛选框过滤 | 4.5需求：不分组，用标记 |
| 2026-03-16 | 大屏展示放在 Phase 5 | 提前到 Phase 4.5 作为驾驶舱子功能 | 用户需求提前 |
| 2026-03-17 | DisplayScreen.vue 使用 echarts (vue-echarts) | 纯 SVG 图表组件 + grid-layout-plus | AGENTS.md 禁用 echarts + 自由拖拽需求 |
| 2026-03-17 | 部门层级概念（集团/事业部/交付组 Tag 标签） | 完全移除，只保留名称+人数 | 用户明确要求移除层级概念 |
| 2026-03-17 | "所属月份"/"指标分类"/"评价指标"/"指标分值" 字段名 | "归属月份"/"管控项"/"评价维度"/"标准分值" | 用户要求统一术语 |
| 2026-03-17 | 动态自定义字段（JSON expansion columns） | 系统字段池选择（useFieldPool composable） | 用户确认不需要自定义字段 |
| 2026-03-17 | 纯系统字段池模式（Phase 5 决策） | 动态自定义字段 DB 持久化（custom_field_definition + JSON columns） | Phase 5.5 用户反转需求：要求支持新增/删除自定义字段 |
| 2026-03-17 | 部门单列显示（部门路径 tooltip） | 拆分为一级/二级/三级部门3个固定列 | Phase 5.5 用户要求分列显示 |
| 2026-03-18 | ConfigManage.vue 中的雷达图配置卡片（localStorage radar-config.store） | 数据库 score_profile_template 模板系统 + ScoreProfileConfig.vue 独立页面 | Phase 6.3 积分画像重构 |

---

## 五、已知问题与阻塞

<!-- AI：遇到技术问题或阻塞时记录在这里，解决后标记 ✅ -->

| 日期 | 问题 | 状态 | 解决方案 |
|------|------|------|---------|
| 2026-03-16 | Node.js 未安装，无法运行 vue-tsc 编译验证 | ✅ 已解决 | fnm 安装 Node v20.20.1，PATH 已写入 ~/.zshrc |
| 2026-03-16 | Docker 拉取镜像超时（docker.io 连接失败） | ✅ 已解决 | 配置 registry-mirrors 国内加速源到 daemon.json |
| 2026-03-16 | 后端 ranking/quarter-star controller auth 导入路径错误 | ✅ 已解决 | 改为 guards/decorators 子目录导入 |
| 2026-03-16 | 前端 DatePicker ref(null) 类型不兼容 Dayjs | ✅ 已解决 | 改为 ref\<any\>(undefined) |
| 2026-03-16 | 员工管理统计卡片数据为 mock 硬编码 | ✅ 已解决 | 4.5-1 新增 GET /users/stats 接口 |
| 2026-03-16 | 部门管理编辑：修改上级部门不生效 | ✅ 已解决 | 4.5-3 重写 update() 显式字段白名单 |
| 2026-03-16 | 批量导入一行失败导致全部未写入 | ✅ 已解决 | 4.5-5 改为部分成功模式 + Modal失败详情 |
| 2026-03-16 | 积分审核页面点击显示服务器内部错误 | ✅ 已解决 | 4.5-6 findAll改findAndCount + NaN防护 |
| 2026-03-16 | 积分录入月份使用英文缩写 | ✅ 已解决 | 4.5-6 改为中文数字（一月~十二月） |
| 2026-03-25 | GET /api/users 返回500（skip值非数字） | ✅ 已解决 | user.service.ts findAll page/pageSize 加 Number() 转换；异常过滤器增加未处理异常日志 |

---

## 六、最近的对话摘要

<!-- AI：每次长对话结束前，或用户要求"保存进度"时，在这里写一段简短摘要。
     保留最近 5 条，超过的删除最旧的。 -->

| 日期 | 摘要 |
|------|------|
| 2026-03-18 | **Phase 7 季度之星增强**：(1)奖章+头像——排名1-3金银铜SVG奖章(linearGradient+ribbon+glow)，4+纯数字；移除姓名首字母头像，改为可配置头像模式(无/头像)+批量上传(工号命名)；后端uploadAvatars+getAvatarMap+main.ts静态文件服务(/uploads)；vite proxy+ranking.api新增2个函数。(2)分享下载——新建QuarterStarShare.vue公开页面(按榜单分组卡片+奖章+头像+季度切换+下载PNG)；路由/quarter-star-share(public:true)；后端published/quarters/avatars三端点@Public()；QuarterStar.vue新增分享链接(clipboard)+下载图片(html-to-image)按钮；截图时.capturing类隐藏编辑/移除按钮。前后端TS编译0错误。 |
| 2026-03-18 | **技术方案 v3.0 升版完成**：从设计规格升级为系统现状规格。更新内容：User/Department/Indicator 表定义（+password_hash/role/custom_fields/manager_id/ranking_list_id FK）；新增 ScoreProfileTemplate/ScoreProfileDimension/CustomFieldDefinition 3张表+迁移记录；后端模块 12个（+score-profile/custom-field）；前端 25页面+10 API模块+3组件+2 composables+21路由；API ~98端点；开发计划 Phase 1~6.3 全标记已完成；附录B完整变更记录。同时修复了ScoreProfileConfig.vue树选择绑定问题+RadarChart字体/刻度/参考值增强+DepartmentManage总人数统计/主管标记/员工表字段调整。 |
| 2026-03-18 | **Phase 6.3 全部完成**：Part A(13项UI修复)—IndicatorList/CurrentUserList resizable+scroll+批量始终可见+字段全可隐藏；QuickEntry积分状态标签+三级部门；PointDetail三级部门列；MonthlyRanking榜单筛选下拉+完整字段管理+姓名点击EmployeeDrawer；topN移除+API错误处理。Part B(积分画像全栈)—migration(2表+default seed)；后端ScoreProfile module(entity+service模板匹配+维度计算+controller 6端点)；前端score-profile.api+ScoreProfileConfig.vue(模板CRUD+维度拖拽配置)；EmployeeDrawer重写(接入getUserScoreProfile+雷达图)；ConfigManage移除旧雷达配置；删除radar-config.store.ts；路由+侧边栏重构。前后端TS编译均0错误。 |
| 2026-03-17 | **Phase 6.2 全部 8 项完成**：C4 字段命名统一("类型"→"积分状态")；C6 排名去"+"号(MonthlyRanking/RedRanking)；C5 导出按钮a-space分组；C8 部门递归查询子部门员工(getDescendantIds)；C2 积分录入显示积分状态(指标下拉+待提交列)；C3 指标榜单筛选(rankingListId FK+migration+批量设置+QuickEntry过滤)；C1 字段管理增强(fieldKey自动生成+编辑弹窗+移除标识输入)；C7 季度之星重设计(RedRanking风格卡片+ColorPicker+拖拽+localStorage)。前后端TS编译均0错误，migration已执行。 |
| 2026-03-17 | **Phase 6.1 全部 7 项完成**：B1 过程分排名修复（PointRecord pointStatus=1查询替代ProcessPointHistory）；B3 排名导出（ExcelJS 11列+GET /rankings/export）；B6 季度之星500修复（migration创建quarter_star表+参数校验）；B5 积分明细导出（15列+筛选透传）；B4 导出全字段扩展（员工导出19列+模板16列*必填标记）；B2 红榜榜单管理（配置抽屉Switch+InputNumber/per list+localStorage）；B7 表格列宽优化（6个页面resizable+@resizeColumn+列宽加宽+ellipsis+全局CSS间距）。前后端TS编译均0错误。 |

---

## 七、文件索引（快速定位）

| 文件 | 用途 | 何时读取 |
|------|------|---------|
| `AGENTS.md` | 技术规则、约束、禁止项 | 每次对话开始 |
| `积分管理系统-企业版-技术方案.md` | 完整系统规格（v3.0，反映 Phase 6.3 全量现状） | 需要查具体规格时按需读取 |
| `CONTEXT.md`（本文件） | 实时开发状态、决策记录、防失忆 | 每次对话开始（最后读） |
| `prototype.html` | v2.1 原型（全页面 CRUD 闭环） | 需要参考 UI 设计时 |

---

## 附录：给使用者的操作指南

### 如何在新对话中恢复上下文

在新对话的第一条消息中说：

```
请先阅读以下两个文件，恢复项目上下文：
1. /Users/td/Documents/积分系统-企业版/AGENTS.md
2. /Users/td/Documents/积分系统-企业版/CONTEXT.md
读完后告诉我你理解的当前状态，然后我们继续开发。
```

### 如何在长对话中主动保存进度

当你感觉对话已经很长，或即将做重大变更时，说：

```
请更新 CONTEXT.md，保存当前开发进度和所有决策变更。
```

### 如何标记需求废弃

当你改变了之前的需求时，明确告诉 AI：

```
之前说的 XXX 废弃了，改成 YYY。请更新 CONTEXT.md 的废弃决策记录。
```

### 如何验证 AI 没有"失忆"

在对话中途，如果你怀疑 AI 在用旧需求工作，直接问：

```
请重新阅读 CONTEXT.md，告诉我当前哪些决策已经废弃了？
```

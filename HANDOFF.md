# 正泰集团厂区综合态势运营中心——开发交接

> 最后更新：2026-07-31

## 1. 当前开发基线

- 当前稳定版本提交：`4bb1937 Fix EdgeOne OSS function dependency`
- 当前开发分支最近集团层基线提交：`e271d25 Enhance global manufacturing globe`；其后的嘉兴 UI 调整以 `git log -1 --oneline` 显示的分支最新提交为准。
- 不可移动的稳定标签：`baseline-edgeone-2026-07-30`
- 稳定分支：`main`，后续大规模开发期间不得直接提交或推送到该分支。
- 当前开发分支：`codex/next-development`，已推送并跟踪 `origin/codex/next-development`。
- GitHub 仓库：<https://github.com/Sunyx1234/BigScreenDemo>
- EdgeOne 已从 GitHub `main` 成功完成构建和部署；平台临时默认域名只有短时效，不作为客户分享地址，正式分享前必须绑定自定义域名。
- Netlify 原生产地址：<https://tiny-bienenstitch-386238.netlify.app/>；当前已执行 **Lock and stop auto publish**，不会随 GitHub 推送自动更新。
- 基准画布：`1920 × 1080`，由 `ScreenFrame.vue` 统一等比例缩放。
- 当前版本已完成综合态势、AI 安全监控、访客实时管控和访客管理主题页；设备监测和应急指挥暂不开发，已移除导航入口。
- 园区层仍需在现有视觉和交互体系上增量开发，不要重构成普通后台；集团层全球制造基地地球与对外展示 UI 已形成首个开发分支版本，后续继续保持集团/园区两级架构与地球组件能力。
- `main`、`origin/main` 和基线标签当前都指向 `4bb1937`。如需恢复，优先从标签新建恢复分支，禁止为了回退而直接使用 `git reset --hard`。

集团/园区两级架构、三维地球、13 个全球制造基地、全屏地球背景、对外展示 UI、地球资源和相关园区回归修复已经提交并推送至 `origin/codex/next-development`，提交号为 `5770c37`。

集团主页最新增量已提交并推送至当前开发分支，提交号为 `e271d25`。该提交在 `b429f62` 的 13 个基地公开介绍与“全球制造数字展厅”基础上继续完成：移除地球表面网格、优化单层方向性大气边缘光、收紧国境线高度、将地球常驻标签精简为仅显示基地名称、调整右侧经营指标与绿色/智造/创新轮播、精简顶部与说明性小字，并增加透明度 `0.4` 的单层动态云层。云层、国境线、基地标记与波纹的绘制层级已经隔离，基地信息不会被云层遮挡。

按计划提交本轮嘉兴改动后，当前工作区应只保留一组最初属于用户的未提交素材移动：

- 根目录 `主体素材清洁版.png` 显示为删除。
- `public/主体素材清洁版.png` 显示为未跟踪。
- 该移动没有进入稳定基线。必须保留现状，不得擅自删除、还原、暂存或提交，除非用户明确确认其用途。

新对话开始后建议先执行：

```powershell
Get-Content -Raw HANDOFF.md
git status -sb
git branch --show-current
git log -3 --oneline
npm run build
```

开始开发前必须确认当前分支为 `codex/next-development`，不是 `main`。

用户已经明确：后续预览服务由用户手动启动和停止。新对话不得自行运行 `npm run dev`、`npm run preview`、启动后台服务或结束用户进程，除非用户在当次对话中明确要求。

## 2. 技术栈与运行方式

- Vue 3 + TypeScript
- Vite
- Pinia
- Vue Router 4
- Three.js `r185`（集团三维地球与未来园区 GLB/GLTF）
- Element Plus / Element Plus Icons
- ECharts + vue-echarts
- 组件统一使用 Composition API 和 `<script setup lang="ts">`

本地运行：

```bash
npm install
npm run dev
```

生产验证：

```bash
npm run build
npm run preview
```

`npm run build` 会先运行 `vue-tsc --noEmit`，再生成 `dist`。开发服务端口可能变化，应以 Vite 终端输出为准，不要固定假设为 `5173`。

如需推送 GitHub，当前机器使用本机代理：

```powershell
git -c http.proxy="http://127.0.0.1:12450" -c https.proxy="http://127.0.0.1:12450" push
```

### 线上部署与版本更新链路

当前主要链路采用 GitHub + EdgeOne Makers + 私有阿里云 OSS：

```text
本地在 codex/next-development 开发和验证
→ 提交并推送开发分支
→ 确认功能、布局、云函数和回归测试通过
→ 经用户确认后合并到 main
→ EdgeOne 从 main 执行 npm ci 和 npm run build
→ 发布 dist 与 cloud-functions
```

- EdgeOne 构建配置位于 `edgeone.json`：
  - Install command：`npm ci`
  - Build command：`npm run build`
  - Output directory：`dist`
  - Node.js：`22.11.0`
- EdgeOne 云函数位于 `cloud-functions/api/`：
  - `video-urls.js`：复用 OSS 视频签名逻辑。
  - `work-orders.js`：复用工单业务逻辑，并使用 `@edgeone/pages-blob` 存储工单和图片。
- 前端统一请求 `/api/video-urls` 和 `/api/work-orders`，不要在组件中写平台专属地址。
- EdgeOne 在 `4bb1937` 补充了 `proxy-agent@5.0.0`，用于解决 `ali-oss → urllib` 在云函数打包时无法解析 `proxy-agent` 的错误。不要在未验证替代方案前删除该依赖。
- EdgeOne 默认临时域名不具备长期分享条件。自定义域名绑定完成后，需要把 EdgeOne 环境变量 `PUBLIC_SITE_URL` 更新为正式 HTTPS 地址，再重新部署，确保飞书工单卡片跳转到正确站点。

Netlify 保留为兼容和备用部署：

- Netlify 构建配置位于 `netlify.toml`：
  - Build command：`npm run build`
  - Publish directory：`dist`
  - Functions directory：`netlify/functions`
- `netlify.toml` 将统一的 `/api/*` 地址重定向到对应 Netlify Functions。
- Netlify 当前锁定并停止自动发布。除非用户明确要求恢复，否则不要解锁或手动发布。
- 原稳定地址：<https://tiny-bienenstitch-386238.netlify.app/>
- 形如 `<deploy-id>--tiny-bienenstitch-386238.netlify.app` 的地址是单次部署永久快照，以后不会更新。
- EdgeOne 和 Netlify 的生产环境均需要以下变量；真实密钥只保存在各自平台，禁止写入仓库：
  - `VITE_USE_OSS_SIGNED_VIDEOS=true`
  - `OSS_ACCESS_KEY_ID`
  - `OSS_ACCESS_KEY_SECRET`
  - `OSS_BUCKET=ztvideos`
  - `OSS_REGION=oss-cn-shanghai`
  - `OSS_VIDEO_PREFIX=chint-dashboard/videos`
- 工单和飞书相关变量见第 5 节。修改构建时变量后必须重新部署。

## 3. 页面入口与主题结构

入口链路：

```text
src/main.ts
└─ src/App.vue
   └─ src/router/index.ts
      └─ src/views/DashboardView.vue
```

`DashboardView.vue` 根据 `dashboard` Pinia 中的 `activeNav` 切换主题组件：

| 一级导航 | 左侧 | 中央底部 | 右侧 |
| --- | --- | --- | --- |
| 综合态势 | `LeftMonitor.vue` | `BottomDock.vue` | `RightOperations.vue` |
| 安全监控 | `SecurityLeft.vue` | `SecurityWorkflowDock.vue` | `SecurityRight.vue` |
| 访客管理 | `VisitorLeft.vue` | `VisitorTimelineDock.vue` | `VisitorRight.vue` |

顶部导航固定为“综合态势 / 安全监控 / 访客管理 / 更多模块”；“更多模块”仅为禁用占位，不响应点击。

共用组件：

- `TopHeader.vue`：品牌、标题、一级导航、时钟、天气、全屏按钮。
- `MetricStrip.vue`：六项核心指标；同比、环比已经移除。
- `CenterScene.vue`：中央厂区模型及各主题点位、轨迹、视频交互。
- `HudPanel.vue`：统一 HUD 面板。
- `BaseChart.vue`：ECharts 注册与自适应封装。
- `ScreenFrame.vue`：1920 × 1080 统一画布缩放。

## 4. 综合态势当前状态

已完成：

- 全局字体层级已体系化，标题、正文、标签、说明文字使用统一变量。
- 顶部关键指标已移除同比、环比信息。
- 左侧厂区运营概览、设备运行状态等环形图已统一尺寸和定位。
- 厂区运营概览环形图不再越界；风险分布中心数字和文字已居中。
- 右侧实时告警列表的告警内容与告警位置分列展示。
- 底部原“应急资源状态 / 实时监控 / 应急资源状态”区域已整体替换为“访客实时管控”。
- 访客实时管控展示当前在厂、今日入厂、超时滞留、限制区告警、定位标签失联、更新时间、访客动态和异常事件。
- 访客异常事件名称与访客编号分列展示，不使用竖向分割线。
- 点击整个“访客实时管控”模块进入访客管理页，并默认选择“当前在厂”。
- 中央模型下方图层栏已精简为“总览 / 建筑 / 设备 / 人员 / 摄像头”，风险点、消防设施和环境监测入口已移除。
- 综合态势中央模型已增加五类动态图层：
  - 总览：五类实时告警点位持续错峰脉冲；每 2.4 秒轮流自动展开一个告警摘要并增强对应等级光晕，无需悬停；鼠标悬停其他点位仍可临时查看，点击复用统一告警详情弹窗。
  - 建筑：中央控制室、生产车间、仓储中心、行政研发中心和访客中心等主要建筑标签全部常驻，基础透明度为 80%；每 2.4 秒轮流将一个标签提升到 100% 并增强光晕。
  - 设备：配电柜、水泵、空压机、装配线和光伏逆变器标签全部常驻，基础透明度为 80%；每 2.4 秒轮流强化一个点位，悬停显示实时状态，点击打开设备实时档案。
  - 人员：综合态势直接展示当前在厂的代表性访客点位，并按周期平滑更新位置。
  - 摄像头：每轮随机显示 5 个监控点位；点击复用安全监控视频弹窗，支持自动播放、循环和全屏。
- 动态轮巡只在综合态势下运行，不改变模型素材尺寸、三栏布局或其他主题页的点位逻辑。

中央主视觉：

- 运行图片：`public/assets/factory-main.png`
- 源素材：根目录 `主体素材清洁版.png`
- 两份素材已经纳入 `fa10ef3`。
- 切换一级导航不能改变中央模型缩放，主题层只叠加点位和交互元素。

## 5. AI 安全监控模块

对应需求：

- `需求说明/监控功能开发.md`

主要组件：

- `SecurityLeft.vue`
- `SecurityRight.vue`
- `SecurityWorkflowDock.vue`
- `CenterScene.vue` 内安全监控分支

已实现：

- 按厂区区域聚合摄像头，点击区域后展开摄像头点位。
- 摄像头预览、暂停、进度和告警时刻定位。
- `public/assets/videos/` 中的 13 个 H.264 MP4 已绑定至安全监控点位；新增东门外围枪机 E05。
- 视频使用静音自动播放和循环，素材加载失败时自动回退到厂区图片模拟画面。
- 告警抓拍截图和实时视频画面均提供原生全屏查看按钮；全屏时保持素材比例，可再次点击按钮或按 Esc 退出。
- AI 告警类别、等级、状态和热点统计。
- 右侧 AI 告警列表已接入 `public/assets/images/` 下的 6 张 1920 × 1080 本地告警截图，并保留厂区画面兜底。
- 点击右侧 AI 告警或底部工单台账时打开独立告警详情，不再弹出实时视频；详情展示抓拍、时间、区域、点位、工单状态和责任人。
- 待确认告警可在详情中选择“消除告警”或“通知责任人”；只有点击中央摄像头点位才打开实时视频。
- 右侧待确认、处理中、已处理工单使用固定高度卡片，不随容器强制拉伸。
- 点击待确认工单可打开处置卡片：
  - “消除告警”直接归入已处理。
  - “通知责任人”归入处理中并写入责任人。
- 底部展示工单处理流程和状态数据。
- 摄像头在线率与环形图比例已保持一致。

### 告警工单闭环与飞书接入

第一阶段告警闭环已实现：

```text
待确认 → 待派单 → 处理中（待接单 / 已接单）→ 待复核 → 已归档
```

- 驾驶舱告警详情已升级为处置中心，支持确认有效、创建工单、查看飞书发送结果、查看移动端处理进展、处置前后照片复核、退回补充和复核归档。
- 派单使用飞书企业自建应用真实发送工单卡片，卡片按钮打开移动 H5；短信保留为辅助通道占位。
- 移动作业端路由为 `/#/work-order?token=<随机工单令牌>`，支持接单、上传 1～3 张处置照片、选填原因和处置措施并提交复核。
- Netlify 使用 Netlify Blobs，EdgeOne 使用 EdgeOne Blob；两套存储彼此独立，切换平台不会自动迁移已有工单和处置图片。
- Netlify 后端入口为 `netlify/functions/work-orders.mjs`，EdgeOne 包装入口为 `cloud-functions/api/work-orders.js`，前端服务统一封装为 `src/services/workOrders.ts`。
- 工单管理操作需要 `WORK_ORDER_ADMIN_PIN`；该口令只配置在部署平台的服务端环境变量中，不能写入前端或仓库。
- 飞书生产环境变量需要在当前实际部署平台中配置：
  - `FEISHU_APP_ID`
  - `FEISHU_APP_SECRET`
  - `FEISHU_RECEIVER_ID_TYPE`（当前责任人配置使用 `user_id` 时必须填写飞书成员详情中的有效用户 ID）
  - `FEISHU_RECEIVER_ID`
  - `FEISHU_RECEIVER_NAME`
  - `FEISHU_RECEIVER_DEPARTMENT`
  - `PUBLIC_SITE_URL`（必须填写当前正式部署地址；EdgeOne 绑定自定义域名后要同步更新）
- 飞书应用必须启用机器人能力、开通“以应用的身份发消息”权限、发布版本，并将责任人加入应用可用范围。
- `App Secret` 等凭证严禁发到聊天、提交仓库或使用 `VITE_*` 前缀。

状态和模拟数据位于：

- `src/data/types.ts`：`SecurityCamera`、`AiAlert`、`AlarmHotspot` 等。
- `src/data/mock.ts`：摄像头、AI 告警、热点和统计模拟数据。
- `src/stores/dashboard.ts`：摄像头区域、当前摄像头、告警状态、视频时间和工单处置。

## 6. 访客管理模块

对应需求：

- `需求说明/访客管理开发.md`

主要组件：

- `VisitorLeft.vue`：访客状态、区域分布、来访类型、停留时长。
- `VisitorRight.vue`：异常事件、状态标签和访客定位列表。
- `VisitorTimelineDock.vue`：访客详情和连续轨迹回放。
- `CenterScene.vue` 内访客管理分支：UWB 聚合点、访客点位、路径和移动游标。

已实现：

- 当前在厂、今日入厂、今日离厂、定位在线率、超时滞留和当前异常人数。
- 全部访客、当前在厂、今日入厂、今日已离厂、异常访客范围筛选。
- 访客状态和厂区区域筛选。
- 中央 UWB 区域聚合，展开后显示代表性访客点位。
- 右侧异常事件、访客列表和中央点位三者联动。
- 姓名脱敏，申报信息与系统记录明确分区。
- 访客轨迹支持 30 分钟、1 小时、2 小时、入厂至今。
- 支持播放、暂停、重播、1×/2×/4×和进度条拖动。
- 轨迹中断路径使用虚线。
- 异常事件可将进度定位到对应越界或失联时刻。

最新交互约定，后续不要回退：

1. 点击中央访客标签后，中央模型不弹出常驻详情窗口，避免遮挡路径。
2. 访客详细信息统一展示在底部框体，包括：
   - 访客身份和企业。
   - 申报信息。
   - 门禁 / UWB 实时记录。
   - 关联异常或当前状态。
3. 底部不再用卡片分段展示位置节点，只保留轨迹范围、播放控制和进度条。
4. 中央移动游标使用 `requestAnimationFrame` 驱动，并在相邻轨迹点之间插值，必须保持连续移动，不能按节点跳跃。
5. 选中访客后仅保留小型选中标识；详细浮层只允许短暂悬停显示，不能在选中后常驻。

连续轨迹核心逻辑：

- `src/stores/dashboard.ts` 的 `visitorTrackCursor` 根据总进度计算所在轨迹段及段内比例，插值生成实时 `x/y`。
- `VisitorTimelineDock.vue` 使用逐帧时间差推进 `visitorTrackProgress`。
- 单次完整 1× 回放约 18 秒，后台或掉帧时对单帧时间差限幅，避免恢复后直接跳到终点。

访客模拟数据：

- `src/data/types.ts`：`Visitor`、`VisitorTrackNode`、`VisitorArea`、`VisitorException`。
- `src/data/mock.ts`：访客、轨迹、区域和异常事件。
- `src/stores/dashboard.ts`：范围筛选、状态筛选、区域筛选、选中访客、选中异常、回放范围、播放速度和进度。

## 7. 视觉与布局约束

- 目标画布始终以 `1920 × 1080` 验收，不能出现页面级横向或纵向溢出。
- 不要改变三栏 HUD 的整体宽度、间距和中央模型比例。
- 所有环形图尺寸应保持统一；百分比必须与图表弧长一致。
- 同层级字号尽量一致，不要局部随意缩小；尤其避免访客动态、异常事件和表头低于当前可读基线。
- 正常状态使用蓝色或绿色；超时、失联使用黄色或橙色；限制区告警使用红色。
- 点位和路径保持百分比坐标，统一在 `src/data/mock.ts` 调整。
- 不要拉伸厂区素材，保持现有 `object-fit` 和画布缩放逻辑。
- 表格需要增加字段时优先调整列宽和内容密度，不要随意加入竖向分割线。
- 右侧工单、异常事件卡片应使用固定高度并允许列表滚动。

全局视觉、字体、主题和访客/安全监控样式集中在：

- `src/styles/main.css`

## 8. 数据接入建议

当前全部业务数据均为静态模拟数据，尚未连接真实后端和 WebSocket。

接入真实接口时：

1. 保持 `types.ts` 和组件消费结构稳定。
2. 新增 `src/services` 或 `src/api`，不要把请求散落到展示组件。
3. Pinia 负责筛选条件、当前选择和实时状态。
4. 高频 UWB 和告警数据优先使用 WebSocket；统计信息可使用轮询。
5. 轨迹接口需要返回时间有序的百分比坐标、区域、事件和连接状态。
6. 实时位置更新时避免重建整页数据，应按访客 ID 增量更新。

## 9. 当前验证结果与已知事项

稳定基线 `4bb1937` 累计已完成：

- `npm run build`
- `git diff --check`
- 1920 × 1080 浏览器回归
- AI 告警处置、访客入口、区域展开、访客筛选、异常联动、时间范围、轨迹播放检查
- 连续轨迹四帧采样位置均不同，确认不是节点跳转
- 页面运行期间未发现控制台错误
- GitHub `main` 已成功推送；Netlify 随后被人工锁定并停止自动发布。
- EdgeOne Makers 已成功完成静态站点和 Node 云函数构建；此前缺失的 `proxy-agent` 打包依赖已经修复。
- EdgeOne 临时默认域名仅用于短时验证，尚需绑定自定义域名后才能作为正式客户访问入口。
- 原 Netlify 稳定生产地址和 Netlify Function 曾验证返回 HTTP 200。
- 视频签名函数成功返回 13 个 OSS 临时地址，签名有效期为 14,400 秒。
- OSS 视频分段请求返回 HTTP 206、`video/mp4` 和 `Accept-Ranges: bytes`，线上流式播放链路已验证。
- 综合态势五类动态图层已完成 1920 × 1080 浏览器回归：建筑与设备标签全量常驻并轮流强化，6 个访客点位坐标连续更新，摄像头每轮稳定保留 5 个随机点位。
- 综合态势摄像头弹窗实测视频 `readyState=4`、自动播放、静音循环、无进度条，源视频尺寸为 1920 × 1080。
- 动态图层交互期间未出现页面级溢出或浏览器控制台错误；安全监控主题切换回归正常。

非阻断事项：

- Vite 仍提示主 JavaScript chunk 超过 1200 kB，主要由 Element Plus、ECharts 和图标库集中加载造成。
- Windows 环境执行 npm 后偶尔显示用户目录 npm 路径权限提示，但构建本身返回成功。
- Git 可能提示无法访问用户级 `.config/git/ignore`，不影响仓库状态和提交。
- 视频监控已接入本地录像素材模拟实时画面，仍未连接真实视频流。
- 工单闭环生产端需要对应平台的 Blob 存储和飞书环境变量；纯 Vite 本地开发只能验证界面，不能直接调用线上云函数。
- `public/assets/videos/` 素材总量约 1.32 GB，已通过 `.gitignore` 排除，不得强制提交至 GitHub。
- `public/assets/images/` 中仅 `ai-*.jpg` 告警截图允许提交；原始录频、检测结果、Excel 和批量抽帧均被忽略。
- 13 个监控视频已上传至私有阿里云 OSS：`ztvideos/chint-dashboard/videos/`（上海地域）。本地开发仍读取被 Git 忽略的 `public/assets/videos/`；生产环境通过平台云函数使用 RAM 只读密钥签发 4 小时有效的视频地址，前端接线位于 `src/services/securityVideoUrls.ts`。
- OSS AccessKey 只允许配置在部署平台的服务端环境变量中，禁止写入仓库或任何 `VITE_*` 变量。所需变量见 `.env.example`。
- 替换监控视频时需同时上传 OSS；保持 `cam-*.mp4` 对象名不变可直接覆盖，不需要修改前端映射。若改名，则必须同步修改摄像头数据和签名函数白名单。
- 访客点位仅提供业务演示所需的代表性模拟数据，不代表全部 86 人逐点绘制。

## 10. 新对话推荐工作方式

开始新功能前：

1. 完整阅读本文件和对应的 `需求说明/*.md`。
2. 检查 `git status -sb` 和当前分支，确认位于 `codex/next-development`，不要覆盖用户已有改动。
3. 不得移动或删除 `baseline-edgeone-2026-07-30` 标签，也不得在未获用户确认时向 `main` 提交、合并或推送。
4. 在当前组件和 Pinia 结构上增量开发，按独立功能形成小而清晰的提交。
5. 涉及布局或交互时使用 1920 × 1080 浏览器验证。
6. 修改完成后至少执行：

```bash
npm run build
git diff --check
git status --short
```

提交前确认只包含本次功能相关文件，并在交接文档中更新最新提交号、已实现功能、验证结果和后续注意事项。

大版本发布建议：

1. 在 `codex/next-development` 完成构建和完整回归。
2. 由用户确认是否发布。
3. 合并到 `main` 后再触发 EdgeOne 生产部署。
4. 验证正式域名、视频签名、飞书派单、移动端接单、照片提交、复核退回和归档闭环。
5. 发布稳定后再创建新的日期标签；旧基线标签永久保留。

安全恢复方式示例：

```bash
git switch -c recovery/baseline-edgeone-2026-07-30 baseline-edgeone-2026-07-30
```

该命令只创建恢复分支，不会破坏现有开发历史。

## 11. 集团三维地球阶段交接（2026-07-31）

对应完整规划：

- `需求说明/集团三维地球与园区下钻开发规划.md`

### 11.1 两级页面架构

当前系统已经从单一园区大屏扩展为集团与园区两级入口：

```text
/#/
└─ 集团层：集团维度 HUD、集团汇总数据、三维地球和制造基地入口

/#/park/jiaxing
└─ 嘉兴园区层：园区维度 HUD、园区业务数据和现有二维厂区图片

/#/work-order
└─ 移动作业端：保持原工单处理流程
```

关键约束：

1. 集团层与园区层使用独立业务组件和独立数据源。
2. 地球层 HUD 只能展示集团整体及全部分厂汇总数据，不能复用嘉兴园区数据。
3. 下钻后再展示嘉兴园区自己的综合态势、安全监控和访客管理数据。
4. 允许复用 `HudPanel`、`BaseChart`、`ScreenFrame` 等无业务含义的基础组件。
5. 嘉兴园区三维模型尚未制作，当前继续使用 `/assets/factory-main.png`；未来通过 `sceneType: 'gltf'` 接入 GLB/GLTF。
6. 其他园区模型完成后，通过统一园区注册表和场景适配器接入，不为每个园区复制一套地球逻辑。

集团层主要文件：

- `src/views/DashboardView.vue`：根据路由层级装配集团或园区页面。
- `src/router/index.ts`：集团首页、嘉兴园区和移动工单路由。
- `src/stores/group.ts`：集团指标、基地、悬停、选中与聚焦状态。
- `src/data/group.ts`：业主指定的 13 个全球制造基地、临时坐标及集团展示数据。
- `src/components/GroupTopHeader.vue`
- `src/components/GroupLeftOverview.vue`
- `src/components/GroupGlobeScene.vue`
- `src/components/GroupRightOverview.vue`

### 11.2 地球模型当前能力

技术路线保持 Vue 3 + TypeScript + Three.js，不迁移 React，不引入 CesiumJS、Mapbox 或在线地图运行时。

已经完成：

- `WebGLRenderer`、`SphereGeometry` 和 `OrbitControls` 交互地球。
- 鼠标拖拽旋转、滚轮缩放、空闲自动旋转和镜头阻尼。
- 最近观察距离已扩展至 `2.25`，最大距离为 `5.8`；园区聚焦距离为 `2.68`。
- 本地日间地表与夜间灯光纹理、柔和昼夜明暗、单层半透明动态云层、方向性大气边缘光和星空；地球表面的球体网格线已移除。云层透明度为 `0.4`，紧贴地表并以约 30 分钟一周的速度独立旋转，关闭深度写入且在国境线、基地标记和波纹之前绘制，避免遮挡信息层。大气层使用紧贴地表的薄球壳并快速衰减，左上受光侧更亮、右侧夜面明显减弱；主光方向同步调整到左上，使地表明暗与边缘光一致。
- 支持 4096 × 2048 纹理的设备默认加载 4K 日夜纹理；低规格设备根据 `maxTextureSize` 自动回退 2048 × 1024。
- 4K/2K 纹理均启用 mipmap、线性过滤和最高 8 倍各向异性过滤。
- 业主指定的 13 个全球制造基地已经进入配置化注册表：
  - 国内：佛山、嘉兴、南阳、咸阳、沈阳、合肥。
  - 国外：新加坡、马来西亚、柬埔寨、埃及、沙特、越南、印度尼西亚。
- 嘉兴为首个 `connected` 园区，点击后聚焦并下钻；其他园区为 `building`，只展示建设状态和介绍。
- 嘉兴与其他基地之间的球面协同弧线；连线使用材质高亮色带沿线流动，不再创建沿线移动的球形 Mesh，避免多园区场景中的模型堆叠。
- 页面离开时释放几何体、材质、纹理、控制器和渲染器。
- WebGL 不可用时保留二维基地入口兜底。

地球纹理资源：

- `public/assets/earth/earth-day-4096.jpg`
- `public/assets/earth/earth-night-4096.jpg`
- `public/assets/earth/earth-day-2048.jpg`
- `public/assets/earth/earth-night-2048.png`
- `public/assets/earth/earth-clouds-1024.png`
- `public/assets/earth/README.md`

纹理来自 Three.js `r185` 官方示例仓库并已本地化。正式商用发布前仍需由业务方确认纹理授权口径，或替换为已完成授权备案的同规格等距圆柱投影纹理。

### 11.3 国家边界与地图合规

已经实现独立 GeoJSON 球面边界加载链路：

- `src/services/globeGeoJson.ts`：解析 Polygon、MultiPolygon 等结构，转换为贴合球面的 `THREE.LineSegments`。
- `src/data/globeBoundaries.ts`：边界资源注册表与生产/开发开关。
- `public/assets/geo/world-countries-china-pov.geojson`：Natural Earth 5.1.1 China POV 开发预览数据。
- `public/assets/geo/README.md`：数据来源、处理过程和使用限制。

边界长线段已经按约 1 度进行球面插值，不会在转到园区锚点视角时穿入球体或消失。

合规约束：

1. 当前 Natural Earth 数据仅用于开发预览，没有中国正式审图号。
2. `globeBoundaries.ts` 只在 `import.meta.env.DEV` 注册该预览边界，生产构建默认不加载。
3. 正式发布必须取得带审图号、授权范围和来源记录的合规边界资源，再经过抽稀与球面预处理接入。
4. 不得为了让生产环境“先显示出来”而移除现有开发环境保护。

### 11.4 园区锚点与标签

当前标注方案为“球面发光锚点 + DOM 标签 + 动态引导线 + 悬停介绍框”：

- Three.js 中的球面圆点固定在真实经纬度坐标。
- DOM 锚点使用同一个三维世界坐标投影，地球背面的锚点自动隐藏。
- 标签偏移和经纬度锚点已经解耦：避让算法只能移动标签，不得移动真实地理锚点。
- 标签按 108 × 26 的碰撞边界进行动态纵向分离，引导线按最终位置重新计算角度和长度。
- 二维锚点主体约 5px，外围动态波纹约 15px；三维球面圆点、园区同心环和嘉兴中心环也同步缩小，避免 13 个基地显示时图标与动画堆叠。
- 常驻标签只显示基地名称，字号为 11px；城市和详细位置小字已经移除。
- 悬停介绍框宽度为 408px，园区名称 19px，介绍正文 14px，产品与定位正文 13px；卡片分为园区简介、主要产品和基地定位三层。
- 悬停框只展示公开口径信息和自然的“进入园区 / 场景建设中”提示；不得增加“接入数据：能源、设备……”等刻意的数据目录，也不得展示产能、金额、运行指数、设备在线率、告警数量等内部经营信息。

基地经纬度、介绍、状态和初始标签偏移集中在 `src/data/group.ts`。当前国内点位采用对应城市中心附近坐标，海外仅给出国家的点位采用首都或代表性城市坐标，全部属于临时定位，不代表工厂真实地址。正式上线前必须由业务方逐项确认厂址、经纬度、正式名称和介绍。

### 11.5 园区层回归修复

集团/园区路由接入后曾出现嘉兴安全监控底部模块加载失败、两侧模块异常以及后续导航无法切换，已完成以下修复：

- 兼容并标准化历史工单字段。
- `SecurityWorkflowDock.vue` 对责任人字段进行空值保护。
- 集团与园区导航统一通过明确的切换入口处理。
- 园区 Dashboard 按导航状态重新挂载，避免跨主题遗留状态。
- 进入园区时重置园区导航，避免集团层状态污染。

后续 UI 重构不得破坏上述园区主题切换修复。

### 11.6 当前验证与已知事项

截至 2026-07-31，当前开发分支版本最后一次验证通过：

```powershell
.\node_modules\.bin\vue-tsc.cmd --noEmit -p tsconfig.app.json
npx.cmd --yes node@22.14.0 .\node_modules\vite\bin\vite.js build
git diff --check
```

- 生产构建成功，4K 与 2K 地球纹理均已进入 `dist/assets/earth/`。
- Vite 仍提示主 JavaScript chunk 超过 1200 kB，这是现有非阻断警告。
- 用户已经人工预览并确认地球模型部分整体问题不大，后续只需渐进优化。
- 当前最新字体、4K 纹理和标签避让改动已完成静态检查与生产构建；由于服务由用户手动管理，交接前没有自行启动浏览器服务。
- 集团地球代码、资源、规划与最新视觉调整已经进入提交 `e271d25` 并推送至 `origin/codex/next-development`；`main` 和稳定基线标签仍保持在 `4bb1937`。

## 12. 集团层对外展示 UI 重构

用户已确认集团主页直接定位为“全球制造基地”页面，兼顾客户对外展示与未来全球园区数据打通规划，不再保留“集团总览 / 全球基地 / 经营态势 / 更多模块”等集团层顶部栏目。

截至 2026-07-31，当前开发分支已经完成第一版结构重构：

1. 顶部只保留 CHINT 品牌、页面标题、日期时间和全屏按钮。
2. 移除原集团六指标横条，不再在主页展示实时告警、设备在线率、能耗负荷、园区运营评分和内部协同任务。
3. 左侧收敛为“全球制造网络”，展示基地数量、覆盖国家和地区、已接入园区以及 13 个重点园区入口；列表支持滚动。
4. Three.js 地球改为集团页全屏背景层，不再限制在中央矩形区域；放大后可以延伸至左右面板后方。
5. 右上展示“经营业绩增长”，以 2026 年一季度营业收入同比为主指标，辅以净利润率、全球客户满意度和净资产收益率，不展示任何经营金额；后三项当前为方案演示值，正式交付前需由客户确认替换。
6. 右下轮换展示“绿色制造 / 智能制造 / 创新投入”，包括清洁能源、碳减排、绿色工厂、数字化工厂、研发投入占比、年度专利申请和新品上市效率等对外成果；创新投入数据当前为方案演示值。
7. 原底部大型协同态势面板、“全球数据互联”浮层和“集团制造网络 · 动态链路”图例条均已移除。
8. 园区列表与地球继续联动；嘉兴可以进入园区页面，其他园区聚焦查看并提示场景建设中。
9. 集团前端数据源中已经移除不再使用的集团告警、设备在线率、园区运营评分等内部模拟数据。
10. 左右展示面板改为半透明悬浮层，文字与交互保持清晰，同时允许透视其后的地球和园区链路。

当前经营增长、绿色制造、智能制造和创新投入数值包含界面演示口径。正式对外发布前必须由业务方提供或确认公开数据、统计周期和来源，不得将演示数值当作正式经营披露。

后续继续开发时：

1. 把 `GroupGlobeScene.vue` 视为已经可用的独立中央能力，除非布局确实需要适配，否则不要重新实现地球模型。
2. 集团层继续使用集团汇总数据，园区下钻层继续使用园区数据；不得为了复用 UI 混用业务口径。
3. 不要顺带重构嘉兴园区层、安全监控、访客管理或移动工单，除非用户明确纳入范围。
4. 用户手动管理预览服务；未获得当次明确要求时，不启动或停止任何服务。

UI 重构验收仍以 `1920 × 1080` 为基准，并至少保证：

- 地球交互、园区标签、悬停介绍和嘉兴下钻正常。
- 集团 HUD 与地球不互相遮挡。
- 集团与园区路由前进、后退和直接访问正常。
- 嘉兴综合态势、安全监控和访客管理仍可切换。
- 页面无横向或纵向溢出。
- TypeScript 检查、生产构建和 `git diff --check` 通过。
- 不直接提交、合并或推送 `main`。

本轮第一版已经通过 TypeScript 检查、生产构建和 `git diff --check`。Vite 主包超过 1200 kB 的原有非阻断警告仍然存在。由于预览服务由用户手动管理，本轮没有启动浏览器服务，1920 × 1080 最终视觉效果仍需用户启动现有服务后共同确认。

## 13. 嘉兴基地 UI 重构阶段记录

### 13.1 当前开发起点

用户已决定继续在当前 Codex 对话中重构嘉兴基地大屏 UI。这不是新项目，也不应从集团主页重新开始。

- 继续使用仓库：<https://github.com/Sunyx1234/BigScreenDemo>
- 继续使用分支：`codex/next-development`
- 嘉兴阶段起点提交：`e271d25 Enhance global manufacturing globe`；嘉兴 UI 最新版本以当前分支最新提交为准。
- 嘉兴页面直接地址：`/#/park/jiaxing`
- 集团主页直接地址：`/#/`
- 移动作业端地址：`/#/work-order`
- `main`、`origin/main` 和 `baseline-edgeone-2026-07-30` 仍停留在 `4bb1937`，未经用户确认不得合并或推送 `main`。

本阶段提交完成后，工作区仍会保留用户自己的素材移动：根目录 `主体素材清洁版.png` 删除、`public/主体素材清洁版.png` 未跟踪。后续必须保留这组状态，不得擅自还原、删除、暂存或提交；继续提交嘉兴改动时使用显式文件列表。

后续接手时先执行：

```powershell
Get-Content -Raw HANDOFF.md
git status -sb
git branch --show-current
git log -3 --oneline
```

用户继续手动管理本地预览服务。除非用户明确要求，不得运行 `npm run dev`、`npm run preview`、启动后台服务、扫描端口或结束用户进程。

### 13.2 嘉兴页面当前并非独立 UI

嘉兴基地目前通过园区路由复用现有园区大屏组件，并没有单独的 `JiaxingDashboard.vue`、独立 Pinia store 或独立业务数据文件。

当前装配链路：

```text
/#/park/jiaxing
└─ src/views/DashboardView.vue
   ├─ TopHeader.vue
   └─ dashboard-grid
      ├─ 综合态势：LeftMonitor + CenterScene + BottomDock + RightOperations
      ├─ 安全监控：SecurityLeft + CenterScene + SecurityWorkflowDock + SecurityRight
      └─ 访客管理：VisitorLeft + CenterScene + VisitorTimelineDock + VisitorRight
```

核心文件与职责：

| 文件 | 当前职责 | 重构注意事项 |
| --- | --- | --- |
| `src/views/DashboardView.vue` | 集团/园区路由装配、园区主题切换时重新挂载、工单轮询启停 | 不要破坏集团页装配、无效园区回退和园区服务生命周期 |
| `src/components/TopHeader.vue` | 嘉兴标题、综合态势/安全监控/访客管理导航、天气、时间、全屏、返回集团 | 导航和返回集团入口必须保留；视觉可重构 |
| `src/components/MetricStrip.vue` | 根据当前主题显示六项园区核心指标 | 指标内容来自共享 store，后续可按嘉兴口径重新梳理 |
| `src/components/CenterScene.vue` | 三个主题共用的中央场景、点位、轨迹、摄像头和详情交互 | 文件较大且交互密集，视觉改动必须按主题回归 |
| `src/components/LeftMonitor.vue` / `RightOperations.vue` / `BottomDock.vue` | 综合态势左右与底部业务区 | 当前仍是原三栏 HUD 结构 |
| `src/components/Security*.vue` | 安全监控统计、视频、告警和工单闭环 | 不得破坏视频弹窗、工单状态和飞书/移动端链路 |
| `src/components/Visitor*.vue` | 访客统计、异常、UWB 定位和轨迹回放 | 不得破坏连续插值轨迹和筛选联动 |
| `src/stores/dashboard.ts` | 园区三主题共享状态、筛选、选择、工单和轨迹逻辑 | 现有状态清理逻辑属于回归保护，不要随意删除 |
| `src/data/mock.ts` / `src/data/types.ts` | 嘉兴当前使用的模拟数据与类型 | 目前并未与其他未来园区数据隔离 |
| `src/styles/main.css` | 园区、集团、移动端全部样式 | 嘉兴重构应使用明确的园区作用域，避免污染集团主页 |

园区标题由 `DashboardView.vue` 根据 `src/data/group.ts` 中嘉兴配置动态生成，当前显示“嘉兴基地综合态势运营中心”。嘉兴为唯一 `connected` 园区，其他基地仍处于 `building` 状态。

### 13.3 当前嘉兴页面需要保留的功能基线

UI 可以大幅调整，但以下行为是已经完成的功能，不应在视觉重构中回退：

1. 从集团地球点击嘉兴后聚焦并进入 `/#/park/jiaxing`，浏览器前进、后退和直接访问正常。
2. 进入新的园区 ID 时，`DashboardView.vue` 将园区导航重置为“综合态势”；集团层不会启动园区工单轮询。
3. 园区顶部可以在“综合态势 / 安全监控 / 访客管理”之间切换，切换时通过带主题 key 的容器重新挂载，避免跨主题遗留状态。
4. “返回集团地球”必须返回 `/#/`，不能变成无效的静态装饰。
5. 中央场景当前使用 `public/assets/factory-main.png`，必须保持比例，不得拉伸；嘉兴 GLB/GLTF 尚未提供。
6. 综合态势的五类图层、设备详情、告警点位、访客动态和摄像头入口保持可用。
7. 安全监控的视频播放、AI 告警详情、工单派发、移动端处理、照片复核和归档流程保持可用。
8. 访客管理的范围筛选、异常联动、UWB 点位、时间范围、连续轨迹插值和播放控制保持可用。
9. `configureSecurityVideoUrls()` 与工单轮询只在园区层启动，离开园区时必须停止。

### 13.4 已确认方向与当前实现

用户查看轻量化第一版后，确认原有带完整边框、标题色带、裁角和三栏紧凑结构的园区 UI 更合适。因此轻量化顶栏、无边框面板、宽松三栏、轻量指标条和场景工具条方案已经撤回，嘉兴恢复原有 HUD 视觉设计；集团主页不受影响。

当前只保留下列已确认改进：

1. `DashboardView.vue` 为非集团页面保留 `park-dashboard` 作用域，用于隔离园区字号与局部功能样式。
2. 园区字号变量统一为显示标题 32px、面板标题 16px、指标值 28px、正文 13px、标签 12px、辅助信息 11px、装饰信息 10px。
3. 访客异常列表的状态徽标固定为 `50 × 24px` 单行尺寸，避免被网格行高拉伸成纵向色块。
4. 综合态势“实时告警列表”在原有带边框面板内自动滚动，每 2.8 秒推进一行，到底后回到顶部；鼠标悬停时暂停，同时保留滚轮浏览能力，数据不会溢出到下一面板。
5. 视频、工单、告警、轨迹、园区下钻和 Pinia 状态逻辑均未修改。

当前修改集中在 `src/views/DashboardView.vue`、`src/styles/main.css` 与 `src/components/RightOperations.vue`。已通过 TypeScript 检查、Vite 生产构建和 `git diff --check`；由于预览服务由用户管理，最终视觉效果等待用户刷新现有嘉兴页面后共同确认。

后续可能继续讨论但尚未批准的结构性方向：是否精简嘉兴首页模块、重新确定 4～6 个核心指标，以及是否为未来多园区接入建立 `src/data/jiaxing.ts` 或园区数据适配层。不要在没有用户确认时自行拆分 store 或重写 `CenterScene.vue`。

### 13.5 嘉兴重构验收清单

验收仍以 `1920 × 1080` 为基准：

- 页面无横向或纵向溢出，三种主题的可读性和信息密度一致。
- 集团主页视觉与地球交互不因嘉兴样式调整发生变化。
- 嘉兴直接访问、集团下钻、返回集团、浏览器前进后退均正常。
- 综合态势、安全监控、访客管理均可切换，切换后无状态串页。
- 厂区素材不拉伸，点位百分比坐标和弹层定位正常。
- 安全视频、告警工单、访客轨迹等现有关键交互至少完成一次回归。
- 修改完成后执行：

```powershell
.\node_modules\.bin\vue-tsc.cmd --noEmit -p tsconfig.app.json
& 'C:\Users\SYX\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' '.\node_modules\vite\bin\vite.js' build
git diff --check
git status --short
```

生产构建中主 JavaScript chunk 超过 1200 kB 的提示为现有非阻断警告。不得把“消除该警告”自行扩大为本轮嘉兴 UI 重构任务。

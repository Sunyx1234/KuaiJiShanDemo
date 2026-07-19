# 正泰集团厂区综合态势运营中心——开发交接

## 1. 当前开发基线

- 当前已发布版本提交：`80a0b35 Add security media and Netlify OSS delivery`
- GitHub 仓库：<https://github.com/Sunyx1234/BigScreenDemo>
- 默认分支：`main`
- Netlify 稳定生产地址：<https://tiny-bienenstitch-386238.netlify.app/>
- 基准画布：`1920 × 1080`，由 `ScreenFrame.vue` 统一等比例缩放。
- 当前版本已完成综合态势、AI 安全监控、访客实时管控和访客管理主题页；设备监测和应急指挥暂不开发，已移除导航入口。
- 后续必须在现有视觉和交互体系上增量开发，不要重构成普通后台或重新设计整体视觉层。
- `main` 已与 `origin/main` 同步，并连接 Netlify 持续部署。

新对话开始后建议先执行：

```powershell
Get-Content -Raw HANDOFF.md
git status --short
git log -3 --oneline
npm run build
```

## 2. 技术栈与运行方式

- Vue 3 + TypeScript
- Vite
- Pinia
- Vue Router 4
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

### 线上部署与更新链路

当前采用 GitHub + Netlify + 私有阿里云 OSS：

```text
本地修改和验证
→ 提交并推送 GitHub main
→ Netlify 自动执行 npm run build
→ 发布 dist 和 netlify/functions
→ 稳定生产地址自动指向最新成功版本
```

- Netlify 构建配置位于 `netlify.toml`：
  - Build command：`npm run build`
  - Publish directory：`dist`
  - Functions directory：`netlify/functions`
- 稳定生产地址用于长期分享：<https://tiny-bienenstitch-386238.netlify.app/>
- 形如 `<deploy-id>--tiny-bienenstitch-386238.netlify.app` 的地址是单次部署永久快照，以后不会更新。
- 如果新构建失败，稳定生产地址继续保留上一个成功发布版本。
- Netlify 需要以下环境变量；真实密钥仅保存在 Netlify，禁止写入仓库：
  - `VITE_USE_OSS_SIGNED_VIDEOS=true`
  - `OSS_ACCESS_KEY_ID`
  - `OSS_ACCESS_KEY_SECRET`
  - `OSS_BUCKET=ztvideos`
  - `OSS_REGION=oss-cn-shanghai`
  - `OSS_VIDEO_PREFIX=chint-dashboard/videos`
- 修改 Netlify 环境变量后，需要重新触发部署。

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
- 工单与照片使用 Netlify Blobs 站点级存储，生产部署更新后数据继续保留；驾驶舱每 3 秒同步一次工单状态。
- 后端入口为 `netlify/functions/work-orders.mjs`，前端服务封装为 `src/services/workOrders.ts`。
- 工单管理操作需要 `WORK_ORDER_ADMIN_PIN`；该口令只配置在 Netlify，不能写入前端或仓库。
- 飞书生产环境变量：
  - `FEISHU_APP_ID`
  - `FEISHU_APP_SECRET`
  - `FEISHU_RECEIVER_ID_TYPE`（推荐先用 `email`）
  - `FEISHU_RECEIVER_ID`
  - `FEISHU_RECEIVER_NAME`
  - `FEISHU_RECEIVER_DEPARTMENT`
  - `PUBLIC_SITE_URL=https://tiny-bienenstitch-386238.netlify.app`
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

`80a0b35` 发布前后已完成：

- `npm run build`
- `git diff --check`
- 1920 × 1080 浏览器回归
- AI 告警处置、访客入口、区域展开、访客筛选、异常联动、时间范围、轨迹播放检查
- 连续轨迹四帧采样位置均不同，确认不是节点跳转
- 页面运行期间未发现控制台错误
- GitHub `main` 已成功推送并触发 Netlify 自动部署。
- 稳定生产地址和 Netlify Function 均返回 HTTP 200。
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
- 工单闭环生产端需要 Netlify Blobs 和飞书环境变量；纯 Vite 本地开发只能验证界面，不能直接调用 Netlify Functions。
- `public/assets/videos/` 素材总量约 1.32 GB，已通过 `.gitignore` 排除，不得强制提交至 GitHub。
- `public/assets/images/` 中仅 `ai-*.jpg` 告警截图允许提交；原始录频、检测结果、Excel 和批量抽帧均被忽略。
- 13 个监控视频已上传至私有阿里云 OSS：`ztvideos/chint-dashboard/videos/`（上海地域）。本地开发仍读取被 Git 忽略的 `public/assets/videos/`；Netlify 生产环境通过 `netlify/functions/video-urls.mjs` 使用 RAM 只读密钥签发 4 小时有效的视频地址，前端接线位于 `src/services/securityVideoUrls.ts`。
- OSS AccessKey 只允许配置在 Netlify 环境变量中，禁止写入仓库或任何 `VITE_*` 变量。所需变量见 `.env.example`。
- 替换监控视频时需同时上传 OSS；保持 `cam-*.mp4` 对象名不变可直接覆盖，不需要修改前端映射。若改名，则必须同步修改摄像头数据和签名函数白名单。
- 访客点位仅提供业务演示所需的代表性模拟数据，不代表全部 86 人逐点绘制。

## 10. 新对话推荐工作方式

开始新功能前：

1. 完整阅读本文件和对应的 `需求说明/*.md`。
2. 检查 `git status --short`，不要覆盖用户已有改动。
3. 在当前组件和 Pinia 结构上增量开发。
4. 涉及布局或交互时使用 1920 × 1080 浏览器验证。
5. 修改完成后至少执行：

```bash
npm run build
git diff --check
git status --short
```

提交前确认只包含本次功能相关文件，并在交接文档中更新最新提交号、已实现功能、验证结果和后续注意事项。

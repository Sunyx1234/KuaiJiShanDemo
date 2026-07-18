# 正泰集团厂区运营中心——开发交接

## 1. 当前开发基线

- 当前已确认版本提交：`fa10ef3 Build AI monitoring and visitor management modules`
- GitHub 仓库：<https://github.com/Sunyx1234/BigScreenDemo>
- 默认分支：`main`
- 基准画布：`1920 × 1080`，由 `ScreenFrame.vue` 统一等比例缩放。
- 当前版本已完成综合态势、AI 安全监控、访客实时管控和访客管理主题页；设备监测和应急指挥暂不开发，已移除导航入口。
- 后续必须在现有视觉和交互体系上增量开发，不要重构成普通后台或重新设计整体视觉层。
- `fa10ef3` 只完成了本地提交，交接时尚未推送远程仓库。

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

`fa10ef3` 提交前已完成：

- `npm run build`
- `git diff --check`
- 1920 × 1080 浏览器回归
- AI 告警处置、访客入口、区域展开、访客筛选、异常联动、时间范围、轨迹播放检查
- 连续轨迹四帧采样位置均不同，确认不是节点跳转
- 页面运行期间未发现控制台错误

非阻断事项：

- Vite 仍提示主 JavaScript chunk 超过 1200 kB，主要由 Element Plus、ECharts 和图标库集中加载造成。
- Windows 环境执行 npm 后偶尔显示用户目录 npm 路径权限提示，但构建本身返回成功。
- Git 可能提示无法访问用户级 `.config/git/ignore`，不影响仓库状态和提交。
- 视频监控已接入本地录像素材模拟实时画面，仍未连接真实视频流。
- `public/assets/videos/` 素材总量约 1.32 GB，多个文件接近或超过 GitHub 普通单文件上传限制，提交远端前需压缩、使用 Git LFS 或改为外部资源托管。
- 13 个监控视频已上传至私有阿里云 OSS：`ztvideos/chint-dashboard/videos/`（上海地域）。本地开发仍读取被 Git 忽略的 `public/assets/videos/`；Netlify 生产环境通过 `netlify/functions/video-urls.mjs` 使用 RAM 只读密钥签发 4 小时有效的视频地址，前端接线位于 `src/services/securityVideoUrls.ts`。
- OSS AccessKey 只允许配置在 Netlify 环境变量中，禁止写入仓库或任何 `VITE_*` 变量。所需变量见 `.env.example`。
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

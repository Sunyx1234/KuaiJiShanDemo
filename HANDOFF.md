# 正泰集团厂区运营中心——开发交接

## 1. 当前基线

- 当前版本是用户确认认可的视觉版本，后续开发应在此基础上增量修改，不要推倒或重新设计整体视觉层。
- GitHub 仓库：<https://github.com/Sunyx1234/BigScreenDemo>
- 默认分支：`main`
- 交接前功能基线提交：`1249eb2`
- 基准画布：`1920 × 1080`，通过统一画布整体缩放适配其他分辨率。
- 页面定位：正泰集团厂区运营、安全、设备、能源、人员和应急指挥数字孪生大屏。

## 2. 技术栈

- Vue 3
- TypeScript
- Vite
- Element Plus
- Element Plus Icons
- ECharts + vue-echarts
- Pinia
- Vue Router 4
- 组件统一使用 Composition API 与 `<script setup lang="ts">`

## 3. 本地运行与验证

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm run preview
```

`npm run build` 会先执行 `vue-tsc` 类型检查，再生成 `dist`。

如果默认端口被其他项目占用，以 Vite 终端实际输出的 Local URL 为准。不要直接假设页面一定在 `http://localhost:5173`。

当前环境访问 GitHub 时使用本机 HTTP 代理端口 `12450`。需要手动推送时可使用：

```bash
git -c http.proxy=http://127.0.0.1:12450 \
    -c https.proxy=http://127.0.0.1:12450 \
    push
```

PowerShell 可写成单行：

```powershell
git -c http.proxy="http://127.0.0.1:12450" -c https.proxy="http://127.0.0.1:12450" push
```

## 4. 页面结构

入口链路：

```text
src/main.ts
└─ src/App.vue
   └─ src/router/index.ts
      └─ src/views/DashboardView.vue
```

主要区域组件：

- `TopHeader.vue`：品牌、标题、一级导航、实时时钟、天气和全屏按钮。
- `MetricStrip.vue`：中央顶部六项核心指标。
- `LeftMonitor.vue`：运营概览、设备状态、环境监测和能耗趋势。
- `CenterScene.vue`：厂区主场景、交互点位、图层工具栏和设备详情面板。
- `RightOperations.vue`：风险分布、告警列表、隐患闭环和人员趋势。
- `BottomDock.vue`：实时监控、事件处置流程和应急资源。
- `HudPanel.vue`：统一 HUD 面板外壳。
- `BaseChart.vue`：ECharts 注册和自适应封装。
- `ScreenFrame.vue`：1920 × 1080 画布的统一等比例缩放。

## 5. 数据和状态

- `src/data/types.ts`：指标、场景点位、设备详情、告警等 TypeScript 类型。
- `src/data/mock.ts`：全站模拟数据、导航指标、场景点位、告警、能耗曲线和监控点位。
- `src/stores/dashboard.ts`：当前导航、图层、选中设备、告警筛选、风险筛选、能源类型和时间维度等共享状态。

后续接入真实接口时，优先保持现有类型与组件输入结构，仅替换 `mock.ts` 的数据来源或增加 API/service 层，不要把接口请求散落到各展示组件。

## 6. 已实现交互

- 顶部五个一级导航切换，并联动中央核心指标。
- 页面时间每秒更新。
- 浏览器全屏进入与退出。
- 电、水、气切换及日、月、年能耗维度切换。
- 风险等级筛选并联动中央风险点。
- 告警分类筛选、详情弹窗和场景点位定位。
- 场景图层切换：总览、建筑、设备、人员、摄像头、风险点、消防设施和环境监测。
- 场景设备点位点击后打开设备详情和运行趋势。
- 监控卡片点击放大。
- ECharts tooltip、图例和容器自适应。
- `prefers-reduced-motion` 降低非必要动画。

## 7. 视觉与素材约束

- 当前视觉版本已确认，不要替换为常规后台、卡片式管理系统或其他通用大屏模板。
- 主色、告警色、面板色和阴影变量集中在 `src/styles/main.css` 的 `:root`。
- 厂区主视觉：`public/assets/factory-main.png`。
- 参考效果图副本：`public/assets/design-reference.png`。
- 交互标签必须保持百分比定位，坐标数据在 `src/data/mock.ts` 的 `sceneMarkers`。
- 厂区图已经包含一部分视觉标签，HTML 点位默认采用小型热点，悬停或选中时再显示文字，避免重复遮挡。
- 不要拉伸主体素材；保持当前 `object-fit` 和画布缩放逻辑。
- 原始素材目录和根目录原图保留在本地，但通过 `.gitignore` 排除；实际运行引用 `public/assets` 内的副本。

## 8. 当前已知事项

- Vite 构建成功，但打包时会提示主 JavaScript chunk 较大。这是 Element Plus、ECharts 和图标库集中加载造成的非阻断警告。后续如需优化，可按路由/图表类型拆包，但不要为了拆包改变页面行为。
- 当前视频监控使用厂区主图的不同区域作为本地模拟画面，没有依赖外部图片链接。
- 模拟数据为静态业务数据，尚未连接后端接口和 WebSocket。
- `public/og.png` 是站点分享预览图，不参与大屏首屏展示。
- `current-preview.png` 是本地验收截图并已忽略，不会提交到仓库。

## 9. 后续开发建议

建议按以下顺序增量推进：

1. 明确真实接口字段并增加 API/service 层。
2. 将 Pinia 中的筛选和选中状态与接口查询参数联动。
3. 增加 WebSocket 或轮询数据刷新机制。
4. 根据真实点位校准 `sceneMarkers` 百分比坐标。
5. 补充组件级测试和关键交互的浏览器回归测试。
6. 最后再做按需加载、图表拆包和性能优化。

每次修改后至少执行：

```bash
npm run build
git status
```

确保构建通过、工作区只包含本次任务相关变更后再提交。

# 正泰集团厂区综合态势运营中心

基于 Vue 3、TypeScript、Vite、Element Plus、ECharts、Pinia 与 Vue Router 4 开发的 1920 × 1080 数字孪生可视化大屏。

## 本地运行

```bash
npm install
npm run dev
```

浏览器访问终端输出的本地地址。

## 生产构建

```bash
npm run build
npm run preview
```

构建产物位于 `dist` 目录。

## 主要交互

- 顶部一级导航切换业务指标。
- 风险分布、告警分类和能耗类型/日月年维度筛选。
- 场景图层控制、点位定位和设备详情查看。
- 监控画面放大、告警详情弹窗、全屏切换。
- 1920 × 1080 基准画布整体等比例适配，兼容非 16:9 屏幕。

模拟数据集中维护在 `src/data`，后续可直接替换为接口数据。

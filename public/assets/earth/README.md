# 地球纹理说明

当前开发预览使用 Three.js r185 官方示例仓库中的地球纹理，并已本地化，页面运行时不访问外部地址。支持 4096 纹理的设备默认加载 4K 版本，低规格设备自动回退 2K。

| 本地文件 | 上游文件 | 用途 |
| --- | --- | --- |
| `earth-day-4096.jpg` | `examples/textures/planets/earth_day_4096.jpg` | 默认 4K 日间地表 |
| `earth-night-4096.jpg` | `examples/textures/planets/earth_night_4096.jpg` | 默认 4K 夜间城市灯光 |
| `earth-day-2048.jpg` | `examples/textures/planets/earth_atmos_2048.jpg` | 低规格设备日间地表兜底 |
| `earth-night-2048.png` | `examples/textures/planets/earth_lights_2048.png` | 低规格设备夜间灯光兜底 |

- 上游版本：Three.js `r185`
- 上游目录：<https://github.com/mrdoob/three.js/tree/r185/examples/textures/planets>
- 仓库许可：MIT，见 <https://github.com/mrdoob/three.js/blob/r185/LICENSE>
- 接入日期：2026-07-31

正式商用发布前仍需由业务方确认纹理授权口径，或替换为已完成授权备案的同规格等距圆柱投影纹理。

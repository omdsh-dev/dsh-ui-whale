# @dsh-external/dsh-ui-whale

DSH Web UI 的常驻像素鲸鱼伙伴插件：会话标题栏（标题行右侧）常驻一只小鲸鱼，随会话快照实时反应——**零核心改动**。

## 版本对应 / Version compatibility

构建产物随 DSH 快照版本更新，安装时按快照选择对应版本：

| 插件版本 | DSH 快照 | 说明 |
| --- | --- | --- |
| `v0.1.0` | `snapshots/20260805T134133Z-ce1fc03f95`（snapshot0805） | 旧构建，按旧安装方式（`~/.dsh/config.yaml` + `pnpm add -w link:`） |
| `v0.2.0` | `snapshots/20260806T160212Z-279244acb0`（snapshot0806） | 0806 新构建，按新安装方式 |
| `v0.3.0` | `snapshots/20260806T160212Z-279244acb0`（snapshot0806） | 0806 构建 + 睡觉动画（连续空闲 10 s 入睡） |
| `v0.3.1` | `snapshots/20260806T160212Z-279244acb0`（snapshot0806） | 睡觉 Z 改 5 帧循环 `0-1-2-3-4-5-1-…`；尾巴加一帧改 `0-1-2-3-4-3-2-1-0` |
| `v0.3.2`（默认） | `snapshots/20260806T160212Z-279244acb0`（snapshot0806） | 修正睡觉 Z 浮动轨迹（重新定位 睡觉2~5 的 Z 位置） |

> git 依赖方式固定 tag：`pnpm add '@dsh-external/dsh-ui-whale@github:dsh-external/dsh-ui-whale#v0.3.2'`（0805 用户用 `#v0.1.0`）。

## 演示 Demo

![dsh-ui-whale 完整演示](docs/dsh-ui-whale-demo.gif)

各动作 GIF：

![摆尾巴](docs/摆尾巴.gif) ![摆腹鳍](docs/摆腹鳍.gif)

![喷水花](docs/喷水花.gif) ![冒爱心](docs/冒爱心.gif) ![睡觉](docs/睡觉.gif)

> 完整视频：[docs/dsh-ui-whale-demo.mp4](docs/dsh-ui-whale-demo.mp4)、[docs/dsh-ui-whale-sleep.mp4](docs/dsh-ui-whale-sleep.mp4)

## 它做什么

- **平时（空闲）**：隔一会儿眨一次眼（约 5 秒）；偶尔摆一下尾巴（约 11 秒一次，0-1-2-3-4-3-2-1-0 来回）；偶尔动动胸鳍（约 7 秒一次，0-1-2-1-0 来回）。
- **睡觉**：连续空闲 **10 秒**后入睡——头顶灰色「Z」按 **0-1-2-3-4-5-1-2-3-4-5-1-…** 循环（先静止姿态 0 一次，再上浮→渐小→淡出 1-5 反复）；睡觉期间动鱼鳍和甩尾巴照常；一有活动（思考 / 工作 / 运行 / 喷水庆祝）立即醒来。
- **思考 / 运行 / 工作中**：尾巴持续摆动 + 胸鳍持续扑动 + 眨眼更频繁。
- **回合完成时**：头顶喷水庆祝——水花按**单向 0-1-2-3-4-5-6** 喷起散开（不反向），喷完结束。
- **点击鲸鱼**：左上角冒出一颗粉色爱心，从小变大再消失（**单向 0-1-2-3-0**），期间其它动作照常进行；再点一次会重新从小爱心开始。

## 美术与实现

- 素材：22 帧手绘像素画（25×40 网格，7 色调色板：深蓝 `#203864`、身体蓝 `#0066FF`、浅蓝 `#B4C7E7`、白 `#F2F2F2`、粉 `#CC3399`、灰 `#808080`——睡眠 Z 符号），`sprites/` 里保存帧数据。
- 渲染：分层 CSS box-shadow 像素画（身体 / 眼睛 / 尾巴 / 胸鳍 / 喷水花 / 爱心 / 睡眠 Z 各一层），动画 = 固定 DOM 树上的样式切换，无逐帧布局。
- 分层由帧数据自动推导：每个动画区域 = 该动作任一帧相对静止姿势变化的单元格集合，组合姿势逐像素还原原图（有测试钉住）。
- 动画引擎是纯 tick 状态机（`src/client/animation.ts`），情绪由会话快照的 running / 推理 partial / 运行中工具推导；睡觉由连续空闲 tick 数（10 s）推导。

## 安装（组织内成员）

见 [INSTALL.md](INSTALL.md)。要点：克隆仓库 → `pnpm install` → 把包装进 harness 依赖链 → 在 `~/.dsh/config.yaml` 加一行配置 → 重启 `dsh web`。

配置行：

```yaml
- insert:
    - id: dsh-ui-whale
      name: '@dsh-external/dsh-ui-whale'
```

## 开发

```sh
pnpm install        # 依赖（link: 到 ../.dsh/source/current 快照）
pnpm build          # tsdown → lib/{index,invariant,client}.js
pnpm typecheck      # tsc
pnpm test           # vitest（帧一致性 / 动画序列 / 插件注册）
```

## Model Experience

无——纯浏览器端 UI 呈现：不进入模型请求、不增加提示词内容、不改任何工具 schema。

## License

BSD-3-Clause（见 [LICENSE](LICENSE)）。

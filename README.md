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
| `v0.3.2` | `snapshots/20260806T160212Z-279244acb0`（snapshot0806） | 修正睡觉 Z 浮动轨迹（重新定位 睡觉2~5 的 Z 位置） |
| `v0.3.3`（默认） | `snapshots/20260810T155924Z-8ec407cd64`（snapshot0810） | 兼容性构建：客户端插件元数据从顶层 `dshClient` 迁移为嵌套 `dsh.client`（0810 的 ClientModuleHostService 只读该字段；顶层 `dshClient` 被静默忽略），inject/platform 原样保留 |

> **兼容性说明**：上表构建均基于 snapshot0806 开发，同时兼容 snapshot0807（`snapshots/20260807T130646Z-e8a0f1a758`）、snapshot0808（`snapshots/20260808T121140Z-7f25d3e98c`）、snapshot0809（`snapshots/20260809T140917Z-a6bb5a95ba`）与 snapshot0810（`snapshots/20260810T155924Z-8ec407cd64`）——0807/0808/0809/0810 用户直接安装默认版本（`v0.3.3`）即可。

> git 依赖方式固定 tag：`pnpm add '@dsh-external/dsh-ui-whale@github:dsh-external/dsh-ui-whale#v0.3.3'`（0810 用户；0806~0809 用户用 `#v0.3.2`，0805 用户用 `#v0.1.0`）。

## 0809 兼容要点（snapshot0809，实机验证）

- 0809 运行中的 `dsh web` 的 `window.__DSH_BOOT__` 清单包含 `@dsh-external/dsh-ui-whale`，标题栏鲸鱼正常渲染——眨眼/摆尾/思考/喷水/睡觉动画与点击爱心均实测可用。
- **加载机制变化**：0809 重构了客户端插件机制——旧的 `dsh.plugin.json` 清单 + `resolveClientPath`（`packages/plugin/plugin`）已删除，改为 **package.json 的 `dshClient` 声明**（`platform: 'web'`，可选 `inject`/`immediately`）+ `exports["./client"]` 指向构建产物；宿主扫描 loader 条目组成 boot 图，Web 端从 `/plugins/<id>/client.js` 拉取。本插件 package.json 已满足该声明，无需改动。
- 本插件使用的槽位 `conversation.session.header.actions`（list/session）在 0809 上仍由官方 `ui-conversation` 声明，owner 契约未变；`useSession` 会话快照契约未变。
- **构建要求**：0809 宿主在激活时校验 `dshClient` 包的构建产物，缺失会抛 `ClientPackageCompositionError` 并**拒绝启动 `dsh web`**——升级快照或改源码后必须重新 `pnpm run build` 再启动，否则浏览器拉到的是旧 `lib/client.js`。

## 0810 兼容要点（snapshot0810，实机验证）

- **元数据发现变化**：0810 的 ClientModuleHostService 在启动时扫描已加载插件的 package.json，但只读**嵌套 `dsh.client`**（`packages/client/modules/src/index.ts` 的 `resolveMeta`，`pkg.dsh.client`）；顶层 `dshClient` 字段读不到会静默丢出 boot 图——无日志、无报错，"启动顺利但插件全没"。本插件已从顶层 `dshClient` 迁移为嵌套 `dsh.client`（inject/platform 原样保留），0810 实机验证 `window.__DSH_BOOT__` 清单包含本插件、鲸鱼各动画与爱心互动正常。
- **无需重构建**：`lib/client.js` 构建产物不变，package.json 不参与编译；symlink 安装改源仓库即生效，无需重装。

## 演示 Demo

![dsh-ui-whale 完整演示](docs/dsh-ui-whale-demo.gif)

各动作 GIF：

<img src="docs/眨眼.gif" alt="眨眼" width="200"> <img src="docs/摆尾巴.gif" alt="摆尾巴" width="200"> <img src="docs/摆腹鳍.gif" alt="摆腹鳍" width="200">

<img src="docs/喷水花.gif" alt="喷水花" width="200"> <img src="docs/冒爱心.gif" alt="冒爱心" width="200"> <img src="docs/睡觉.gif" alt="睡觉" width="200">

> 完整视频：[docs/dsh-ui-whale-demo.mp4](docs/dsh-ui-whale-demo.mp4)

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

完整步骤见 [INSTALL.md](INSTALL.md)。两条通道任选其一（互斥，勿同时用）：

**官方 profile 通道**（0806 默认，配置行热重载，无需重启）：

```sh
git clone https://github.com/dsh-external/dsh-ui-whale.git
cd dsh-ui-whale && pnpm install
dsh plugin --profile web add link:/path/to/dsh-ui-whale
```

`$DSH_HOME/profiles/web/cordis.patch.yml` 配置行：

```yaml
- insert:
    - id: dsh-ui-whale
      name: '@dsh-external/dsh-ui-whale'
```

**registry 通道**（需 DSH 已集成 plugin-registry，`dsh registry` 可用；清单已满足 registry id 校验）：

```sh
dsh registry install /path/to/dsh-ui-whale   # 或打包后的 dsh-ui-whale.tgz
dsh registry enable @dsh-external/dsh-ui-whale
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

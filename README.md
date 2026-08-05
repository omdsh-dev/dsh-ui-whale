# @dsh-external/dsh-ui-whale

DSH Web UI 的常驻像素鲸鱼伙伴插件：会话标题栏（标题行右侧）常驻一只小鲸鱼，随会话快照实时反应——**零核心改动**。

## 它做什么

- **平时（空闲）**：隔一会儿眨一次眼（约 5 秒）；偶尔摆一下尾巴（约 11 秒一次，0-1-2-3-2-1-0 来回）；偶尔动动胸鳍（约 7 秒一次，0-1-2-1-0 来回）。
- **思考 / 运行 / 工作中**：尾巴持续摆动 + 胸鳍持续扑动 + 眨眼更频繁。
- **回合完成时**：头顶喷水庆祝——水花按**单向 0-1-2-3-4-5-6** 喷起散开（不反向），喷完结束。

## 美术与实现

- 素材：13 帧手绘像素画（25×40 网格，5 色调色板：深蓝 `#203864`、身体蓝 `#0066FF`、浅蓝 `#B4C7E7`、白 `#F2F2F2`），`sprites/` 里保存帧数据。
- 渲染：分层 CSS box-shadow 像素画（身体 / 眼睛 / 尾巴 / 胸鳍 / 喷水花各一层），动画 = 固定 DOM 树上的样式切换，无逐帧布局。
- 分层由帧数据自动推导：每个动画区域 = 该动作任一帧相对静止姿势变化的单元格集合，组合姿势逐像素还原原图（有测试钉住）。
- 动画引擎是纯 tick 状态机（`src/client/animation.ts`），情绪由会话快照的 running / 推理 partial / 运行中工具推导。

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

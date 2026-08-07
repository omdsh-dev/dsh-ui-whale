# 安装（组织内成员）

> **版本选择**：`v0.3.2`（默认，含睡觉动画）面向 DSH 快照 snapshot0806（`snapshots/20260806T160212Z-279244acb0`）；`v0.2.0` 同为 0806 构建（无睡觉动画）；`v0.1.0` 面向 snapshot0805（`snapshots/20260805T134133Z-ce1fc03f95`），按旧方式安装。版本对应详见 [README.md](README.md#版本对应--version-compatibility)。

前置：**DSH 已构建快照**（`~/.dsh/source/current` 指向含 `lib/` 产物的快照——`cordis` 与各 `@deepseek-ai/dsh-client-*` 的 `link:` 开发依赖从该快照解析）+ `dsh web` 运行中 + **dsh-external 组织读权限**。本插件是**纯客户端插件包**（`dshClient` 行，Node half 为空），安装 = ① 包可被配置树解析 + ② 配置里加一行。

## snapshot0806（v0.3.2 / v0.3.1 / v0.3.0 / v0.2.0）——profile 安装方式

```sh
# 1. 克隆私有仓库（需要组织读权限），构建产物已入库，无需构建
git clone https://github.com/dsh-external/dsh-ui-whale.git
cd dsh-ui-whale && pnpm install

# 2. 装进 web profile（等价于在 $DSH_HOME/profiles/web 下执行 pnpm add）
dsh plugin --profile web add link:/path/to/dsh-ui-whale
#   或固定 tag 的 git 依赖：
#   dsh plugin --profile web add '@dsh-external/dsh-ui-whale@github:dsh-external/dsh-ui-whale#v0.3.2'
```

配置行（`$DSH_HOME/profiles/web/cordis.patch.yml`，热重载，无需重启）：

```yaml
- insert:
    - id: dsh-ui-whale
      name: '@dsh-external/dsh-ui-whale'
```

## snapshot0806 —— registry 安装方式（可选通道）

前提：DSH 已集成 plugin-registry（`dsh registry` 命令可用；集成步骤见 [plugin-registry 仓库](https://github.com/dsh-external/plugin-registry/blob/main/docs/cookbook/integrating-into-dsh.md)）。本插件的 `dsh.plugin.json` 清单已通过 registry id 校验（id = npm 包名 `@dsh-external/dsh-ui-whale`，含 `client` 声明）。registry 通道与官方 profile 通道**互斥**（碰撞守卫拒绝双挂载），二选一。

```sh
# 目录安装（需要代码，克隆 + pnpm install 后）
dsh registry install /path/to/dsh-ui-whale
# 或 tarball 分发（接收方无需克隆）：
#   tar -czf dsh-ui-whale.tgz -C ./dsh-ui-whale .
#   dsh registry install dsh-ui-whale.tgz
dsh registry enable @dsh-external/dsh-ui-whale
```

## snapshot0805（v0.1.0）——旧安装方式

### 路径一：克隆 + link 装进 harness（推荐）

```sh
# 1. 克隆私有仓库（需要组织读权限），构建产物已入库，无需构建
git clone https://github.com/dsh-external/dsh-ui-whale.git
cd dsh-ui-whale && pnpm install

# 2. 让包装进 harness 依赖链（在 DSH 快照根目录，~/.dsh/source/current 指向的那个）
pnpm add -w link:/path/to/dsh-ui-whale
```

> 若你的 pnpm 因 store 版本不匹配拒绝 `pnpm add -w`，可手动 symlink 代替：
> `mkdir -p node_modules/@dsh-external && ln -s /path/to/dsh-ui-whale node_modules/@dsh-external/dsh-ui-whale`

### 路径二：git 依赖（固定 commit/tag，无隐式 latest）

```sh
# 在 harness 根目录执行；<commit> 为发布 commit（0805 用 tag v0.1.0）
pnpm add '@dsh-external/dsh-ui-whale@github:dsh-external/dsh-ui-whale#v0.1.0'
```

### 配置行（0805 旧机制）

`~/.dsh/config.yaml`（不存在则创建）：

```yaml
- insert:
    - id: dsh-ui-whale
      name: '@dsh-external/dsh-ui-whale'
```

## 重启 `dsh web`

插件集合变更按「重启生效」纪律（0805 旧机制下适用；0806 profile 方式配置行热重载，无需重启）。停掉当前 web（Ctrl+C）后重新启动。

## 验证

会话标题栏（标题行右侧）出现像素鲸鱼：空闲时眨眼/偶尔摆尾/动胸鳍；模型思考或工具运行时尾巴持续摆动、胸鳍持续扑动；一个回合完成时头顶喷出水花（单向 0-1-2-3-4-5-6）；点击鲸鱼时左上角冒出一颗从小变大的粉色爱心再消失（单向 0-1-2-3-0）。

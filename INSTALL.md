# 安装（组织内成员）

前置：**DSH 已构建快照**（`~/.dsh/source/current` 指向含 `lib/` 产物的快照——`cordis` 与各 `@deepseek-ai/dsh-client-*` 的 `link:` 开发依赖从该快照解析）+ `dsh web` 运行中 + **dsh-external 组织读权限**。本插件是**纯客户端插件包**（`dshClient` 行，Node half 为空），安装 = ① 包可被配置树解析 + ② 配置里加一行。

## 路径一：克隆 + link 装进 harness（推荐）

```sh
# 1. 克隆私有仓库（需要组织读权限），构建产物已入库，无需构建
git clone https://github.com/dsh-external/dsh-ui-whale.git
cd dsh-ui-whale && pnpm install

# 2. 让包装进 harness 依赖链（在 DSH 快照根目录，~/.dsh/source/current 指向的那个）
pnpm add -w link:/path/to/dsh-ui-whale
```

> 若你的 pnpm 因 store 版本不匹配拒绝 `pnpm add -w`，可手动 symlink 代替：
> `mkdir -p node_modules/@dsh-external && ln -s /path/to/dsh-ui-whale node_modules/@dsh-external/dsh-ui-whale`

## 路径二：git 依赖（固定 commit，无隐式 latest）

```sh
# 在 harness 根目录执行；<commit> 为发布 commit
pnpm add '@dsh-external/dsh-ui-whale@github:dsh-external/dsh-ui-whale#<commit>'
```

## 配置行

`~/.dsh/config.yaml`（不存在则创建）：

```yaml
- insert:
    - id: dsh-ui-whale
      name: '@dsh-external/dsh-ui-whale'
```

## 重启 `dsh web`

插件集合变更按「重启生效」纪律。停掉当前 web（Ctrl+C）后重新启动。

## 验证

会话标题栏（标题行右侧）出现像素鲸鱼：空闲时眨眼/偶尔摆尾/动胸鳍；模型思考或工具运行时尾巴持续摆动、胸鳍持续扑动；一个回合完成时头顶喷出水花（单向 0-1-2-3-4-5-6）。

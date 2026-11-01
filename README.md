# dsh-qt-skills

把 **Qt 官方 agent-skills** 打包成 [DeepSeek Harness](https://github.com/deepseek-ai) 插件：装一次，13 个 Qt/QML 技能进入 DSH 技能目录，并顺带挂上 Qt 官方文档 MCP。

- 上游技能：<https://github.com/TheQtCompanyRnD/agent-skills>（The Qt Company RnD 官方，13 skills + 2 MCP）
- 上游许可：`LicenseRef-Qt-Commercial OR BSD-3-Clause` —— 本项目走 **BSD-3-Clause** 分支再分发
- 本包只做搬运与注册，**不改写任何技能正文**

## 装什么

| 内容 | 说明 |
|---|---|
| 13 个 `qt-*` 技能 | 以 `source: bundled` 注册到 `ctx.skills`，正文与 `references/`、lint 脚本整份随包携带 |
| `qt-docs` MCP | 官方托管，Streamable HTTP：`https://qt-docs-mcp.qt.io/mcp`，默认启用 |
| `qml-preview` MCP | 本地 stdio `QmlPreviewMcpServer.exe`，路径因机器而异，**默认注释掉**（见下文启用） |
| `agents/` | 上游两个评审子代理定义，供技能正文参考 |

技能清单：`qt-cpp-review`、`qt-qml-review`、`qt-qml`、`qt-canvas2d`、`qt-ui-design`、`qt-qml-docs`、`qt-cpp-docs`、`qt-qml-profiler`、`qt-qml-test`、`qt-qml-test-run`、`qt-figma-token-extraction`、`qt-figma-component-generation`、`qt-cmake-project`。

## 安装

```bash
# npm（发布后）
dsh plugin --profile desktop add dsh-qt-skills

# 或直接从 GitHub
dsh plugin --profile desktop add github:hawk2048/dsh-qt-skills
```

装完**重启 DSH**：插件里注册的技能与 patch 里的 MCP 行都在启动时生效。

手动安装（没有 bundle 机制时）把 [`cordis.patch.yml`](./cordis.patch.yml) 里的 `insert` 行追加到 `~/.dsh/profiles/<profile>/cordis.patch.yml` 再重启。

## 怎么用

技能是**由模型按 description 命中后自行加载**的，不会因为装了就对每个任务自动触发。想让它稳定生效，在 Qt 项目根放一个 `AGENTS.md`：

```markdown
# Qt 项目约定
- 任何 Qt/QML 任务开始前先调 skill：新建/改 CMake → qt-cmake-project；写改 QML → qt-qml
- 代码评审 → qt-qml-review / qt-cpp-review；卡顿掉帧 → qt-qml-profiler
- 测试 → qt-qml-test / qt-qml-test-run
- 需要 Qt API 事实时用 qt-docs MCP 查，不要凭记忆猜 API
- 改完 QML 要立刻看效果 → qml-preview MCP（应用需 -DQT_QML_DEBUG 构建）
```

### 启用 QML 实时预览（可选）

Qt 6.12+ 的安装目录自带 `bin/QmlPreviewMcpServer.exe`（Qt Online Installer 里勾选 *Agentic Development Tools → QML Live Preview for AI Agents*）。把 `cordis.patch.yml` 里被注释的那几行打开、`command` 改成你的真实路径，重启即可。被预览的应用必须用 `-DQT_QML_DEBUG` 构建，**别把该宏带进发布版**（它会暴露调试端口）。

> 手写这两类 MCP 行时注意：`name` 必须写 **`@deepseek-ai/dsh-mcp-client`**（短名 `dsh-mcp-client` 会 `ERR_MODULE_NOT_FOUND`），stdio 服务器必须显式写 `transport: stdio`，否则会按 streamable-http 处理并抛 `TypeError`。

## 已知限制

- `qt-figma-*` 两个技能需要 **Figma MCP**，没装时会停在「先要有 Figma 源」这一步。
- `qt-qml-profiler` / `qt-qml-test-run` 需要 `qmlprofiler`、`qmltestrunner` 在 `PATH` 里（它们随 Qt 安装在 `bin/` 下）。
- `qt-cpp-review` / `qt-qml-review` 的「分片评审子代理」在 Claude Code 下有专用 agent 定义；DSH 里按技能正文自带的 fallback，走通用子代理 + 只读约束，属降级可用。

## 卸载

```bash
dsh plugin --profile desktop remove dsh-qt-skills
```

## 许可与归属

- 随包携带的技能正文、`references/`、脚本与 `agents/` 来自 The Qt Company，版权与许可原文见 [`LICENSE.upstream`](./LICENSE.upstream)（`LicenseRef-Qt-Commercial OR BSD-3-Clause`）。本包按 BSD-3-Clause 分支再分发，保留原始版权声明。
- 本包的打包代码（`lib/`、`cordis.patch.yml`）以 BSD-3-Clause 发布，见 [`LICENSE`](./LICENSE)。
- 本项目非 Qt Company 官方发行物，只是对其公开技能包的再打包；包名与描述不构成任何背书声明。

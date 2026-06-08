# Memos Companion

[![CI](https://github.com/Liebesfreud/obsidian-memos-companion/actions/workflows/ci.yml/badge.svg)](https://github.com/Liebesfreud/obsidian-memos-companion/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Memos Companion 是一个 Obsidian 桌面端插件，可以在侧边栏中连接并管理自托管的 [Memos](https://www.usememos.com/) 实例。

> English: Memos Companion is an Obsidian desktop plugin for writing and managing a self-hosted Memos instance from a sidebar.

## 功能特性

- 通过功能区图标或命令面板打开 Memos 侧边栏。
- 配置 Memos 地址、访问令牌、默认可见性、分页数量和界面语言。
- 创建、浏览、搜索、编辑、删除、置顶、归档和恢复 memo。
- 支持通过文件选择器、粘贴、拖拽或 Obsidian 仓库路径上传附件。
- 使用 Obsidian `requestUrl` 发起请求，桌面端不会受浏览器 CORS 限制影响。
- 面向自托管 Memos 工作流，当前为桌面端专用插件。

## 使用要求

- Obsidian `1.5.0` 或更高版本。
- 一个可访问 API 的自托管 Memos 服务。
- 一个 Memos 访问令牌。

## 安装方式

### 从 GitHub Releases 安装

1. 打开最新 Release，下载 `manifest.json`、`main.js` 和 `styles.css`。
2. 在你的 Obsidian 仓库中创建插件目录：

   ```text
   <你的仓库>/.obsidian/plugins/memos-companion
   ```

3. 将下载的三个文件放入该目录。
4. 重启 Obsidian，或重新加载社区插件。
5. 在 Obsidian 设置中启用 **Memos Companion**。

### 从源码构建

```bash
npm install
npm run build
```

然后将本仓库复制或软链接到：

```text
<你的仓库>/.obsidian/plugins/memos-companion
```

## 配置说明

打开 **设置 → 第三方插件 → Memos Companion**，填写以下配置：

- **Memos URL**：Memos 实例的基础地址，例如 `https://memos.example.com`。
- **Access token**：Memos API 访问令牌。
- **Default visibility**：创建新 memo 时使用的默认可见性。
- **Page size**：每页拉取的 memo 数量。
- **Language**：插件界面语言。

请不要提交 Obsidian 插件数据文件，例如 `data.json`，其中可能包含你的访问令牌。

## 开发

```bash
npm install
npm run check
npm run build
```

主要文件：

- `src/main.ts`：插件入口。
- `src/memos-client.ts`：Memos API 客户端。
- `src/ui/MemosPanel.svelte`：侧边栏界面。
- `manifest.json`：Obsidian 插件清单。
- `versions.json`：Obsidian 社区插件兼容版本映射。

## 发布清单

1. 更新 `package.json`、`manifest.json` 和 `versions.json` 中的版本号。
2. 更新 `CHANGELOG.md`。
3. 运行 `npm run check` 和 `npm run build`。
4. 提交改动。
5. 创建并推送 tag，例如：

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

Release workflow 会自动构建插件，并上传 `manifest.json`、`main.js`、`styles.css` 和 zip 压缩包到 GitHub Releases。

## 兼容性说明

本插件面向较新的 Memos v1 API。附件上传实现包含对常见 Memos API 形态的 fallback，但不同自托管版本的附件行为仍建议自行验证。

## 贡献

欢迎提交 Issue 和 Pull Request。开发规范请查看 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 安全

请私下报告安全问题，不要在公开 Issue 中粘贴访问令牌等敏感信息。详情请查看 [SECURITY.md](SECURITY.md)。

## 许可证

本项目基于 MIT License 开源，详情请查看 [LICENSE](LICENSE)。

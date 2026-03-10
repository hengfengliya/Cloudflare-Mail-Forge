<div align="center">

# Cloudflare Mail Forge

批量管理 Cloudflare 邮件路由规则的本地操作台

**一次配置，跨域名批量创建 · 查询 · 启停 · 删除**

[![License: MIT](https://img.shields.io/badge/License-MIT-gold.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)]()

[English](docs/README_EN.md) · [使用帮助](docs/usage.md) · [更新记录](CHANGE.md)

</div>

---

## 这是什么

Cloudflare 控制台只能逐条管理邮件路由规则。当你有多个域名、需要批量创建几十个转发地址时，手动操作极其低效。

**Mail Forge** 把这些工作收进一张本地页面：

- **批量创建** — 前缀 + 序号自动生成，或手动输入清单，一次操作写入所有选中域名
- **跨域名** — 勾选任意组合的 Zone，批量操作同时作用于每个域名
- **查询管理** — 搜索过滤、单条启停、批量删除，规则状态一览无余
- **本地安全** — 服务仅绑定 `127.0.0.1`，Token 不离开本机

---

## 快速开始

### 方式一：Node.js 直接运行

```bash
git clone https://github.com/hengfengliya/Cloudflare-Mail-Forge.git
cd Cloudflare-Mail-Forge
node server.js
```

> **零依赖** — 不需要 `npm install`，Node.js 18+ 直接运行。

### 方式二：Docker

```bash
docker run -p 3042:3042 ghcr.io/hengfengliya/cloudflare-mail-forge
```

或用 Docker Compose：

```bash
git clone https://github.com/hengfengliya/Cloudflare-Mail-Forge.git
cd Cloudflare-Mail-Forge
docker compose up -d
```

### 方式三：Vercel 在线版

直接访问 **https://cloudflare-mail-forge.vercel.app**，无需任何安装。

---

打开浏览器访问 **http://127.0.0.1:3042**（本地部署）

---

## 获取 Cloudflare API Token

1. 进入 [Cloudflare 控制台](https://dash.cloudflare.com) → 右上角头像 → **My Profile**
2. 左侧 **API Tokens** → **Create Token** → **Custom token**
3. 添加以下权限：
   - `Zone` → `Zone` → **Read**
   - `Zone` → `Email Routing Rules` → **Edit**
4. Zone Resources 选择对应域名（或 All zones）
5. 创建并复制 Token（只显示一次）

---

## 使用流程

### Step 1 — 控制台配置

填写 API Token、默认转发邮箱、默认前缀 / 数量 / 起始序号，点击「保存配置」后自动拉取域名列表。

### Step 2 — 域名选择

勾选一个或多个域名。后续批量操作将同时写入所有已选中域名。

### Step 3 — 批量新增 Mail

**前缀模式**

```
前缀: shop   数量: 3   起始: 1
→ shop001@domain.com
→ shop002@domain.com
→ shop003@domain.com
```

**手动模式**：每行一个 local-part，支持直接粘贴完整邮箱地址（自动提取 `@` 前部分）

### Step 4 — 规则查询与管理

选择域名 → 加载规则列表 → 搜索 / 筛选 → 单条操作或勾选批量删除。

---

## 环境变量（可选）

复制 `.env.example` 为 `.env` 预填默认值：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3042` | 本地服务端口 |
| `HOST` | `127.0.0.1` | 绑定地址 |
| `CF_TOKEN` | — | 预填 API Token |
| `CF_DESTINATION` | — | 预填转发目标邮箱 |
| `CF_DEFAULT_PREFIX` | — | 预填默认前缀 |
| `CF_DEFAULT_COUNT` | `5` | 预填默认创建数量 |
| `CF_DEFAULT_START` | `1` | 预填默认起始序号 |
| `CF_DELAY_MS` | `0` | 批量请求间隔毫秒数 |

---

## 项目结构

```
├── public/
│   ├── index.html      # 单页控制台（含使用帮助页）
│   ├── styles.css      # 暗色精密风格系统
│   └── app.js          # 前端逻辑
├── src/
│   ├── cloudflare.js   # Cloudflare API 封装
│   └── config-store.js # 本地配置持久化
├── docs/               # 文档
├── data/               # 运行时配置（已 gitignore）
├── legacy/             # 归档脚本（Python / PowerShell）
├── server.js           # 本地 HTTP 服务入口
├── Dockerfile          # Docker 镜像构建
├── docker-compose.yml  # Docker Compose 一键启动
└── .env.example        # 环境变量模板
```

---

## 技术栈

| 层 | 选型 |
|----|------|
| 服务端 | Node.js 内置 `http` 模块，无框架 |
| 前端 | 原生 HTML / CSS / JS，无构建步骤 |
| API | Cloudflare Email Routing REST API |
| 字体 | Fraunces · IBM Plex Sans · IBM Plex Mono |

---

## 安全说明

- 配置（含 Token）只保存在**浏览器 localStorage**，不写入任何文件或数据库
- 本地部署版服务默认只绑定 `127.0.0.1`，局域网无法访问
- 不向任何第三方服务发送数据
- 如需将 Docker 版暴露到公网，请自行在反向代理层添加访问鉴权

---

## License

[MIT](LICENSE) © 2026 hengfengliya

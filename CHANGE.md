# CHANGE

| 日期 | 文件 | 变更类型 | 修改的函数或方法名称 | 变更内容摘要 | 对产品的影响 | 参考的 PR 或记录 |
| --- | --- | --- | --- | --- | --- | --- |
| 2025-12-29 15:23 | bulk_email_routing.ps1 | Add | 无（脚本直写） | 新增批量创建 Email Routing 规则的脚本，支持文件/前缀生成地址与可选延迟 | 形成可执行的批量创建能力 | 无 |
| 2025-12-29 15:23 | PRODUCT.md | Add | 无 | 新增产品目标、场景与 MVP 范围说明 | 明确产品范围与目标 | 无 |
| 2025-12-29 15:23 | PLAN.md | Add | 无 | 新增分阶段计划与验收标准 | 提供实施路径 | 无 |
| 2025-12-29 15:23 | TECH-REFER.md | Add | 无 | 新增技术架构、数据结构与调用链路说明 | 明确实现方案 | 无 |
| 2025-12-29 15:23 | TASK.md | Add | 无 | 新增原子任务拆解与风险点 | 支持任务追踪 | 无 |
| 2025-12-29 15:23 | CHANGE.md | Add | 无 | 初始化变更记录表 | 建立变更追踪基线 | 无 |
| 2025-12-29 15:35 | scripts/bulk_email_routing.py | Add | main / load_env_file / load_addresses | 新增Python脚本，读取.env/环境变量并批量创建Email Routing规则 | 提供可直接运行的Python实现 | 无 |
| 2025-12-29 15:38 | scripts/bulk_email_routing.py | Modify | get_config / load_md_defaults | 增加从 `Cloudflare批量邮箱地址.md` 读取默认配置的兜底逻辑 | 无需额外文件即可运行 | 无 |
| 2025-12-29 15:40 | .env | Add | 无 | 写入 Cloudflare 运行所需的本地环境变量 | 运行脚本无需手动配置环境变量 | 用户确认风险 |
| 2025-12-29 15:45 | scripts/bulk_email_routing.py | Modify | get_config / load_addresses / random_local_part | 默认数量改为5，未提供前缀时使用随机本地部分生成地址 | 符合“默认不固定前缀、数量为5” | 无 |
| 2025-12-29 15:48 | scripts/bulk_email_routing.py | Modify | main | 结果写入CSV文件并输出生成路径 | 便于导出与查看结果 | 无 |
| 2025-12-29 15:50 | .env | Modify | 无 | 增加 CF_COUNT 与 CF_OUTPUT_CSV 默认配置 | 运行脚本直接产出CSV结果 | 用户确认风险 |
| 2025-12-29 16:03 | scripts/bulk_email_routing.py | Modify | get_config | 增加可选 CF_ACCOUNT_ID 配置项 | 方便后续切换不同账号 | 无 |
| 2025-12-29 16:03 | .env | Modify | 无 | 增加 CF_ACCOUNT_ID 字段 | 便于切换不同账号 | 用户确认风险 |
| 2025-12-29 16:12 | scripts/delete_email_routing.py | Add | main / list_rules / delete_rule | 新增删除规则脚本，支持删除全部、CSV或指定地址 | 便于批量清理 Email Routing 规则 | 无 |
| 2025-12-29 16:12 | .env | Modify | 无 | 增加删除脚本所需的配置项 | 支持多种删除模式 | 用户确认风险 |
| 2026-03-09 13:50 | server.js / src/cloudflare.js / src/config-store.js | Add | handleApi / createRoutingRule / listZones / saveConfig | 新增 Node 本地服务，封装配置、域名查询、规则查询、批量创建、删除与启停接口 | 项目从脚本升级为可访问的本地 Web 应用 | 本次会话 |
| 2026-03-09 13:50 | public/index.html / public/styles.css / public/app.js | Add | boot / loadZones / loadRules / createBatch | 新增单页控制台，支持配置 Token、选择域名、批量创建 mail 和规则管理 | 提供浏览器端操作入口，降低使用门槛 | 本次会话 |
| 2026-03-09 13:50 | package.json / README.md / .env.example / .gitignore | Add | 无 | 新增启动脚本、运行说明、示例环境变量与忽略规则 | 补齐本地运行闭环与 GitHub 基础交付面 | 本次会话 |
| 2026-03-09 17:20 | README.md / .gitignore | Modify | 无 | 增加当前目录结构说明，明确 Web 项目单入口与 `legacy/` 归档区 | 项目主入口更清晰，减少误读 | 本次会话 |
| 2026-03-09 17:20 | bulk_email_routing.ps1 / scripts/* / Cloudflare批量邮箱地址.md / result.csv / email_list.csv / .history/* | Move | 无 | 将旧 PowerShell/Python 脚本、旧说明文件与历史导出物统一迁入 `legacy/` | 主目录只保留当前 Web 应用所需文件，历史材料可追溯但不再干扰日常使用 | 本次会话 |
| 2026-03-09 | public/styles.css / public/index.html | Redesign | 无 | 全面重设计 UI 为暗黑精密仪器美学：void 深黑底色、单一陈年铜金强调色、Fraunces 巨型数字、IBM Plex Mono 日志字体、发丝级玻璃面板、顶边光泽高光、交错渐入动画 | 从暖纸色系升级为极简奢华 dark luxury 风格 | 本次会话 |
| 2026-03-09 | public/styles.css / public/index.html | Fix+Feat | 无 | 修复深色背景下文字对比度（text-2/3/4 透明度上调）、select 下拉深色适配（color-scheme: dark + 固定背景色）、新增顶部导航栏（首页/使用帮助 Tab）、新增完整使用帮助页（6节教程+FAQ折叠） | 可用性大幅提升，完成使用文档闭环 | 本次会话 |
| 2026-03-09 | README.md / LICENSE | Add | 无 | 撰写完整开源 README（快速开始、Token 获取、用法、环境变量、项目结构、技术栈）；新增 MIT License；独立初始化 git repo 并推送至 github.com/hengfengliya/Cloudflare-Mail-Forge | 项目正式开源 | 本次会话 |
| 2026-03-09 | README.md / docs/README_EN.md / docs/linuxdo-post.md | Add | 无 | README 改写为中文默认 + EN badge 链接；新建 docs/ 目录；添加完整英文文档；添加 LinuxDo 社区发帖草稿 | 完成双语文档体系，准备社区推广 | 本次会话 |

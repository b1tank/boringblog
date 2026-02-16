# Sprint Plan — Editor UX + Embed + E2E

## Sprint Scope

修复编辑器核心交互问题（链接输入框换行、媒体按钮样式、保存时间对齐、表格尺寸可调、YouTube 嵌入可用性），并补充关键路径 Playwright 自动化测试（非琐碎用例）。

## Prioritized Task List

- [x] **T1** 修复链接浮层“确定/取消”按钮换行（保持单行、紧凑布局）
- [x] **T2** 优化图片/视频插入按钮视觉（保持现有主题 token，不引入新设计系统）
- [x] **T3** 修复编辑页顶部“上次保存 xx:xx:xx”垂直未居中
- [x] **T4** 支持可调表格行列（不再固定 3x3）
- [x] **T5** 修复 YouTube “refused to connect” 根因（标准化 watch/share 链接为 embed 链接）
- [x] **T6** 新增 Playwright 关键路径测试：
  - 新建文章（标题、正文、标签）
  - 保存草稿流
  - 发布流
  - 插入表格（非默认尺寸）
  - 插入图片（上传行为由 Playwright route mock 覆盖）
  - 插入视频（YouTube 链接规范化）
- [x] **T7** 执行构建与测试校验（build + playwright）
- [x] **T8** 原子提交并推送当前分支

## Hiccups & Notes

- Playwright 初次执行误连到本机已有 `:3000` 服务（非本项目），已将默认 `PLAYWRIGHT_BASE_URL` 调整为 `http://127.0.0.1:3300`，并允许通过 env 覆盖。
- 本机已有 `next dev` 占用 `.next/dev/lock`，验证阶段改为复用现有 `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3210` 运行测试。
- 本地种子管理员账号与默认值不同，执行时通过 `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` 覆盖。
- 图片上传在本地环境易受存储/处理链路影响，关键路径测试对 `/api/upload` 采用 route mock，聚焦验证编辑器插图行为与后续发布流程。

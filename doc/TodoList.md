# next-terminal 总体任务清单

## Phase 1：基础搭建

- [x] 使用 Wails CLI 初始化项目（`wails init -n next-terminal -t react-ts`）
- [x] 配置 Tailwind CSS 4 到前端项目
- [x] 配置 Zustand 状态管理
- [x] 建立 `internal/` 包结构（domain、service、model、infrastructure、app）
- [x] 实现 `internal/domain/` 领域模型（Connection、Credential、Session、Settings）
- [x] 实现 `internal/model/repository.go` 仓储接口
- [x] 集成 `modernc.org/sqlite`，实现 `internal/infrastructure/database/sqlite.go`（打开/迁移/关闭）
- [x] 编写 `migrations/001_init_schema.up.sql` 和 `001_init_schema.down.sql`
- [x] 实现 `internal/infrastructure/database/` 各仓储（connections、credentials、sessions、settings）
- [x] 实现 `internal/infrastructure/crypto/encryptor.go`（AES-256-GCM 加密/解密）
- [x] 实现平台数据目录解析（`internal/infrastructure/database/paths.go`）
- [x] 搭建前端基础 UI 骨架：侧边栏 + 空主区域 + 标题栏
- [x] 实现前端 connectionStore 和 settingsStore（Zustand）
- [x] 验证：应用可启动，SQLite 数据库自动创建，基础 UI 可交互

## Phase 2：SSH 核心

- [x] 实现 `internal/infrastructure/ssh/auth.go`（密码认证、私钥认证）
- [x] 实现 `internal/infrastructure/ssh/client.go`（SSH 客户端工厂、直连拨号）
- [x] 实现 `internal/infrastructure/ssh/config.go`（ssh.ClientConfig 构建）
- [x] 实现 `internal/infrastructure/terminal/session.go`（SSH channel ↔ Wails Events 桥接、I/O 泵）
- [x] 实现 `internal/service/session_service.go`（会话生命周期管理）
- [x] 实现 `internal/service/connection_service.go`（连接 CRUD + 测试连接）
- [x] 实现 `internal/app/app.go`（Wails 绑定方法：StartSession、CloseSession、WriteToSession、ResizeSession）
- [x] 前端：集成 xterm.js + @xterm/addon-fit + @xterm/addon-web-links
- [x] 前端：实现 `XtermTerminal.tsx` 组件（终端实例创建、I/O 事件绑定、resize 处理）
- [x] 前端：实现 `TerminalTab.tsx` 和 `TerminalManager.tsx`（多 Tab 终端管理）
- [x] 前端：实现 `ConnectionForm.tsx`（创建/编辑 SSH 连接）
- [x] 前端：实现 `ConnectionList.tsx`（连接列表展示与搜索）
- [x] 验证：可创建 SSH 连接、打开终端 Tab、输入命令并看到输出、resize 终端

## Phase 3：跳板机与 MFA

- [x] 实现 `internal/infrastructure/ssh/jump.go`（跳板机链式连接：逐跳 ProxyJump）
- [x] 实现 `internal/infrastructure/ssh/auth.go` MFA 部分（keyboard-interactive 回调）
- [x] 实现 MFA 挑战注册表（按 session ID 索引，带缓冲 channel + 超时）
- [x] 前端：实现 `MfaPrompt.tsx` 组件（接收挑战提示、用户输入、返回响应）
- [x] 前端：监听 `auth:mfa-required` 事件，弹窗 MFA 输入，发送 `auth:mfa-response`
- [x] 连接配置增加跳板机链选择（UI：多级跳板机下拉/拖拽排序）
- [x] 端到端测试：通过跳板机连接目标主机
- [x] 端到端测试：MFA 认证流程（密码 + TOTP）
- [x] 验证：可通过堡垒机连接目标、MFA 弹窗正常工作

## Phase 4：SFTP 与凭据管理

- [x] 实现 `internal/infrastructure/sftp/client.go`（基于已有 SSH 连接打开 SFTP 子系统）
- [x] 实现 `internal/infrastructure/sftp/operations.go`（ReadDir、Stat、Upload、Download、Remove、Mkdir、Rename）
- [x] 实现 `internal/service/sftp_service.go`（SFTP 操作协调 + 进度回调）
- [x] 实现 `internal/app/app.go` SFTP 绑定方法（OpenSftpExplorer、SftpListDir、SftpUpload、SftpDownload）
- [x] 前端：实现 `FileExplorer.tsx`（远程文件浏览器：目录列表、导航、排序）
- [x] 前端：实现 `FileTransferPanel.tsx`（上传/下载进度条、队列管理）
- [x] 前端：实现 `FileTree.tsx`（目录树展示）
- [x] 实现 `internal/service/credential_service.go`（凭据加密存储/解密读取）
- [x] 实现 `internal/infrastructure/crypto/keychain.go`（macOS Keychain + Windows DPAPI 集成）
- [x] 前端：实现 `KeyManager.tsx`（SSH 密钥导入、指纹展示、删除管理）
- [x] 前端：ConnectionForm 增加凭据选择（已有凭据 vs 内联输入）
- [x] 验证：SFTP 文件浏览、上传、下载正常；凭据加密存储与解密可用

## Phase 5：主题与打磨

- [ ] 实现主题定义结构（CSS 变量 + xterm.js ITheme）
- [ ] 实现 6-8 个预设主题（Dracula、Monokai、Solarized Dark/Light、Nord、Catppuccin Mocha、GitHub Dark）
- [ ] 前端：实现 `ThemeSelector.tsx`（主题预览与切换）
- [ ] 实现 `internal/service/theme_service.go`（主题持久化到 settings）
- [ ] 字体渲染调优：macOS Retina 测试、Windows ClearType 测试
- [ ] 前端：连接分组/文件夹功能（Sidebar 层级展示、拖拽排序）
- [ ] 前端：会话历史面板（最近连接、会话时长统计）
- [ ] 前端：Tab 管理打磨（拖拽重排、右键菜单、关闭确认）
- [ ] 窗口状态持久化（大小、位置、最大化状态）
- [ ] 隐藏 Tab 优化：Go 端缓冲输出，Tab 重选时回写
- [ ] 验证：主题切换即时生效、字体渲染清晰、分组和 Tab 交互流畅

## Phase 6：跨平台与发布

- [ ] 实现 `internal/infrastructure/terminal/pty_unix.go`（Unix PTY，为未来本地 shell 预留）
- [ ] 实现 `internal/infrastructure/terminal/pty_windows.go`（Windows ConPTY）
- [ ] Windows 平台全面测试（WebView2 渲染、ConPTY、DPAPI、路径处理）
- [ ] macOS 平台全面测试（WebKit 渲染、Keychain、Retina、路径处理）
- [ ] macOS 代码签名与公证（Developer ID + notarytool）
- [ ] Windows 代码签名（Authenticode 签名）
- [ ] 构建自动化：`wails build -platform darwin/universal` 和 `windows/amd64`
- [ ] 应用图标设计（macOS .icns + Windows .ico）
- [ ] 编写用户文档（快速上手、连接配置、跳板机设置、SFTP 使用）
- [ ] GitHub Release 自动化（CI 构建 + 发布包上传）
- [ ] 验证：双平台安装包可正常安装、启动、连接 SSH

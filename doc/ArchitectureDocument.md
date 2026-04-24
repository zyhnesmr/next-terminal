# next-terminal 项目架构文档

## 1. 技术栈选型

### GUI 框架：Wails v2

| 对比项 | Wails | Fyne | Gio |
|--------|-------|------|-----|
| 终端渲染 | xterm.js（生产级，VS Code 同款） | 需自建终端控件 | 无终端生态 |
| UI 美化上限 | React + CSS，可达 Tabby 水平 | Material Design，主题能力有限 | 即时模式，样式能力弱 |
| macOS Retina | WebKit 原生渲染，自动适配 | 内建 HiDPI 支持 | 需手动处理 |
| Windows 渲染 | WebView2（Chromium 内核，Win10+ 内置） | OpenGL | 平台相关 |
| 包体大小 | ~10-15 MB | ~5-10 MB | ~5-8 MB |
| 启动速度 | ~200-400ms | ~100-200ms | ~50-100ms |
| 内存占用 | ~30-60 MB（webview 进程与 OS 共享） | ~20-40 MB | ~15-25 MB |

**选型理由**：Tabby 级别的终端 UI 是最难的硬性需求，只有基于 Web 前端的方案才能原生运行 xterm.js。自建 Fyne/Gio 终端控件达到 VT100 兼容需数月，更不可能在短期内实现 xterm-256color + Unicode 完整支持。Wails 的 webview 进程与 OS 共享（不像 Electron 捆绑 Chromium），性能开销可接受。

### 完整技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| GUI 框架 | Wails v2 | v2.9+ |
| 前端框架 | React + TypeScript | React 18.x |
| 终端渲染 | xterm.js + 插件 | @xterm/xterm 5.x |
| xterm.js 插件 | @xterm/addon-fit, addon-web-links, addon-search | latest |
| 样式方案 | Tailwind CSS 4 | 4.x |
| 前端状态管理 | Zustand | 4.x |
| 图标 | Lucide React | latest |
| SSH | golang.org/x/crypto/ssh | latest |
| SFTP | github.com/pkg/sftp | latest |
| PTY (Unix) | github.com/creack/pty | latest |
| PTY (Windows) | github.com/microsoft/go-winio | latest |
| 数据库 | modernc.org/sqlite（纯 Go，无 CGO） | latest |
| 数据库迁移 | github.com/golang-migrate/migrate/v4 | latest |
| 凭据加密 | crypto/aes（标准库）+ OS Keychain | stdlib |
| 日志 | log/slog（标准库） | stdlib |
| 构建工具 | Wails CLI | v2.9+ |

**关键决策**：`modernc.org/sqlite` 而非 `mattn/go-sqlite3`。纯 Go 驱动避免 CGO，使交叉编译（macOS arm64/amd64 + Windows amd64）零配置，包体更小更可靠。对本应用的读写频率（少量连接记录），性能差距在 10-20% 以内。

**前端选择 React**：xterm.js 的 React 封装生态最成熟。Zustand 提供极简的状态管理。Tailwind CSS 通过 CSS 变量快速构建主题系统。

---

## 2. 项目目录结构

```
next-terminal/
├── build/                          # Wails 构建资源（图标、plist、清单）
│   ├── appicon.png
│   ├── darwin/
│   │   └── Info.plist
│   └── windows/
│       └── icon.ico
├── cmd/
│   └── next-terminal/
│       └── main.go                 # 应用入口
├── doc/
│   ├── RequirementsDocument.md     # 需求文档
│   ├── ArchitectureDocument.md     # 架构文档（本文件）
│   └── TodoList.md                 # 总体任务清单
├── frontend/                       # Wails 管理的前端项目
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx               # React 入口
│   │   ├── App.tsx                # 根组件
│   │   ├── components/
│   │   │   ├── layout/            # 布局组件（Sidebar, TabBar, TitleBar）
│   │   │   ├── terminal/          # 终端组件（XtermTerminal, TerminalTab, TerminalManager）
│   │   │   ├── connection/        # 连接组件（ConnectionList, ConnectionForm, MfaPrompt）
│   │   │   ├── sftp/              # SFTP 组件（FileExplorer, FileTransferPanel）
│   │   │   └── settings/          # 设置组件（SettingsPanel, ThemeSelector, KeyManager）
│   │   ├── hooks/                 # 自定义 Hooks
│   │   ├── stores/                # Zustand 状态仓库
│   │   ├── themes/                # 预设主题定义
│   │   ├── lib/                   # Wails 运行时绑定
│   │   └── styles/                # 全局样式
│   └── wailsjs/                   # Wails CLI 自动生成（勿手动编辑）
├── internal/                       # 私有 Go 包（不可被外部导入）
│   ├── app/                        # 应用生命周期 & Wails 绑定层
│   │   ├── app.go                 # App 结构体、启动/关闭、Wails Bind 目标
│   │   └── menu.go                # 原生菜单构建
│   ├── domain/                     # 领域模型（纯数据结构，零外部依赖）
│   │   ├── connection.go          # Connection、ConnectionType、AuthMethod 枚举
│   │   ├── credential.go          # Credential、KeyPair、MfaConfig
│   │   ├── session.go             # Session、SessionStatus
│   │   ├── transfer.go            # FileTransfer、TransferStatus
│   │   └── settings.go            # AppSettings、Theme、FontConfig
│   ├── service/                    # 业务逻辑层
│   │   ├── connection_service.go  # 连接 CRUD + 生命周期
│   │   ├── credential_service.go  # 凭据加密/解密、密钥管理
│   │   ├── session_service.go     # SSH 会话编排
│   │   ├── sftp_service.go        # SFTP 操作协调
│   │   ├── settings_service.go    # 应用配置管理
│   │   └── theme_service.go       # 主题解析与应用
│   ├── infrastructure/             # 外部集成实现
│   │   ├── ssh/
│   │   │   ├── client.go          # SSH 客户端工厂、拨号逻辑
│   │   │   ├── jump.go            # 跳板机/堡垒机链式连接
│   │   │   ├── auth.go            # 认证方法构建（密码、密钥、MFA）
│   │   │   └── config.go          # SSH 配置解析
│   │   ├── sftp/
│   │   │   ├── client.go          # 基于 SSH 连接的 SFTP 客户端
│   │   │   └── operations.go      # ReadDir、Stat、Upload、Download
│   │   ├── terminal/
│   │   │   ├── pty.go             # PTY 接口定义
│   │   │   ├── pty_unix.go        # Unix PTY 实现（creack/pty）
│   │   │   ├── pty_windows.go     # Windows ConPTY 实现（go-winio）
│   │   │   └── session.go         # 终端会话：SSH channel ↔ Wails Events 桥接
│   │   ├── database/
│   │   │   ├── sqlite.go          # DB 打开、迁移、关闭
│   │   │   ├── connections.go     # 连接仓储实现
│   │   │   ├── credentials.go     # 凭据仓储实现
│   │   │   ├── sessions.go        # 会话历史仓储实现
│   │   │   └── settings.go        # 设置仓储实现
│   │   └── crypto/
│   │       ├── encryptor.go       # AES-256-GCM 凭据加密
│   │       └── keychain.go        # OS Keychain 集成（macOS Keychain / Windows DPAPI）
│   └── model/                      # 数据访问层（仓储模式）
│       ├── repository.go          # 仓储接口定义
│       ├── connection_repo.go     # 连接 CRUD
│       ├── credential_repo.go     # 凭据 CRUD
│       ├── session_repo.go        # 会话日志 CRUD
│       └── settings_repo.go       # 设置 CRUD
├── migrations/                     # SQL 迁移文件
│   ├── 001_init_schema.up.sql
│   └── 001_init_schema.down.sql
├── .gitignore
├── CLAUDE.md
├── go.mod
├── go.sum
├── README.md
└── wails.json                      # Wails 项目配置
```

**结构原则**：
- `cmd/next-terminal/main.go` — 单一二进制入口，按 Go 惯例。
- `internal/` — 所有业务逻辑不可被外部项目导入，强制封装。
- `internal/domain/` — 纯数据结构，零外部导入，是应用的"通用语言"。
- `internal/model/` — 仓储接口与实现。Service 依赖接口，不依赖具体 SQLite 实现。
- `internal/service/` — 编排领域逻辑，依赖 `model` 接口和 `domain` 类型。
- `internal/infrastructure/` — 外部集成的具体实现（SSH、SFTP、SQLite、OS 加密），实现 `model/` 定义的接口。
- `internal/app/` — Wails 绑定层，薄适配器，将 Service 方法暴露给前端。
- `frontend/` — 由 Vite + Wails 管理，`wailsjs/` 目录自动生成，勿手动编辑。

---

## 3. 分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI 层（Frontend）                         │
│  React + TypeScript + Tailwind CSS + xterm.js + Zustand        │
│  渲染 UI、处理用户输入、显示终端输出                               │
├─────────────────────────────────────────────────────────────────┤
│              应用层（internal/app）                               │
│  Wails Bind 目标、事件路由、生命周期管理                           │
│  将 Go 方法暴露给前端，接收前端调用                                │
├─────────────────────────────────────────────────────────────────┤
│               服务层（internal/service）                          │
│  业务逻辑：连接管理、会话编排、凭据处理、SFTP 协调、设置管理         │
├─────────────────────────────────────────────────────────────────┤
│                    模型层（internal/model）                       │
│  仓储接口、数据访问契约                                           │
│  定义"有哪些操作"，不定义"如何实现"                                │
├─────────────────────────────────────────────────────────────────┤
│           基础设施层（internal/infrastructure）                    │
│  SSH 客户端、SFTP 客户端、PTY、SQLite、OS 加密/Keychain            │
│  实现 model 接口，处理外部 I/O                                    │
└─────────────────────────────────────────────────────────────────┘
```

**依赖规则**：依赖方向向内。domain 层零导入。Service 导入 domain 和 model（仅接口）。Infrastructure 导入 domain 和 model（实现接口）。App 导入 service。前端通过 Wails 绑定调用 app 方法。

**终端会话数据流**：

```
用户在 xterm.js 中输入
  → Wails 运行时 EventsEmit("terminal:input", data)
    → App 接收事件，路由到 SessionService
      → SessionService 写入 SSH channel
        → SSH channel 返回输出
      → SessionService 读取输出
    → App EventsEmit("terminal:output", sessionId, data)
  → 前端 terminalStore 分发到对应 xterm.js 实例
    → xterm.js 渲染输出
```

---

## 4. 核心模块设计

### 4.1 SSH 连接管理器（`internal/infrastructure/ssh/`）

**`client.go` — SSH 客户端工厂**

```go
type Dialer interface {
    Dial(ctx context.Context, config *domain.Connection) (*ssh.Client, error)
    DialWithJump(ctx context.Context, config *domain.Connection, jumps []*domain.Connection) (*ssh.Client, error)
}
```

职责：
- 从 `domain.Connection` 构建 `ssh.ClientConfig`（超时、密码算法、密钥交换算法）
- 拨号直连
- 可选连接池（同一主机的多 Tab 复用连接）

**`jump.go` — 跳板机/堡垒机链式连接**

实现 `DialWithJump`，算法：
1. 直连第一个跳板机（堡垒机）
2. 对后续每个跳板机，通过上一个连接的 `tcpip-forward` 通道拨号下一跳
3. 对最终目标，通过最后一个跳板机的客户端拨号

等价于 OpenSSH 的 `ProxyJump`，使用 `ssh.Client.DialTCP` 实现链式穿透。

**`auth.go` — 认证方法构建**

从 `domain.Credential` 构建 `ssh.AuthMethod` 切片：

| 认证类型 | 实现 |
|----------|------|
| 密码 | `ssh.Password(string)` |
| 私钥 | `ssh.PublicKeys(signer)`，signer = `ssh.ParsePrivateKeyWithPassphrase(key, passphrase)` |
| MFA / Keyboard-interactive | `ssh.KeyboardInteractive(callback)` — 回调函数通过 Wails 事件向前端弹出提示，等待用户输入后返回 |
| 密码 + MFA | 同时包含 `ssh.Password` 和 `ssh.KeyboardInteractive` |

**MFA 回调的关键设计**：
1. 通过 Wails 事件发送 MFA 挑战（`auth:mfa-required`，含挑战提示）
2. 阻塞等待前端返回响应（通过 Go channel，支持 context 取消）
3. 将响应返回给 SSH 库

需要一个按 session ID 索引的待处理 MFA 挑战注册表，带缓冲 channel 收集响应。超时默认 60 秒。

**`config.go` — SSH 配置解析**

解析优先级：
1. 显式连接设置（来自保存的配置）
2. （未来）`~/.ssh/config` 解析主机别名

### 4.2 终端会话管理器（`internal/service/session_service.go` + `internal/infrastructure/terminal/`）

**`session.go` — 终端会话桥接**

每个活跃终端会话表示为：

```go
type TerminalSession struct {
    ID           string
    ConnectionID string
    Client       *ssh.Client
    Session      *ssh.Session
    Done         chan struct{}
    Cancel       context.CancelFunc
}
```

会话生命周期：
1. **创建**：SSH 拨号（直连或跳板）→ 请求 PTY → 启动 shell → 开始 I/O 泵
2. **I/O 泵（读）**：goroutine 从 `ssh.Session.Stdout` 读取，通过 Wails 事件发送输出
3. **I/O 泵（写）**：goroutine 监听 Wails 事件（`terminal:input`），写入 `ssh.Session.Stdin`
4. **调整大小**：收到 `terminal:resize` 事件，调用 `ssh.Session.WindowChange(rows, cols)`
5. **关闭**：取消 context、关闭 channel、等待 I/O 泵排空、关闭 SSH 会话和客户端

**SessionService** 管理活跃会话映射，提供方法：
- `StartSession(connectionID) -> sessionID`
- `WriteToSession(sessionID, data []byte)`
- `ResizeSession(sessionID, rows, cols)`
- `CloseSession(sessionID)`
- `ListActiveSessions() -> []SessionInfo`

**PTY 抽象**（`pty.go` 接口 + `pty_unix.go` + `pty_windows.go`）：

对于 SSH 连接，本地 PTY 通常不需要——PTY 在远端通过 `ssh.Session.RequestPty()` 请求。本地端只需在 SSH channel 和前端之间泵送数据。PTY 抽象为未来本地 shell 支持预留。

### 4.3 SFTP 文件传输管理器（`internal/service/sftp_service.go` + `internal/infrastructure/sftp/`）

**`client.go`** — 在已有 SSH 连接上打开 SFTP 子系统：

```go
func NewSftpClient(sshClient *ssh.Client) (*sftp.Client, error)
```

核心设计：SFTP 复用已有 SSH 连接（终端会话打开的那个），避免二次认证。在同一 `ssh.Client` 上打开新 channel。

**`operations.go`** — SFTP 操作：

| 操作 | 方法 |
|------|------|
| 列出目录 | `ReadDir(remotePath) -> []FileInfo` |
| 文件信息 | `Stat(remotePath) -> FileInfo` |
| 下载 | `Download(remotePath, localPath, progressCallback) error` |
| 上传 | `Upload(localPath, remotePath, progressCallback) error` |
| 删除 | `Remove(remotePath) error` |
| 创建目录 | `Mkdir(remotePath) error` |
| 重命名 | `Rename(oldPath, newPath) error` |

进度回调通过 Wails 事件（`sftp:transfer-progress`）发送，前端据此显示进度条。

**SftpService** 协调：
- `OpenSftpExplorer(sessionID) -> explorerID`
- `ListDirectory(explorerID, path) -> []FileEntry`
- `UploadFile(explorerID, localPath, remotePath)`
- `DownloadFile(explorerID, remotePath, localPath)`
- `CloseSftpExplorer(explorerID)`

### 4.4 连接配置与凭据存储

**ConnectionService**（`internal/service/connection_service.go`）：
- `CreateConnection(conn *domain.Connection) error`
- `UpdateConnection(id string, conn *domain.Connection) error`
- `DeleteConnection(id string) error` — 同时关闭活跃会话
- `GetConnection(id string) (*domain.Connection, error)`
- `ListConnections() ([]*domain.Connection, error)`
- `TestConnection(id string) error` — 拨号但不启动 shell，验证认证

连接模型支持：
- 直连 SSH（主机、端口、用户、认证）
- 跳板机链（有序的中间连接列表）
- 分组（文件夹/标签组织连接）

**CredentialService**（`internal/service/credential_service.go`）：
- `SaveCredential(cred *domain.Credential) error` — 存储前加密敏感字段
- `GetCredential(id string) (*domain.Credential, error)` — 读取后解密
- `DeleteCredential(id string) error`
- `ListCredentials() ([]*domain.Credential, error)` — 仅返回元数据，不含密文

### 4.5 主题与外观管理

**ThemeService**（`internal/service/theme_service.go`）：

主题主要是前端关注点（CSS 变量 + xterm.js 主题对象）。Go 后端只需：
- 持久化用户的主题选择到 settings
- 返回可用主题列表（内置 + 未来自定义）

**前端主题结构**：

每个主题是一个 TypeScript 对象，定义：
- CSS 自定义属性（UI 元素：侧边栏、Tab 栏、面板、按钮、输入框）
- xterm.js `ITheme` 对象（前景、背景、光标、选择区、ANSI 颜色）
- 字体配置（family、size、lineHeight、weight）

内置主题：Dracula、Monokai、Solarized Dark/Light、Nord、Catppuccin Mocha/Latte、GitHub Dark/Light、One Dark Pro

**macOS Retina 渲染**：

Wails 在 macOS 使用 WebKit，自动处理 Retina/HiDPI 缩放。xterm.js 渲染到 `<canvas>` 元素，自动适配 `devicePixelRatio`。关键配置：
- 容器 CSS 不设置覆盖自然缩放的显式像素宽度
- `@xterm/addon-fit` 在窗口 resize 后重新计算终端尺寸

---

## 5. 数据模型

### SQLite 表结构

**设计原则**：
- 时间戳统一使用 Unix epoch（int64），格式化在 UI 层完成
- 连接支持软删除（deleted_at 列），支持撤销
- 敏感字段（密码、私钥）存储加密密文

```sql
-- 001_init_schema.up.sql

CREATE TABLE IF NOT EXISTS connections (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    group_id    TEXT,
    host        TEXT NOT NULL,
    port        INTEGER NOT NULL DEFAULT 22,
    username    TEXT NOT NULL,
    auth_method TEXT NOT NULL,               -- 'password', 'key', 'password+mfa', 'key+mfa'
    credential_id TEXT,
    -- 内联认证（存在时加密存储）：
    password    TEXT,                        -- AES-256-GCM 加密，base64 编码
    private_key TEXT,                        -- AES-256-GCM 加密，base64 编码
    key_passphrase TEXT,                     -- AES-256-GCM 加密，base64 编码
    -- 跳板机链：
    jump_host_ids TEXT,                      -- JSON 数组，连接 ID 按序排列
    -- SSH 选项：
    keep_alive_interval INTEGER DEFAULT 30,
    connection_timeout INTEGER DEFAULT 10,
    -- 终端偏好（单连接覆盖）：
    terminal_type TEXT DEFAULT 'xterm-256color',
    font_size     INTEGER DEFAULT 14,
    -- 元数据：
    sort_order  INTEGER DEFAULT 0,
    last_used_at INTEGER,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL,
    deleted_at  INTEGER
);

CREATE TABLE IF NOT EXISTS groups (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    parent_id   TEXT,                        -- 自引用，支持嵌套分组
    sort_order  INTEGER DEFAULT 0,
    is_expanded INTEGER DEFAULT 1,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS credentials (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,               -- 'password', 'key', 'key+passphrase'
    -- 加密字段（AES-256-GCM，base64 编码）：
    password    TEXT,
    private_key TEXT,
    key_passphrase TEXT,
    -- 元数据（不加密）：
    fingerprint TEXT,                        -- 公钥 SHA256 指纹
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS session_history (
    id           TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL,
    started_at   INTEGER NOT NULL,
    ended_at     INTEGER,
    exit_status  INTEGER,
    bytes_sent   INTEGER DEFAULT 0,
    bytes_recv   INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL                      -- JSON 编码值
);

-- 首次启动插入默认设置：
-- 'theme'           -> '{"id": "dracula"}'
-- 'font_family'     -> '"Menlo"' (macOS) / '"Consolas"' (Windows)
-- 'font_size'       -> '14'
-- 'default_shell'   -> '""'
-- 'scrollback'      -> '10000'
-- 'cursor_style'    -> '"block"'
-- 'cursor_blink'    -> 'true'
-- 'copy_on_select'  -> 'false'
-- 'confirm_on_close' -> 'true'

CREATE INDEX idx_connections_group ON connections(group_id);
CREATE INDEX idx_connections_last_used ON connections(last_used_at);
CREATE INDEX idx_session_history_connection ON session_history(connection_id);
CREATE INDEX idx_session_history_started ON session_history(started_at);
```

### 仓储接口（`internal/model/repository.go`）

```go
type ConnectionRepository interface {
    Create(ctx context.Context, conn *domain.Connection) error
    GetByID(ctx context.Context, id string) (*domain.Connection, error)
    List(ctx context.Context) ([]*domain.Connection, error)
    ListByGroup(ctx context.Context, groupID string) ([]*domain.Connection, error)
    Update(ctx context.Context, conn *domain.Connection) error
    SoftDelete(ctx context.Context, id string) error
    UpdateLastUsed(ctx context.Context, id string) error
}

type CredentialRepository interface {
    Create(ctx context.Context, cred *domain.Credential) error
    GetByID(ctx context.Context, id string) (*domain.Credential, error)
    List(ctx context.Context) ([]*domain.Credential, error)
    Update(ctx context.Context, cred *domain.Credential) error
    Delete(ctx context.Context, id string) error
}

type SessionRepository interface {
    Create(ctx context.Context, session *domain.SessionHistory) error
    UpdateEndTime(ctx context.Context, id string, endedAt int64, exitStatus int) error
    ListByConnection(ctx context.Context, connectionID string, limit int) ([]*domain.SessionHistory, error)
}

type SettingsRepository interface {
    Get(ctx context.Context, key string) (string, error)
    Set(ctx context.Context, key string, value string) error
    GetAll(ctx context.Context) (map[string]string, error)
}
```

---

## 6. 安全设计

### 6.1 凭据加密存储

**方案：AES-256-GCM + OS Keychain 托管主密钥**

```
[用户保存含密码的连接]
  → CredentialService.SaveCredential()
    → Encryptor.Encrypt(plaintext, masterKey)
      → 生成随机 12 字节 nonce
      → AES-256-GCM seal：ciphertext = nonce || sealed_data || auth_tag
      → Base64 编码完整密文
    → 存储到 SQLite

[用户打开连接]
  → CredentialService.GetCredential()
    → 从 SQLite 读取 base64 字符串
    → Encryptor.Decrypt(ciphertext, masterKey)
      → Base64 解码
      → 提取 nonce（前 12 字节）
      → AES-256-GCM open：验证 auth_tag，解密
    → 将明文传递给 SSH 认证层（不传给前端）
```

**主密钥管理**：

| 平台 | 存储 | API |
|------|------|-----|
| macOS | Keychain Services | `github.com/keybase/go-keychain` |
| Windows | DPAPI（数据保护 API） | `github.com/microsoft/go-winio` 或直接调用 `crypt32.dll` |

首次启动：
1. 生成 32 字节随机主密钥（`crypto/rand.Read`）
2. 存入 OS Keychain，服务名 `com.next-terminal.master-key`
3. 后续启动从 Keychain 读取

**关键原则：敏感数据不穿过 Wails 桥。** 密码和私钥在 Go 中解密后直接传给 `golang.org/x/crypto/ssh` 进行认证，前端永远不接收明文凭据——只看到连接元数据（名称、主机、用户、认证类型）。

### 6.2 SSH 密钥文件处理

用户通过路径引用的私钥文件（如 `~/.ssh/id_rsa`）在连接时读取，不存入数据库。

用户导入到应用凭据存储的私钥：
1. 读取密钥内容到内存
2. 立即用 AES-256-GCM 加密
3. 加密后的 blob 存入 SQLite
4. 尽力清除内存中的明文（Go GC 限制，覆盖切片）

### 6.3 MFA 响应安全

MFA 挑战响应通过 Wails 事件系统传输，可接受因为：
- Wails 运行时通过 IPC 通信（非网络 socket）
- Webview 本地运行，不加载远程内容
- 响应生命周期短（SSH 认证回调立即消费）

### 6.4 数据库文件保护

- macOS：`~/Library/Application Support/next-terminal/data.db`
- Windows：`%APPDATA%\next-terminal\data.db`
- 创建时设置文件权限 0600
- 启用 WAL 模式保证并发读写安全
- 定期 checkpoint 防止 WAL 文件膨胀

---

## 7. 跨平台抽象

### 7.1 PTY 接口

```go
// internal/infrastructure/terminal/pty.go
type PTY interface {
    Start(cmd *exec.Cmd, rows, cols uint16) error
    Resize(rows, cols uint16) error
    Read(b []byte) (int, error)
    Write(b []byte) (int, error)
    Close() error
}
```

### 7.2 平台特定实现

**Unix**（`pty_unix.go`）：使用 `github.com/creack/pty`，标准 POSIX PTY（`openpty()` 系统调用）。构建标签：`//go:build !windows`。

**Windows**（`pty_windows.go`）：使用 `github.com/microsoft/go-winio` 的 ConPTY API（Windows 10 1809+ 现代终端基础设施）。构建标签：`//go:build windows`。

**SSH 会话场景**：无需本地 PTY，远端 PTY 由 SSH 库管理。本地"PTY"仅为 Wails 事件与 SSH channel 之间的数据桥接。PTY 接口和平台实现为未来本地 shell 支持预留。

对于 SSH 会话，`terminal/session.go` 使用简化的桥接：

```go
type SSHSessionBridge struct {
    id       string
    session  *ssh.Session
    client   *ssh.Client
    ctx      context.Context
    cancel   context.CancelFunc
    onOutput func(data []byte)  // 回调：发送 Wails 事件
    onError  func(err error)
}
```

### 7.3 平台特定路径

```go
func DataDir() (string, error) {
    switch runtime.GOOS {
    case "darwin":
        return filepath.Join(os.Getenv("HOME"), "Library", "Application Support", "next-terminal"), nil
    case "windows":
        return filepath.Join(os.Getenv("APPDATA"), "next-terminal"), nil
    default:
        return filepath.Join(os.Getenv("HOME"), ".local", "share", "next-terminal"), nil
    }
}
```

### 7.4 交叉编译

Wails CLI 处理交叉编译（`wails build -platform darwin/universal` 或 `windows/amd64`）。Go 代码使用构建标签处理平台特定文件。`modernc.org/sqlite` 纯 Go 驱动消除 CGO，交叉编译零配置。

---

## 8. 前端架构

### 8.1 组件层级

```
App
├── TitleBar                    # 自定义标题栏（或原生，可配置）
├── Sidebar
│   ├── ConnectionSearch        # 搜索/过滤
│   ├── ConnectionTree          # 层级连接列表
│   │   ├── ConnectionGroup     # 可折叠文件夹
│   │   └── ConnectionItem      # 单个连接条目
│   └── SidebarFooter           # 设置、关于
├── MainArea
│   ├── TabBar
│   │   ├── TerminalTab[]       # 每个活跃会话一个
│   │   ├── SftpTab[]           # 每个 SFTP 浏览器一个
│   │   └── TabActions          # 新建/关闭 Tab
│   └── TabContent
│       ├── TerminalView        # 包含 xterm.js 实例
│       ├── SftpExplorer        # 文件浏览器 + 传输面板
│       └── WelcomeScreen       # 无 Tab 时显示
└── Modals/Overlays
    ├── ConnectionForm           # 创建/编辑连接
    ├── MfaPrompt                # MFA 码输入
    ├── SettingsPanel            # 应用设置
    └── KeyImport                # SSH 密钥导入
```

### 8.2 XtermTerminal 组件设计

`XtermTerminal.tsx` 是最关键的前端组件：

```typescript
interface XtermTerminalProps {
  sessionId: string;
  theme: ITheme;
  fontSize: number;
  fontFamily: string;
}

function XtermTerminal({ sessionId, theme, fontSize, fontFamily }: XtermTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    // 1. 创建 Terminal 实例
    const terminal = new Terminal({ theme, fontSize, fontFamily, scrollback: 10000 });
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(containerRef.current!);
    fitAddon.fit();

    // 2. 监听 Go 后端输出
    const cancel = EventsOn(`terminal:${sessionId}:output`, (data: string) => {
      terminal.write(data);
    });

    // 3. 发送用户输入到 Go 后端
    terminal.onData((data) => {
      EventsEmit(`terminal:${sessionId}:input`, data);
    });

    // 4. 处理 resize
    terminal.onResize(({ cols, rows }) => {
      EventsEmit(`terminal:${sessionId}:resize`, { cols, rows });
    });

    // 5. 监听容器尺寸变化
    const resizeObserver = new ResizeObserver(() => { fitAddon.fit(); });
    resizeObserver.observe(containerRef.current!);

    return () => {
      cancel();
      resizeObserver.disconnect();
      terminal.dispose();
    };
  }, [sessionId]);

  // 更新主题/字体（无需重建终端）
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = theme;
      terminalRef.current.options.fontSize = fontSize;
      terminalRef.current.options.fontFamily = fontFamily;
    }
  }, [theme, fontSize, fontFamily]);

  return <div ref={containerRef} className="w-full h-full" />;
}
```

**性能考量**：
- 每个 xterm.js 实例创建独立 canvas，10+ 并发 Tab 时内存消耗显著
- 隐藏 Tab 策略：从 DOM 分离终端但继续写入滚动缓冲区，重新选中时重连并写入缓冲内容——避免不可见 canvas 渲染开销同时保留会话历史

### 8.3 事件通信协议

| 方向 | 通道 | 用途 |
|------|------|------|
| 前端 → Go | `EventsEmit("terminal:{id}:input", data)` | 用户按键 |
| 前端 → Go | `EventsEmit("terminal:{id}:resize", {cols, rows})` | 终端调整大小 |
| Go → 前端 | `EventsEmit("terminal:{id}:output", data)` | SSH 输出 |
| 前端 → Go | `ConnectionService.StartConnection(id)` | 绑定方法，返回 session ID |
| Go → 前端 | `EventsEmit("auth:mfa-required", {sessionId, prompts})` | MFA 挑战 |
| 前端 → Go | `EventsEmit("auth:mfa-response", {sessionId, responses})` | MFA 响应 |
| Go → 前端 | `EventsEmit("sftp:transfer-progress", {id, bytes, total})` | 传输进度 |

### 8.4 主题系统

主题定义为 CSS 自定义属性 + xterm.js `ITheme` 对象：

```typescript
// themes/dracula.ts
export const dracula = {
  id: 'dracula',
  name: 'Dracula',
  css: {
    '--bg-primary': '#282a36',
    '--bg-secondary': '#1e1f29',
    '--bg-sidebar': '#21222c',
    '--text-primary': '#f8f8f2',
    '--text-secondary': '#8be9fd',
    '--accent': '#bd93f9',
    '--border': '#44475a',
    '--tab-active': '#44475a',
    '--tab-inactive': '#282a36',
  },
  xterm: {
    foreground: '#f8f8f2',
    background: '#282a36',
    cursor: '#f8f8f2',
    cursorAccent: '#282a36',
    selectionBackground: '#44475a',
    black: '#21222c', red: '#ff5555', green: '#50fa7b', yellow: '#f1fa8c',
    blue: '#bd93f9', magenta: '#ff79c6', cyan: '#8be9fd', white: '#f8f8f2',
    brightBlack: '#6272a4', brightRed: '#ff6e6e', brightGreen: '#69ff94',
    brightYellow: '#ffffa5', brightBlue: '#d6acff', brightMagenta: '#ff92df',
    brightCyan: '#a4ffff', brightWhite: '#ffffff',
  }
};
```

应用主题：
1. 在 `document.documentElement.style` 上设置所有 CSS 自定义属性
2. 更新 Zustand terminal store，触发所有活跃终端的 `options.theme` 更新

---

## 9. 应用入口与生命周期

### `cmd/next-terminal/main.go`

```go
func main() {
    // 1. 初始化基础设施
    dataDir := paths.DataDir()
    db := database.Open(filepath.Join(dataDir, "data.db"))
    defer db.Close()

    // 2. 运行迁移
    migrate.Up(db)

    // 3. 初始化仓储
    connRepo := model.NewConnectionRepo(db)
    credRepo := model.NewCredentialRepo(db)
    sessionRepo := model.NewSessionRepo(db)
    settingsRepo := model.NewSettingsRepo(db)

    // 4. 初始化加密器（从 OS Keychain 加载主密钥）
    encryptor := crypto.NewEncryptor()

    // 5. 初始化服务
    credService := service.NewCredentialService(credRepo, encryptor)
    connService := service.NewConnectionService(connRepo, credService)
    sessionService := service.NewSessionService(ssh.NewDialer(), connService, credService)
    sftpService := service.NewSftpService(sessionService)
    settingsService := service.NewSettingsService(settingsRepo)
    themeService := service.NewThemeService(settingsService)

    // 6. 创建 Wails App（绑定层）
    app := app.NewApp(connService, sessionService, sftpService, credService, settingsService, themeService)

    // 7. 运行 Wails
    err := wails.Run(&options.App{
        Title:     "next-terminal",
        Width:     1200,
        Height:    800,
        MinWidth:  800,
        MinHeight: 600,
        AssetServer: &assetserver.Options{Assets: assets},
        BackgroundColour: &options.RGBA{R: 40, G: 42, B: 54, A: 1},
        OnStartup:  app.Startup,
        OnShutdown: app.Shutdown,
        Menu:       app.Menu(),
        SingleInstanceLock: &options.SingleInstanceLock{
            UniqueID: "next-terminal-single-instance",
        },
        Bind: []interface{}{app},
    })
    if err != nil {
        log.Fatal(err)
    }
}
```

### `internal/app/app.go` — Wails 绑定层

App 结构体包装 Service 并暴露方法，Wails 自动绑定到前端：

```go
type App struct {
    ctx             context.Context
    connService     *service.ConnectionService
    sessionService  *service.SessionService
    sftpService     *service.SftpService
    credService     *service.CredentialService
    settingsService *service.SettingsService
    themeService    *service.ThemeService
}

// 暴露给前端的方法：

// 连接管理
func (a *App) ListConnections() ([]*domain.Connection, error)
func (a *App) SaveConnection(conn *domain.Connection) error
func (a *App) DeleteConnection(id string) error
func (a *App) TestConnection(id string) error

// 会话管理
func (a *App) StartSession(connectionID string) (string, error)
func (a *App) CloseSession(sessionID string) error
func (a *App) WriteToSession(sessionID string, data string) error
func (a *App) ResizeSession(sessionID string, rows int, cols int) error

// SFTP
func (a *App) OpenSftpExplorer(sessionID string) (string, error)
func (a *App) SftpListDir(explorerID string, path string) ([]*domain.FileEntry, error)
func (a *App) SftpUpload(explorerID string, localPath string, remotePath string) error
func (a *App) SftpDownload(explorerID string, remotePath string, localPath string) error

// 设置
func (a *App) GetSettings() (map[string]string, error)
func (a *App) SaveSetting(key string, value string) error

// 主题
func (a *App) GetThemes() ([]*domain.ThemeInfo, error)
func (a *App) GetCurrentTheme() (string, error)
```

前端通过自动生成的 TypeScript 绑定调用：

```typescript
import { ListConnections, StartSession } from '../wailsjs/go/main/App';
const connections = await ListConnections();
const sessionId = await StartSession(connectionId);
```

---

## 10. 关键架构决策总结

| 决策 | 选择 | 备选 | 理由 |
|------|------|------|------|
| GUI 框架 | Wails v2 | Fyne, Gio | 唯一能原生运行 xterm.js 的方案 |
| 前端 | React | Svelte | 生态更大，xterm.js 封装更多 |
| SQLite 驱动 | modernc.org/sqlite | mattn/go-sqlite3 | 纯 Go 无 CGO，交叉编译零配置 |
| 状态管理 | Zustand | Redux, Jotai | 极简、无 Provider |
| 加密 | AES-256-GCM | ChaCha20-Poly1305 | 标准化，双平台硬件加速 |
| 密钥存储 | OS Keychain | 加密文件 | 零用户摩擦，OS 管理安全 |
| 会话 I/O | Wails Events | 本地 WebSocket | Events 是 Wails 原生方式，无需额外服务器 |
| SSH 连接复用 | SFTP 复用已有连接 | 独立连接 | 避免二次认证，节省资源 |
| 隐藏 Tab 终端 | Go 端缓冲，重连时回写 | 保持 xterm.js 活跃 | 节省内存（无不可见 canvas 渲染） |

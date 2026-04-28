CREATE TABLE IF NOT EXISTS connections (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    group_id    TEXT,
    host        TEXT NOT NULL,
    port        INTEGER NOT NULL DEFAULT 22,
    username    TEXT NOT NULL,
    auth_method TEXT NOT NULL,
    credential_id TEXT,
    password    TEXT,
    private_key TEXT,
    key_passphrase TEXT,
    jump_host_ids TEXT,
    keep_alive_interval INTEGER DEFAULT 30,
    connection_timeout INTEGER DEFAULT 10,
    terminal_type TEXT DEFAULT 'xterm-256color',
    font_size     INTEGER DEFAULT 14,
    sort_order  INTEGER DEFAULT 0,
    last_used_at INTEGER,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL,
    deleted_at  INTEGER
);

CREATE TABLE IF NOT EXISTS groups (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    parent_id   TEXT,
    sort_order  INTEGER DEFAULT 0,
    is_expanded INTEGER DEFAULT 1,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS credentials (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,
    password    TEXT,
    private_key TEXT,
    key_passphrase TEXT,
    fingerprint TEXT,
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
    value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_connections_group ON connections(group_id);
CREATE INDEX IF NOT EXISTS idx_connections_last_used ON connections(last_used_at);
CREATE INDEX IF NOT EXISTS idx_session_history_connection ON session_history(connection_id);
CREATE INDEX IF NOT EXISTS idx_session_history_started ON session_history(started_at);

INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', '"dracula"');
INSERT OR IGNORE INTO settings (key, value) VALUES ('font_family', '"Menlo"');
INSERT OR IGNORE INTO settings (key, value) VALUES ('font_size', '14');
INSERT OR IGNORE INTO settings (key, value) VALUES ('default_shell', '""');
INSERT OR IGNORE INTO settings (key, value) VALUES ('scrollback', '10000');
INSERT OR IGNORE INTO settings (key, value) VALUES ('cursor_style', '"block"');
INSERT OR IGNORE INTO settings (key, value) VALUES ('cursor_blink', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('copy_on_select', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('confirm_on_close', 'true');

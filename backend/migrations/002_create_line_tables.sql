-- 002_create_line_tables.sql
-- LINE 功能相關資料表遷移腳本

-- 1. 建立 line_upload_records 表
CREATE TABLE IF NOT EXISTS line_upload_records (
    id CHAR(36) PRIMARY KEY,
    file_id INTEGER NOT NULL,
    line_user_id VARCHAR(100) NOT NULL,
    line_user_name VARCHAR(255) NOT NULL,
    line_message_id VARCHAR(100) NOT NULL,
    line_group_id VARCHAR(100),
    line_group_name VARCHAR(255),
    message_type VARCHAR(20) DEFAULT 'image',
    original_url VARCHAR(500),
    download_status VARCHAR(20) DEFAULT 'completed',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
);

-- 建立索引
CREATE UNIQUE INDEX uk_line_message_id ON line_upload_records (line_message_id);
CREATE INDEX idx_line_user_id ON line_upload_records (line_user_id);
CREATE INDEX idx_line_group_id ON line_upload_records (line_group_id);
CREATE INDEX idx_line_user_created ON line_upload_records (line_user_id, created_at DESC);
CREATE INDEX idx_file_line ON line_upload_records (file_id, line_user_id);
CREATE INDEX idx_created_at ON line_upload_records (created_at DESC);
CREATE INDEX idx_message_type ON line_upload_records (message_type);

-- 2. 建立 line_users 表
CREATE TABLE IF NOT EXISTS line_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_user_id VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    picture_url VARCHAR(500),
    status_message TEXT,
    language VARCHAR(10),
    is_blocked BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    first_interaction_at DATETIME,
    last_interaction_at DATETIME,
    total_uploads INTEGER DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引
CREATE INDEX idx_line_users_line_user_id ON line_users (line_user_id);
CREATE INDEX idx_line_users_display_name ON line_users (display_name);
CREATE INDEX idx_line_users_last_interaction ON line_users (last_interaction_at DESC);
CREATE INDEX idx_line_users_total_uploads ON line_users (total_uploads DESC);

-- 3. 建立 line_groups 表
CREATE TABLE IF NOT EXISTS line_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_group_id VARCHAR(100) NOT NULL UNIQUE,
    group_name VARCHAR(255) NOT NULL,
    group_type VARCHAR(20) DEFAULT 'group',
    is_active BOOLEAN DEFAULT 1,
    member_count INTEGER DEFAULT 0,
    total_uploads INTEGER DEFAULT 0,
    first_interaction_at DATETIME,
    last_interaction_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引
CREATE INDEX idx_line_groups_line_group_id ON line_groups (line_group_id);
CREATE INDEX idx_line_groups_group_name ON line_groups (group_name);
CREATE INDEX idx_line_groups_last_interaction ON line_groups (last_interaction_at DESC);
CREATE INDEX idx_line_groups_total_uploads ON line_groups (total_uploads DESC);

-- 4. 建立 line_group_members 表
CREATE TABLE IF NOT EXISTS line_group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_group_id VARCHAR(100) NOT NULL,
    line_user_id VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'member',
    join_date DATETIME,
    leave_date DATETIME,
    is_active BOOLEAN DEFAULT 1,
    upload_count INTEGER DEFAULT 0,
    last_upload_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (line_group_id, line_user_id)
);

-- 建立索引
CREATE INDEX idx_line_group_members_group_id ON line_group_members (line_group_id);
CREATE INDEX idx_line_group_members_user_id ON line_group_members (line_user_id);
CREATE INDEX idx_line_group_members_active ON line_group_members (line_group_id, is_active);
CREATE INDEX idx_line_group_members_upload_count ON line_group_members (upload_count DESC);

-- 5. 建立 line_webhook_logs 表
CREATE TABLE IF NOT EXISTS line_webhook_logs (
    id CHAR(36) PRIMARY KEY,
    webhook_type VARCHAR(50) NOT NULL,
    line_user_id VARCHAR(100),
    line_group_id VARCHAR(100),
    message_id VARCHAR(100),
    message_type VARCHAR(20),
    event_data JSON,
    processing_status VARCHAR(20) DEFAULT 'pending',
    processing_time INTEGER,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引
CREATE INDEX idx_line_webhook_logs_type ON line_webhook_logs (webhook_type);
CREATE INDEX idx_line_webhook_logs_user_id ON line_webhook_logs (line_user_id);
CREATE INDEX idx_line_webhook_logs_message_id ON line_webhook_logs (message_id);
CREATE INDEX idx_line_webhook_logs_status ON line_webhook_logs (processing_status);
CREATE INDEX idx_line_webhook_logs_created_at ON line_webhook_logs (created_at DESC);
CREATE INDEX idx_line_webhook_logs_retry_count ON line_webhook_logs (retry_count);

-- 6. 建立 line_settings 表
CREATE TABLE IF NOT EXISTS line_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_by INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users (id)
);

-- 建立索引
CREATE INDEX idx_line_settings_key ON line_settings (setting_key);
CREATE INDEX idx_line_settings_active ON line_settings (is_active);

-- 7. 建立 line_upload_stats 表
CREATE TABLE IF NOT EXISTS line_upload_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stat_date DATE NOT NULL,
    stat_type VARCHAR(20) NOT NULL,
    line_user_id VARCHAR(100),
    line_group_id VARCHAR(100),
    upload_count INTEGER DEFAULT 0,
    file_size_total BIGINT DEFAULT 0,
    image_count INTEGER DEFAULT 0,
    video_count INTEGER DEFAULT 0,
    other_count INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (stat_date, stat_type, line_user_id, line_group_id)
);

-- 建立索引
CREATE INDEX idx_line_upload_stats_date ON line_upload_stats (stat_date DESC);
CREATE INDEX idx_line_upload_stats_type ON line_upload_stats (stat_type);
CREATE INDEX idx_line_upload_stats_user_id ON line_upload_stats (line_user_id);
CREATE INDEX idx_line_upload_stats_group_id ON line_upload_stats (line_group_id);
CREATE INDEX idx_line_upload_stats_upload_count ON line_upload_stats (upload_count DESC);

-- 插入預設設定
INSERT INTO line_settings (setting_key, setting_value, setting_type, description) VALUES
('auto_download_enabled', 'true', 'boolean', '是否自動下載 LINE 上傳的照片'),
('download_timeout', '30', 'integer', '下載逾時時間（秒）'),
('max_retry_count', '3', 'integer', '下載失敗最大重試次數'),
('allowed_file_types', 'image/jpeg,image/png,image/gif,image/webp', 'string', '允許的檔案類型'),
('max_file_size', '52428800', 'integer', '最大檔案大小（bytes）- 預設 50MB'),
('webhook_verification_enabled', 'true', 'boolean', '是否啟用 Webhook 簽名驗證'),
('rate_limit_per_minute', '100', 'integer', '每分鐘 API 請求限制'),
('stat_aggregation_enabled', 'true', 'boolean', '是否啟用統計數據聚合'),
('stat_retention_days', '365', 'integer', '統計數據保留天數');

-- 建立觸發器：自動更新 updated_at 欄位
CREATE TRIGGER update_line_upload_records_updated_at AFTER UPDATE ON line_upload_records
BEGIN
    UPDATE line_upload_records SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_line_users_updated_at AFTER UPDATE ON line_users
BEGIN
    UPDATE line_users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_line_groups_updated_at AFTER UPDATE ON line_groups
BEGIN
    UPDATE line_groups SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_line_group_members_updated_at AFTER UPDATE ON line_group_members
BEGIN
    UPDATE line_group_members SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_line_webhook_logs_updated_at AFTER UPDATE ON line_webhook_logs
BEGIN
    UPDATE line_webhook_logs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_line_settings_updated_at AFTER UPDATE ON line_settings
BEGIN
    UPDATE line_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_line_upload_stats_updated_at AFTER UPDATE ON line_upload_stats
BEGIN
    UPDATE line_upload_stats SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
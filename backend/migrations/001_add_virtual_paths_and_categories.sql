-- Migration script: Add virtual paths, categories, and SHA256 hash support
-- Version: 2.0.0
-- Date: 2025-01-10

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(20),
    icon VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 2. Create export_jobs table
CREATE TABLE IF NOT EXISTS export_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id VARCHAR(100) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    total_files INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    total_size INTEGER DEFAULT 0,
    processed_size INTEGER DEFAULT 0,
    export_format VARCHAR(10) DEFAULT 'zip',
    download_path VARCHAR(500),
    error TEXT,
    estimated_completion DATETIME,
    completed_at DATETIME,
    expires_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 3. Add new columns to files table
-- Note: SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we use separate statements

-- Add virtual_path column
ALTER TABLE files ADD COLUMN virtual_path VARCHAR(1000);

-- Add sha256_hash column  
ALTER TABLE files ADD COLUMN sha256_hash VARCHAR(64);

-- Add category_id column
ALTER TABLE files ADD COLUMN category_id INTEGER;

-- Add thumbnail_url column
ALTER TABLE files ADD COLUMN thumbnail_url VARCHAR(500);

-- 4. Create indexes for better performance
-- 主要查詢索引
CREATE INDEX IF NOT EXISTS idx_files_virtual_path ON files(virtual_path);
CREATE INDEX IF NOT EXISTS idx_files_sha256_hash ON files(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_files_category_id ON files(category_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_parent_id ON files(parent_id);
CREATE INDEX IF NOT EXISTS idx_files_is_deleted ON files(is_deleted);
CREATE INDEX IF NOT EXISTS idx_files_is_directory ON files(is_directory);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);
CREATE INDEX IF NOT EXISTS idx_files_updated_at ON files(updated_at);

-- 複合索引用於常見查詢組合
CREATE INDEX IF NOT EXISTS idx_files_user_deleted ON files(uploaded_by, is_deleted);
CREATE INDEX IF NOT EXISTS idx_files_category_deleted ON files(category_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_files_parent_deleted ON files(parent_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_files_hash_deleted ON files(sha256_hash, is_deleted);
CREATE INDEX IF NOT EXISTS idx_files_virtual_path_prefix ON files(substr(virtual_path, 1, 50));

-- 分類索引
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_created_by ON categories(created_by);

-- 匯出任務索引
CREATE INDEX IF NOT EXISTS idx_export_jobs_user_id ON export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_job_id ON export_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_created_at ON export_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_export_jobs_expires_at ON export_jobs(expires_at);

-- 用戶索引（如果還沒有）
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 檔案分享索引
CREATE INDEX IF NOT EXISTS idx_file_shares_token ON file_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_file_shares_file_id ON file_shares(file_id);
CREATE INDEX IF NOT EXISTS idx_file_shares_expires_at ON file_shares(expires_at);

-- 活動記錄索引
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- 5. Add foreign key constraints (if not already present)
-- Note: SQLite foreign key constraints can't be added to existing tables,
-- so we create a trigger instead for category_id

CREATE TRIGGER IF NOT EXISTS fk_files_category_id
    BEFORE INSERT ON files
    WHEN NEW.category_id IS NOT NULL
BEGIN
    SELECT CASE
        WHEN (SELECT id FROM categories WHERE id = NEW.category_id) IS NULL
        THEN RAISE(ABORT, 'Foreign key constraint failed: category_id')
    END;
END;

CREATE TRIGGER IF NOT EXISTS fk_files_category_id_update
    BEFORE UPDATE ON files
    WHEN NEW.category_id IS NOT NULL
BEGIN
    SELECT CASE
        WHEN (SELECT id FROM categories WHERE id = NEW.category_id) IS NULL
        THEN RAISE(ABORT, 'Foreign key constraint failed: category_id')
    END;
END;

-- 6. Create default categories
INSERT OR IGNORE INTO categories (name, description, color, icon, sort_order, is_active, created_by) VALUES
('安息日聚會', '安息日聚會相關檔案', '#2563eb', 'church', 1, true, 1),
('講道錄音', '講道和證道錄音檔案', '#dc2626', 'microphone', 2, true, 1),
('見證分享', '弟兄姊妹的見證分享', '#059669', 'heart', 3, true, 1),
('詩歌讚美', '詩歌和讚美相關檔案', '#7c3aed', 'music', 4, true, 1),
('教會活動', '各種教會活動紀錄', '#ea580c', 'calendar', 5, true, 1),
('教材講義', '主日學和查經教材', '#0891b2', 'book', 6, true, 1),
('會議記錄', '各種會議和決議記錄', '#4338ca', 'clipboard', 7, true, 1),
('照片集錦', '教會生活照片集', '#be185d', 'camera', 8, true, 1);

-- 7. Update existing files to have virtual paths based on their current structure
-- This is a data migration to populate virtual_path for existing files
UPDATE files 
SET virtual_path = '/' || original_name 
WHERE virtual_path IS NULL AND parent_id IS NULL;

-- For files with parent directories, we'll need a more complex update
-- This will be handled by the application logic during startup

-- 8. Create a view for file statistics
CREATE VIEW IF NOT EXISTS file_stats AS
SELECT 
    category_id,
    c.name as category_name,
    COUNT(*) as file_count,
    SUM(file_size) as total_size,
    AVG(file_size) as avg_size
FROM files f
LEFT JOIN categories c ON f.category_id = c.id
WHERE f.is_deleted = false
GROUP BY category_id, c.name;

-- 9. Create a view for storage usage by user
CREATE VIEW IF NOT EXISTS user_storage_stats AS
SELECT 
    uploaded_by as user_id,
    u.name as user_name,
    u.email as user_email,
    COUNT(*) as file_count,
    SUM(file_size) as total_size,
    COUNT(DISTINCT sha256_hash) as unique_files
FROM files f
JOIN users u ON f.uploaded_by = u.id
WHERE f.is_deleted = false
GROUP BY uploaded_by, u.name, u.email;

-- 10. Migration version tracking
CREATE TABLE IF NOT EXISTS migration_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO migration_history (version, description) VALUES 
('001', 'Add virtual paths, categories, and SHA256 hash support');
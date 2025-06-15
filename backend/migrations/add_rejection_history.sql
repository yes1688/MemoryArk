-- 添加拒絕歷史記錄欄位到用戶註冊申請表
ALTER TABLE user_registration_requests ADD COLUMN rejection_history TEXT;
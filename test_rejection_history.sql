-- 測試查詢拒絕歷史字段
SELECT 
    id,
    email, 
    name,
    rejection_reason,
    rejection_history,
    length(rejection_history) as history_length
FROM user_registration_requests 
WHERE id IN (6, 5, 2);
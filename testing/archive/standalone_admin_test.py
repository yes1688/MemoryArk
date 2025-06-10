#!/usr/bin/env python3
"""
獨立的管理員權限測試 - 不使用任何cache
"""
import requests

def test_admin_endpoints():
    """測試所有管理員端點"""
    print("🧪 獨立管理員權限測試")
    
    # 創建全新的session
    session = requests.Session()
    headers = {'CF-Access-Authenticated-User-Email': '94work.net@gmail.com'}
    
    # 首先檢查用戶角色
    print("\n1. 檢查用戶角色:")
    response = session.get('http://localhost:7001/api/auth/me', headers=headers, timeout=30)
    if response.status_code == 200:
        user_data = response.json()
        role = user_data['data']['role']
        print(f"   用戶角色: {role}")
        if role != 'admin':
            print(f"   ❌ 用戶不是管理員！")
            return False
    else:
        print(f"   ❌ 無法獲取用戶資訊: {response.status_code}")
        return False
    
    # 測試管理員端點
    admin_endpoints = [
        ('GET', '/api/admin/users', '用戶管理'),
        ('GET', '/api/admin/stats', '系統統計'),
        ('GET', '/api/admin/logs', '活動日誌'),
        ('GET', '/api/admin/registrations', '註冊申請列表'),
    ]
    
    success_count = 0
    total_count = len(admin_endpoints)
    
    print(f"\n2. 測試 {total_count} 個管理員端點:")
    
    for method, endpoint, description in admin_endpoints:
        print(f"\n   🧪 測試: {description}")
        
        try:
            response = session.request(method, f'http://localhost:7001{endpoint}', headers=headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    print(f"   ✅ 通過: {description}")
                    success_count += 1
                else:
                    print(f"   ❌ API失敗: {data.get('error', '未知錯誤')}")
            else:
                try:
                    error_data = response.json()
                    print(f"   ❌ 失敗 ({response.status_code}): {error_data.get('message', '未知錯誤')}")
                except:
                    print(f"   ❌ HTTP錯誤: {response.status_code}")
                    
        except Exception as e:
            print(f"   ❌ 異常: {str(e)}")
    
    print(f"\n📊 測試結果: {success_count}/{total_count} 通過 ({success_count/total_count*100:.1f}%)")
    
    if success_count == total_count:
        print("🎉 所有管理員端點測試通過！")
        return True
    else:
        print("⚠️  部分管理員端點測試失敗")
        return False

if __name__ == '__main__':
    test_admin_endpoints()
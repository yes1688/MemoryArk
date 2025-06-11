#!/usr/bin/env python3
"""
測試資料夾建立和顯示功能
"""

import requests
import json
import time

BASE_URL = "http://localhost:7001"
HEADERS = {
    "Content-Type": "application/json",
    "CF-Access-Authenticated-User-Email": "94work.net@gmail.com"
}

def test_folder_creation():
    print("🚀 開始測試資料夾建立和顯示功能")
    print("=" * 50)
    
    # 1. 獲取初始檔案列表
    print("📂 步驟 1: 獲取初始檔案列表")
    try:
        response = requests.get(f"{BASE_URL}/api/files/", headers=HEADERS)
        print(f"狀態碼: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            initial_files = data.get('data', {}).get('files', [])
            initial_folders = [f for f in initial_files if f.get('is_directory')]
            print(f"初始資料夾數量: {len(initial_folders)}")
            for folder in initial_folders[:5]:  # 只顯示前5個
                print(f"  - {folder['name']} (ID: {folder['id']})")
        else:
            print(f"獲取檔案列表失敗: {response.text}")
            return
    except Exception as e:
        print(f"錯誤: {e}")
        return
    
    # 2. 建立新資料夾
    print("\n📁 步驟 2: 建立新資料夾")
    folder_name = f"MCP測試資料夾_{int(time.time())}"
    folder_data = {"name": folder_name}
    
    try:
        response = requests.post(f"{BASE_URL}/api/folders", 
                               headers=HEADERS, 
                               json=folder_data)
        print(f"狀態碼: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            if data.get('success'):
                new_folder = data.get('data', {})
                print(f"✅ 資料夾建立成功!")
                print(f"  名稱: {new_folder.get('name')}")
                print(f"  ID: {new_folder.get('id')}")
                print(f"  路徑: {new_folder.get('file_path')}")
                print(f"  虛擬路徑: {new_folder.get('virtual_path')}")
            else:
                print(f"❌ 建立失敗: {data.get('message')}")
                return
        else:
            print(f"❌ 建立失敗: {response.text}")
            return
    except Exception as e:
        print(f"錯誤: {e}")
        return
    
    # 3. 重新獲取檔案列表，檢查新資料夾是否出現
    print("\n🔍 步驟 3: 重新獲取檔案列表")
    try:
        time.sleep(1)  # 等待一秒確保資料庫同步
        response = requests.get(f"{BASE_URL}/api/files/", headers=HEADERS)
        print(f"狀態碼: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            updated_files = data.get('data', {}).get('files', [])
            updated_folders = [f for f in updated_files if f.get('is_directory')]
            print(f"更新後資料夾數量: {len(updated_folders)}")
            
            # 檢查新建立的資料夾是否在列表中
            new_folder_found = False
            for folder in updated_folders:
                if folder['name'] == folder_name:
                    new_folder_found = True
                    print(f"✅ 找到新建立的資料夾: {folder['name']} (ID: {folder['id']})")
                    break
            
            if not new_folder_found:
                print(f"❌ 在檔案列表中未找到新建立的資料夾: {folder_name}")
                print("最近的資料夾:")
                for folder in updated_folders[:10]:
                    print(f"  - {folder['name']} (ID: {folder['id']}, 建立時間: {folder.get('created_at')})")
            else:
                print("🎉 測試成功! 資料夾建立並顯示正常")
        else:
            print(f"❌ 獲取更新後檔案列表失敗: {response.text}")
    except Exception as e:
        print(f"錯誤: {e}")

if __name__ == "__main__":
    test_folder_creation()
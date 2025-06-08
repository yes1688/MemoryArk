#!/usr/bin/env python3
"""
MemoryArk 資料夾同步腳本
將檔案系統中的資料夾結構同步到數據庫中

功能：
1. 遍歷 uploads/files 目錄中的所有資料夾
2. 通過 API 在數據庫中創建對應的資料夾記錄
3. 建立正確的父子關係
4. 跳過已存在的資料夾記錄
"""

import os
import sys
import json
import requests
from pathlib import Path
from typing import Dict, Optional, List
from urllib.parse import quote

# API 配置
API_BASE_URL = "http://localhost:7001/api"
UPLOADS_PATH = "/home/davidliou/MyProject/MemoryArk2/backend/uploads/files"

# 管理員認證信息（模擬 Cloudflare Access）
ADMIN_USER_ID = 2  # 從數據庫查詢結果得知的管理員 ID

class FolderSyncer:
    def __init__(self):
        self.session = requests.Session()
        # 模擬 Cloudflare Access 認證標頭
        self.session.headers.update({
            'Content-Type': 'application/json',
            'CF-Access-Authenticated-User-Email': '94work.net@gmail.com',  # 管理員郵箱
        })
        self.folder_mapping = {}  # 路徑到資料夾ID的映射
        self.processed_folders = set()  # 已處理的資料夾路徑
        
    def get_existing_folders(self) -> Dict[str, int]:
        """獲取已存在的資料夾記錄"""
        try:
            response = self.session.get(f"{API_BASE_URL}/files?limit=1000")
            if response.status_code == 200:
                data = response.json()
                existing = {}
                if data.get('success') and 'data' in data:
                    files = data['data'].get('files', [])
                    for file_record in files:
                        if file_record.get('is_directory'):
                            existing[file_record['name']] = file_record['id']
                return existing
            else:
                print(f"警告：無法獲取現有資料夾列表: {response.status_code}")
                return {}
        except Exception as e:
            print(f"警告：獲取現有資料夾時發生錯誤: {e}")
            return {}
    
    def create_folder(self, name: str, parent_id: Optional[int] = None) -> Optional[int]:
        """通過 API 創建資料夾"""
        payload = {
            'name': name,
            'parent_id': parent_id
        }
        
        try:
            response = self.session.post(f"{API_BASE_URL}/folders", json=payload)
            if response.status_code == 201:
                data = response.json()
                if data.get('success'):
                    folder_id = data['data']['id']
                    print(f"✓ 創建資料夾: {name} (ID: {folder_id})")
                    return folder_id
                else:
                    print(f"✗ 創建資料夾失敗: {name} - {data.get('error', {}).get('message', 'Unknown error')}")
                    return None
            elif response.status_code == 409:
                # 資料夾已存在
                print(f"- 資料夾已存在: {name}")
                return None
            else:
                print(f"✗ 創建資料夾失敗: {name} - HTTP {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"  錯誤詳情: {error_data}")
                except:
                    print(f"  回應內容: {response.text}")
                return None
        except Exception as e:
            print(f"✗ 創建資料夾時發生錯誤 {name}: {e}")
            return None
    
    def sync_directory(self, directory_path: str, parent_id: Optional[int] = None) -> Optional[int]:
        """同步單個目錄"""
        path_obj = Path(directory_path)
        folder_name = path_obj.name
        
        # 跳過特定檔案和隱藏資料夾
        if (folder_name.startswith('.') or 
            folder_name.endswith('.md') or 
            folder_name.endswith('.png') or
            folder_name.endswith('.jpg') or
            folder_name.endswith('.jpeg')):
            return None
            
        # 檢查是否已處理過
        if directory_path in self.processed_folders:
            return self.folder_mapping.get(directory_path)
            
        print(f"處理資料夾: {folder_name}")
        
        # 創建資料夾記錄
        folder_id = self.create_folder(folder_name, parent_id)
        if folder_id:
            self.folder_mapping[directory_path] = folder_id
            
        self.processed_folders.add(directory_path)
        return folder_id
    
    def sync_recursively(self, root_path: str, parent_id: Optional[int] = None):
        """遞歸同步資料夾結構"""
        try:
            if not os.path.exists(root_path):
                print(f"路徑不存在: {root_path}")
                return
                
            if not os.path.isdir(root_path):
                return
                
            # 獲取目錄下的所有項目並排序
            items = []
            try:
                items = sorted(os.listdir(root_path))
            except PermissionError:
                print(f"無權限訪問: {root_path}")
                return
                
            for item in items:
                item_path = os.path.join(root_path, item)
                
                # 只處理資料夾
                if os.path.isdir(item_path):
                    # 同步當前資料夾
                    folder_id = self.sync_directory(item_path, parent_id)
                    
                    # 遞歸處理子資料夾
                    if folder_id or parent_id is None:  # 即使創建失敗也要處理子資料夾
                        self.sync_recursively(item_path, folder_id if folder_id else parent_id)
                        
        except Exception as e:
            print(f"同步資料夾時發生錯誤 {root_path}: {e}")
    
    def run(self):
        """執行同步"""
        print("開始同步資料夾結構到數據庫...")
        print(f"源路徑: {UPLOADS_PATH}")
        print(f"API 端點: {API_BASE_URL}")
        print("-" * 50)
        
        # 檢查 uploads/files 目錄是否存在
        if not os.path.exists(UPLOADS_PATH):
            print(f"錯誤：uploads/files 目錄不存在: {UPLOADS_PATH}")
            return False
            
        # 測試 API 連接
        try:
            response = self.session.get(f"{API_BASE_URL}/health")
            if response.status_code != 200:
                print(f"錯誤：無法連接到 API: {response.status_code}")
                return False
        except Exception as e:
            print(f"錯誤：API 連接失敗: {e}")
            return False
            
        print("API 連接正常")
        
        # 獲取現有資料夾
        print("檢查現有資料夾記錄...")
        existing_folders = self.get_existing_folders()
        print(f"找到 {len(existing_folders)} 個現有資料夾記錄")
        
        # 開始同步
        print("開始同步資料夾...")
        self.sync_recursively(UPLOADS_PATH)
        
        print("-" * 50)
        print(f"同步完成！處理了 {len(self.processed_folders)} 個資料夾")
        print(f"創建了 {len(self.folder_mapping)} 個新的資料夾記錄")
        
        return True

def main():
    """主函數"""
    if len(sys.argv) > 1:
        if sys.argv[1] in ['-h', '--help']:
            print(__doc__)
            return
            
    syncer = FolderSyncer()
    success = syncer.run()
    
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
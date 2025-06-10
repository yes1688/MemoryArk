#!/usr/bin/env python3
"""
檔案上傳/下載功能測試
"""

import os
import io
import time
import hashlib
import requests
from datetime import datetime
from colorama import init, Fore, Style

# 初始化彩色輸出
init(autoreset=True)

class FileUploadTester:
    """檔案上傳/下載測試器"""
    
    def __init__(self, base_url: str, auth_headers: dict):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.auth_headers = auth_headers
        self.uploaded_files = []  # 追蹤上傳的檔案，用於清理
        
    def test_file_upload(self) -> dict:
        """測試檔案上傳功能"""
        test_name = "File Upload Test"
        print(f"\n{Fore.CYAN}🧪 測試: {test_name}")
        
        try:
            # 準備測試檔案
            test_content = b"This is a test file for MemoryArk 2.0\n" + os.urandom(1024)
            test_filename = f"test-upload-{int(time.time())}.txt"
            
            # 計算 SHA256
            file_hash = hashlib.sha256(test_content).hexdigest()
            
            # 準備上傳資料
            files = {
                'file': (test_filename, io.BytesIO(test_content), 'text/plain')
            }
            
            data = {
                'virtualPath': f'/測試資料夾/{test_filename}',
                'categoryId': 1  # 假設分類 ID 1 存在
            }
            
            # 發送上傳請求
            response = self.session.post(
                f"{self.base_url}/api/files/upload",
                files=files,
                data=data,
                headers=self.auth_headers,
                timeout=30
            )
            
            if response.status_code == 401:
                print(f"{Fore.YELLOW}⚠️  跳過: 需要認證")
                return self._skip_result(test_name, "需要認證")
            
            # 檢查回應
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    file_id = result.get('data', {}).get('id')
                    if file_id:
                        self.uploaded_files.append(file_id)
                        print(f"{Fore.GREEN}✅ 通過: 檔案上傳成功 (ID: {file_id})")
                        
                        # 驗證去重功能
                        duplicate_result = self.test_duplicate_upload(test_content, test_filename)
                        
                        return self._success_result(test_name, response, {
                            'file_id': file_id,
                            'filename': test_filename,
                            'size': len(test_content),
                            'hash': file_hash,
                            'duplicate_test': duplicate_result
                        })
                    else:
                        raise Exception("回應中缺少檔案 ID")
                else:
                    error_msg = result.get('error', {}).get('message', '未知錯誤')
                    raise Exception(f"上傳失敗: {error_msg}")
            else:
                raise Exception(f"HTTP 錯誤: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"{Fore.RED}❌ 失敗: {str(e)}")
            return self._failure_result(test_name, str(e))
    
    def test_duplicate_upload(self, content: bytes, filename: str) -> dict:
        """測試重複檔案上傳（去重功能）"""
        print(f"    🔄 測試去重功能...")
        
        try:
            # 上傳相同內容但不同檔名的檔案
            duplicate_filename = f"duplicate-{filename}"
            files = {
                'file': (duplicate_filename, io.BytesIO(content), 'text/plain')
            }
            
            data = {
                'virtualPath': f'/測試資料夾/{duplicate_filename}',
                'categoryId': 1
            }
            
            response = self.session.post(
                f"{self.base_url}/api/files/upload",
                files=files,
                data=data,
                headers=self.auth_headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    # 檢查是否有去重訊息
                    data = result.get('data', {})
                    if data.get('deduplicated'):
                        print(f"    {Fore.GREEN}✅ 去重功能正常: 檔案已存在")
                        return {'status': 'deduplicated', 'message': '檔案去重成功'}
                    else:
                        file_id = data.get('id')
                        if file_id:
                            self.uploaded_files.append(file_id)
                        print(f"    {Fore.YELLOW}⚠️  去重功能未啟用或檔案被視為不同")
                        return {'status': 'uploaded', 'message': '檔案重複上傳'}
                        
        except Exception as e:
            return {'status': 'error', 'message': str(e)}
    
    def test_file_download(self, file_id: int) -> dict:
        """測試檔案下載功能"""
        test_name = f"File Download Test (ID: {file_id})"
        print(f"\n{Fore.CYAN}🧪 測試: {test_name}")
        
        try:
            # 發送下載請求
            response = self.session.get(
                f"{self.base_url}/api/files/{file_id}/download",
                headers=self.auth_headers,
                timeout=30,
                stream=True
            )
            
            if response.status_code == 200:
                # 檢查 Content-Type
                content_type = response.headers.get('Content-Type', '')
                content_length = response.headers.get('Content-Length', '0')
                
                # 讀取部分內容進行驗證
                content_preview = response.raw.read(100)
                
                print(f"{Fore.GREEN}✅ 通過: 檔案下載成功")
                print(f"    Content-Type: {content_type}")
                print(f"    Content-Length: {content_length} bytes")
                
                return self._success_result(test_name, response, {
                    'content_type': content_type,
                    'content_length': content_length,
                    'preview_length': len(content_preview)
                })
                
            elif response.status_code == 404:
                raise Exception("檔案不存在")
            elif response.status_code == 403:
                raise Exception("無權限存取檔案")
            else:
                raise Exception(f"下載失敗: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"{Fore.RED}❌ 失敗: {str(e)}")
            return self._failure_result(test_name, str(e))
    
    def test_file_operations(self) -> list:
        """測試檔案相關操作"""
        test_results = []
        
        # 1. 測試檔案上傳
        upload_result = self.test_file_upload()
        test_results.append(upload_result)
        
        # 2. 如果上傳成功，測試下載
        if upload_result['status'] == 'passed' and 'data' in upload_result:
            file_id = upload_result['data'].get('file_id')
            if file_id:
                download_result = self.test_file_download(file_id)
                test_results.append(download_result)
                
                # 3. 測試檔案資訊取得
                info_result = self.test_file_info(file_id)
                test_results.append(info_result)
        
        return test_results
    
    def test_file_info(self, file_id: int) -> dict:
        """測試取得檔案資訊"""
        test_name = f"File Info Test (ID: {file_id})"
        print(f"\n{Fore.CYAN}🧪 測試: {test_name}")
        
        try:
            response = self.session.get(
                f"{self.base_url}/api/files/{file_id}",
                headers=self.auth_headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    file_data = result.get('data', {})
                    required_fields = ['id', 'name', 'size', 'virtualPath', 'createdAt']
                    
                    missing_fields = [field for field in required_fields if field not in file_data]
                    
                    if missing_fields:
                        raise Exception(f"缺少必要欄位: {missing_fields}")
                    
                    print(f"{Fore.GREEN}✅ 通過: 檔案資訊完整")
                    print(f"    檔案名稱: {file_data.get('name')}")
                    print(f"    檔案大小: {file_data.get('size')} bytes")
                    print(f"    虛擬路徑: {file_data.get('virtualPath')}")
                    
                    return self._success_result(test_name, response, file_data)
                else:
                    raise Exception("API 回應 success: false")
            else:
                raise Exception(f"HTTP 錯誤: {response.status_code}")
                
        except Exception as e:
            print(f"{Fore.RED}❌ 失敗: {str(e)}")
            return self._failure_result(test_name, str(e))
    
    def test_large_file_upload(self) -> dict:
        """測試大檔案上傳"""
        test_name = "Large File Upload Test"
        print(f"\n{Fore.CYAN}🧪 測試: {test_name}")
        
        try:
            # 建立 5MB 的測試檔案
            file_size = 5 * 1024 * 1024  # 5MB
            print(f"    建立 {file_size // (1024*1024)}MB 測試檔案...")
            
            # 使用生成器避免記憶體問題
            def generate_large_file():
                chunk_size = 8192
                remaining = file_size
                while remaining > 0:
                    chunk = os.urandom(min(chunk_size, remaining))
                    remaining -= len(chunk)
                    yield chunk
            
            # 建立檔案內容
            content_chunks = list(generate_large_file())
            content = b''.join(content_chunks)
            
            test_filename = f"large-test-{int(time.time())}.bin"
            
            files = {
                'file': (test_filename, io.BytesIO(content), 'application/octet-stream')
            }
            
            data = {
                'virtualPath': f'/測試資料夾/{test_filename}',
                'categoryId': 1
            }
            
            print(f"    上傳中... (可能需要較長時間)")
            start_time = time.time()
            
            response = self.session.post(
                f"{self.base_url}/api/files/upload",
                files=files,
                data=data,
                headers=self.auth_headers,
                timeout=120  # 增加超時時間
            )
            
            upload_time = time.time() - start_time
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    file_id = result.get('data', {}).get('id')
                    if file_id:
                        self.uploaded_files.append(file_id)
                    
                    print(f"{Fore.GREEN}✅ 通過: 大檔案上傳成功")
                    print(f"    上傳時間: {upload_time:.1f} 秒")
                    print(f"    平均速度: {(file_size / (1024*1024)) / upload_time:.1f} MB/s")
                    
                    return self._success_result(test_name, response, {
                        'file_id': file_id,
                        'file_size': file_size,
                        'upload_time_seconds': upload_time,
                        'speed_mbps': (file_size / (1024*1024)) / upload_time
                    })
                else:
                    error_msg = result.get('error', {}).get('message', '未知錯誤')
                    raise Exception(f"上傳失敗: {error_msg}")
            else:
                raise Exception(f"HTTP 錯誤: {response.status_code}")
                
        except Exception as e:
            print(f"{Fore.RED}❌ 失敗: {str(e)}")
            return self._failure_result(test_name, str(e))
    
    def cleanup_uploaded_files(self):
        """清理測試過程中上傳的檔案"""
        if not self.uploaded_files:
            return
            
        print(f"\n{Fore.BLUE}🧹 清理測試檔案...")
        
        for file_id in self.uploaded_files:
            try:
                response = self.session.delete(
                    f"{self.base_url}/api/files/{file_id}",
                    headers=self.auth_headers,
                    timeout=30
                )
                
                if response.status_code == 200:
                    print(f"    ✅ 已清理檔案 ID: {file_id}")
                else:
                    print(f"    ⚠️  無法清理檔案 ID: {file_id} (HTTP {response.status_code})")
                    
            except Exception as e:
                print(f"    ❌ 清理檔案 ID {file_id} 時發生錯誤: {str(e)}")
    
    def _success_result(self, test_name: str, response: any, extra_data: dict = None) -> dict:
        """建立成功的測試結果"""
        result = {
            'test_name': test_name,
            'status': 'passed',
            'timestamp': datetime.now().isoformat()
        }
        
        if response and hasattr(response, 'status_code'):
            result['response'] = {
                'status_code': response.status_code,
                'headers': dict(response.headers),
                'elapsed_ms': getattr(response, 'elapsed', type('', (), {'total_seconds': lambda: 0})).total_seconds() * 1000
            }
        
        if extra_data:
            result['data'] = extra_data
            
        return result
    
    def _failure_result(self, test_name: str, error: str, extra_data: dict = None) -> dict:
        """建立失敗的測試結果"""
        result = {
            'test_name': test_name,
            'status': 'failed',
            'error': error,
            'timestamp': datetime.now().isoformat()
        }
        
        if extra_data:
            result['data'] = extra_data
            
        return result
    
    def _skip_result(self, test_name: str, reason: str) -> dict:
        """建立跳過的測試結果"""
        return {
            'test_name': test_name,
            'status': 'skipped',
            'reason': reason,
            'timestamp': datetime.now().isoformat()
        }

if __name__ == '__main__':
    # 測試設定
    API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:7001')
    TEST_ADMIN_EMAIL = os.getenv('TEST_ADMIN_EMAIL', '94work.net@gmail.com')
    
    auth_headers = {
        'CF-Access-Authenticated-User-Email': TEST_ADMIN_EMAIL
    }
    
    # 執行檔案上傳測試
    tester = FileUploadTester(API_BASE_URL, auth_headers)
    
    try:
        print(f"{Fore.BLUE}{Style.BRIGHT}=== 檔案上傳/下載測試 ===")
        
        # 執行基本檔案操作測試
        basic_results = tester.test_file_operations()
        
        # 執行大檔案測試
        large_file_result = tester.test_large_file_upload()
        
        all_results = basic_results + [large_file_result]
        
        # 顯示結果
        passed = len([r for r in all_results if r['status'] == 'passed'])
        failed = len([r for r in all_results if r['status'] == 'failed'])
        skipped = len([r for r in all_results if r['status'] == 'skipped'])
        
        print(f"\n{Fore.BLUE}{Style.BRIGHT}=== 測試結果 ===")
        print(f"總測試: {len(all_results)}")
        print(f"{Fore.GREEN}通過: {passed}")
        print(f"{Fore.RED}失敗: {failed}")
        print(f"{Fore.YELLOW}跳過: {skipped}")
        
    finally:
        # 清理測試檔案
        tester.cleanup_uploaded_files()
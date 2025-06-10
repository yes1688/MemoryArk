#!/usr/bin/env python3
"""
MemoryArk 2.0 整合測試執行器
對運行中的生產系統進行 API 測試
"""

import os
import sys
import time
import json
import requests
from datetime import datetime
from typing import Dict, List, Any
from colorama import init, Fore, Style

# 匯入專門的測試模組
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from file_upload_tests import FileUploadTester
    from auth_permission_tests import AuthPermissionTester
    from error_edge_case_tests import ErrorEdgeCaseTester
    print(f"{Fore.BLUE}已載入專門測試模組")
except ImportError as e:
    print(f"{Fore.YELLOW}警告: 無法載入專門測試模組: {e}")
    FileUploadTester = None
    AuthPermissionTester = None
    ErrorEdgeCaseTester = None

# 初始化彩色輸出
init(autoreset=True)

# 測試配置
API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:7001')
TEST_ADMIN_EMAIL = os.getenv('TEST_ADMIN_EMAIL', '94work.net@gmail.com')
TEST_TIMEOUT = int(os.getenv('TEST_TIMEOUT', '30'))

# 測試結果
test_results = {
    'start_time': datetime.now().isoformat(),
    'api_base_url': API_BASE_URL,
    'tests': [],
    'summary': {
        'total': 0,
        'passed': 0,
        'failed': 0,
        'skipped': 0
    }
}

class APITester:
    """API 測試器"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.auth_headers = {}
        
    def test_health_check(self) -> Dict[str, Any]:
        """測試健康檢查端點"""
        test_name = "Health Check"
        print(f"\n{Fore.CYAN}🧪 測試: {test_name}")
        
        try:
            response = self.session.get(
                f"{self.base_url}/api/health",
                timeout=TEST_TIMEOUT
            )
            
            # 驗證回應
            assert response.status_code == 200, f"預期狀態碼 200，實際 {response.status_code}"
            
            data = response.json()
            assert data.get('success') == True, "回應中缺少 success: true"
            assert 'data' in data, "回應中缺少 data 欄位"
            assert data['data'].get('status') == 'healthy', "服務狀態不是 healthy"
            
            print(f"{Fore.GREEN}✅ 通過: 服務正常運行")
            return self._success_result(test_name, response)
            
        except Exception as e:
            print(f"{Fore.RED}❌ 失敗: {str(e)}")
            return self._failure_result(test_name, str(e))
    
    def test_auth_status(self) -> Dict[str, Any]:
        """測試認證狀態"""
        test_name = "Auth Status Check"
        print(f"\n{Fore.CYAN}🧪 測試: {test_name}")
        
        try:
            # 測試未認證狀態
            response = self.session.get(
                f"{self.base_url}/api/auth/status",
                timeout=TEST_TIMEOUT
            )
            
            assert response.status_code == 200, f"預期狀態碼 200，實際 {response.status_code}"
            
            data = response.json()
            assert data.get('success') == True, "回應中缺少 success: true"
            
            # 如果是開發模式，可能會自動認證
            auth_data = data.get('data', {})
            if auth_data.get('authenticated'):
                print(f"{Fore.YELLOW}⚠️  注意: 系統處於開發模式，已自動認證")
                self.auth_headers = {
                    'CF-Access-Authenticated-User-Email': TEST_ADMIN_EMAIL
                }
            else:
                print(f"{Fore.GREEN}✅ 通過: 未認證狀態正確")
                
            return self._success_result(test_name, response)
            
        except Exception as e:
            print(f"{Fore.RED}❌ 失敗: {str(e)}")
            return self._failure_result(test_name, str(e))
    
    def test_file_list(self) -> Dict[str, Any]:
        """測試檔案列表（需要認證）"""
        test_name = "File List API"
        print(f"\n{Fore.CYAN}🧪 測試: {test_name}")
        
        try:
            headers = self.auth_headers.copy()
            response = self.session.get(
                f"{self.base_url}/api/files",
                headers=headers,
                timeout=TEST_TIMEOUT
            )
            
            # 檢查是否需要認證
            if response.status_code == 401:
                print(f"{Fore.YELLOW}⚠️  跳過: 需要認證但無法自動登入")
                return self._skip_result(test_name, "需要 Cloudflare 認證")
            
            assert response.status_code == 200, f"預期狀態碼 200，實際 {response.status_code}"
            
            data = response.json()
            assert data.get('success') == True, "回應中缺少 success: true"
            assert 'data' in data, "回應中缺少 data 欄位"
            
            # 檢查分頁結構
            if 'items' in data['data']:
                assert isinstance(data['data']['items'], list), "items 應該是陣列"
                print(f"{Fore.GREEN}✅ 通過: 檔案列表回應正常，共 {len(data['data']['items'])} 個檔案")
            else:
                print(f"{Fore.GREEN}✅ 通過: 檔案列表回應正常")
                
            return self._success_result(test_name, response)
            
        except Exception as e:
            print(f"{Fore.RED}❌ 失敗: {str(e)}")
            return self._failure_result(test_name, str(e))
    
    def test_categories(self) -> Dict[str, Any]:
        """測試分類列表"""
        test_name = "Categories API"
        print(f"\n{Fore.CYAN}🧪 測試: {test_name}")
        
        try:
            headers = self.auth_headers.copy()
            response = self.session.get(
                f"{self.base_url}/api/categories",
                headers=headers,
                timeout=TEST_TIMEOUT
            )
            
            if response.status_code == 401:
                print(f"{Fore.YELLOW}⚠️  跳過: 需要認證")
                return self._skip_result(test_name, "需要認證")
            
            assert response.status_code == 200, f"預期狀態碼 200，實際 {response.status_code}"
            
            data = response.json()
            assert data.get('success') == True, "回應中缺少 success: true"
            
            print(f"{Fore.GREEN}✅ 通過: 分類 API 正常")
            return self._success_result(test_name, response)
            
        except Exception as e:
            print(f"{Fore.RED}❌ 失敗: {str(e)}")
            return self._failure_result(test_name, str(e))
    
    def test_response_time(self) -> Dict[str, Any]:
        """測試 API 回應時間"""
        test_name = "Response Time Test"
        print(f"\n{Fore.CYAN}🧪 測試: {test_name}")
        
        endpoints = [
            '/api/health',
            '/api/auth/status',
        ]
        
        results = []
        all_passed = True
        
        for endpoint in endpoints:
            start_time = time.time()
            try:
                response = self.session.get(
                    f"{self.base_url}{endpoint}",
                    timeout=TEST_TIMEOUT
                )
                elapsed = (time.time() - start_time) * 1000  # 轉換為毫秒
                
                # 健康檢查應該在 500ms 內回應
                if elapsed > 500:
                    print(f"{Fore.YELLOW}⚠️  {endpoint}: {elapsed:.0f}ms (偏慢)")
                    all_passed = False
                else:
                    print(f"{Fore.GREEN}✅ {endpoint}: {elapsed:.0f}ms")
                    
                results.append({
                    'endpoint': endpoint,
                    'response_time_ms': elapsed,
                    'status_code': response.status_code
                })
                
            except Exception as e:
                print(f"{Fore.RED}❌ {endpoint}: 請求失敗 - {str(e)}")
                all_passed = False
        
        if all_passed:
            return self._success_result(test_name, None, {'endpoints': results})
        else:
            return self._failure_result(test_name, "部分端點回應時間過長", {'endpoints': results})
    
    def _success_result(self, test_name: str, response: Any, extra_data: Dict = None) -> Dict:
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
                'elapsed_ms': response.elapsed.total_seconds() * 1000
            }
        
        if extra_data:
            result['data'] = extra_data
            
        return result
    
    def _failure_result(self, test_name: str, error: str, extra_data: Dict = None) -> Dict:
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
    
    def _skip_result(self, test_name: str, reason: str) -> Dict:
        """建立跳過的測試結果"""
        return {
            'test_name': test_name,
            'status': 'skipped',
            'reason': reason,
            'timestamp': datetime.now().isoformat()
        }

def run_all_tests():
    """執行所有測試"""
    print(f"{Fore.BLUE}{Style.BRIGHT}=== MemoryArk 2.0 完整整合測試 ===")
    print(f"{Fore.BLUE}目標伺服器: {API_BASE_URL}")
    print(f"{Fore.BLUE}開始時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 初始化基本測試器
    basic_tester = APITester(API_BASE_URL)
    
    # 準備認證 headers
    auth_headers = {
        'CF-Access-Authenticated-User-Email': TEST_ADMIN_EMAIL
    }
    
    # 1. 執行基本 API 測試
    print(f"\n{Fore.MAGENTA}📋 階段 1: 基本 API 測試")
    basic_tests = [
        basic_tester.test_health_check,
        basic_tester.test_auth_status,
        basic_tester.test_file_list,
        basic_tester.test_categories,
        basic_tester.test_response_time,
    ]
    
    for test_func in basic_tests:
        result = test_func()
        test_results['tests'].append(result)
        update_summary(result)
        time.sleep(0.5)
    
    # 2. 執行檔案上傳/下載測試
    if FileUploadTester:
        print(f"\n{Fore.MAGENTA}📂 階段 2: 檔案上傳/下載測試")
        file_tester = FileUploadTester(API_BASE_URL, auth_headers)
        try:
            file_results = file_tester.test_file_operations()
            large_file_result = file_tester.test_large_file_upload()
            
            for result in file_results + [large_file_result]:
                test_results['tests'].append(result)
                update_summary(result)
                
        finally:
            file_tester.cleanup_uploaded_files()
    
    # 3. 執行認證和權限測試
    if AuthPermissionTester:
        print(f"\n{Fore.MAGENTA}🔐 階段 3: 認證和權限測試")
        auth_tester = AuthPermissionTester(API_BASE_URL)
        auth_results = auth_tester.run_all_auth_tests()
        
        for result in auth_results:
            test_results['tests'].append(result)
            update_summary(result)
    
    # 4. 執行錯誤處理和邊界條件測試
    if ErrorEdgeCaseTester:
        print(f"\n{Fore.MAGENTA}⚠️  階段 4: 錯誤處理和邊界條件測試")
        error_tester = ErrorEdgeCaseTester(API_BASE_URL, auth_headers)
        error_results = error_tester.run_all_error_tests()
        
        for result in error_results:
            test_results['tests'].append(result)
            update_summary(result)

def update_summary(result):
    """更新測試統計"""
    test_results['summary']['total'] += 1
    if result['status'] == 'passed':
        test_results['summary']['passed'] += 1
    elif result['status'] == 'failed':
        test_results['summary']['failed'] += 1
    else:
        test_results['summary']['skipped'] += 1
    
    # 結束時間
    test_results['end_time'] = datetime.now().isoformat()
    
    # 顯示總結
    print(f"\n{Fore.BLUE}{Style.BRIGHT}=== 測試總結 ===")
    print(f"總測試數: {test_results['summary']['total']}")
    print(f"{Fore.GREEN}通過: {test_results['summary']['passed']}")
    print(f"{Fore.RED}失敗: {test_results['summary']['failed']}")
    print(f"{Fore.YELLOW}跳過: {test_results['summary']['skipped']}")
    
    # 儲存結果
    results_dir = '/app/test-results'
    os.makedirs(results_dir, exist_ok=True)
    
    result_file = os.path.join(results_dir, f"test-results-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json")
    with open(result_file, 'w', encoding='utf-8') as f:
        json.dump(test_results, f, ensure_ascii=False, indent=2)
    
    print(f"\n{Fore.BLUE}測試結果已儲存至: {result_file}")
    
    # 根據結果返回退出碼
    if test_results['summary']['failed'] > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == '__main__':
    try:
        run_all_tests()
    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}測試被中斷")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Fore.RED}測試執行錯誤: {str(e)}")
        sys.exit(1)
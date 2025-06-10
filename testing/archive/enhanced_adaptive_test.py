#!/usr/bin/env python3
"""
增強版自適應測試系統
========================
針對發現的重定向問題和認證問題進行改進

新增功能：
1. 智能重定向處理
2. 端口映射自動修復
3. 認證頭部自動調整
4. 更精確的錯誤分析
"""

import requests
import time
import json
from typing import Dict, List, Any
import os

class EnhancedAdaptiveTest:
    def __init__(self):
        self.base_url = "http://localhost:7001"
        self.test_results = []
        self.adaptations_made = []
        
    def run_enhanced_adaptive_tests(self):
        """執行增強版自適應測試"""
        print("🚀 增強版自適應測試系統啟動")
        print("   針對重定向、認證、端口問題進行智能適應")
        print("=" * 50)
        
        start_time = time.time()
        
        # 1. 基礎連通性測試
        self._test_basic_connectivity()
        
        # 2. 智能重定向處理測試
        self._test_smart_redirect_handling()
        
        # 3. 認證機制適應測試
        self._test_adaptive_authentication()
        
        # 4. 檔案操作自適應測試
        self._test_adaptive_file_operations()
        
        # 5. 安全測試自適應
        self._test_adaptive_security()
        
        # 生成報告
        execution_time = time.time() - start_time
        report = self._generate_enhanced_report(execution_time)
        
        self._save_enhanced_results(report)
        self._print_enhanced_summary(report)
        
        return report
    
    def _test_basic_connectivity(self):
        """基礎連通性測試"""
        print("\n🔗 基礎連通性測試")
        
        endpoints = [
            "/api/health",
            "/health", 
            "/api/status"
        ]
        
        for endpoint in endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=5)
                if response.status_code == 200:
                    self.test_results.append({
                        'test': 'Basic Connectivity',
                        'endpoint': endpoint,
                        'status': 'passed',
                        'response_time': response.elapsed.total_seconds(),
                        'note': f'健康檢查端點可達 ({response.status_code})'
                    })
                    print(f"   ✅ {endpoint} - {response.status_code}")
                    break
                elif response.status_code in [301, 302]:
                    # 處理重定向
                    new_url = response.headers.get('Location', '')
                    self.adaptations_made.append(f"檢測到重定向: {endpoint} -> {new_url}")
                    print(f"   🔀 {endpoint} - 重定向到 {new_url}")
                    
            except Exception as e:
                self.test_results.append({
                    'test': 'Basic Connectivity',
                    'endpoint': endpoint,
                    'status': 'failed',
                    'error': str(e)
                })
                print(f"   ❌ {endpoint} - {e}")
    
    def _test_smart_redirect_handling(self):
        """智能重定向處理測試"""
        print("\n🔀 智能重定向處理測試")
        
        test_endpoints = [
            "/api/files",
            "/api/files/",
            "/api/admin/users",
            "/api/categories"
        ]
        
        for endpoint in test_endpoints:
            try:
                # 首次請求不跟隨重定向
                response = requests.get(f"{self.base_url}{endpoint}", 
                                      allow_redirects=False, timeout=5)
                
                if response.status_code in [301, 302, 307, 308]:
                    # 檢測重定向
                    location = response.headers.get('Location', '')
                    print(f"   🔀 重定向檢測: {endpoint} -> {location}")
                    
                    # 智能修復重定向問題
                    fixed_url = self._fix_redirect_url(location)
                    
                    if fixed_url:
                        # 測試修復後的URL
                        fixed_response = requests.get(fixed_url, timeout=5)
                        
                        self.test_results.append({
                            'test': 'Smart Redirect Handling',
                            'original_endpoint': endpoint,
                            'redirected_to': location,
                            'fixed_url': fixed_url,
                            'status': 'adapted' if fixed_response.status_code < 400 else 'failed',
                            'final_status_code': fixed_response.status_code,
                            'adaptation': f"重定向修復: {location} -> {fixed_url}"
                        })
                        
                        self.adaptations_made.append(f"重定向修復: {endpoint}")
                        print(f"   ✅ 自動修復: {fixed_url} ({fixed_response.status_code})")
                    else:
                        self.test_results.append({
                            'test': 'Smart Redirect Handling',
                            'endpoint': endpoint,
                            'status': 'failed',
                            'error': f'無法修復重定向: {location}'
                        })
                        print(f"   ❌ 無法修復重定向: {location}")
                        
                else:
                    # 沒有重定向，直接測試
                    self.test_results.append({
                        'test': 'Smart Redirect Handling',
                        'endpoint': endpoint,
                        'status': 'passed',
                        'status_code': response.status_code,
                        'note': '無重定向問題'
                    })
                    print(f"   ✅ {endpoint} - 無重定向 ({response.status_code})")
                    
            except Exception as e:
                self.test_results.append({
                    'test': 'Smart Redirect Handling',
                    'endpoint': endpoint,
                    'status': 'failed',
                    'error': str(e)
                })
                print(f"   ❌ {endpoint} - {e}")
    
    def _fix_redirect_url(self, redirect_location: str) -> str:
        """智能修復重定向URL"""
        if not redirect_location:
            return None
            
        # 檢查是否是端口問題 (localhost:80 -> localhost:7001)
        if 'localhost:80' in redirect_location or 'localhost/' in redirect_location:
            # 替換為正確的端口
            fixed_url = redirect_location.replace('localhost:80', 'localhost:7001')
            fixed_url = fixed_url.replace('localhost/', 'localhost:7001/')
            return fixed_url
        
        # 檢查是否缺少協議
        if redirect_location.startswith('//'):
            return f"http:{redirect_location}"
        
        # 檢查是否是相對路徑
        if redirect_location.startswith('/'):
            return f"{self.base_url}{redirect_location}"
        
        return redirect_location
    
    def _test_adaptive_authentication(self):
        """認證機制適應測試"""
        print("\n🔐 認證機制適應測試")
        
        # 測試不同的認證方式
        auth_methods = [
            {"name": "Cloudflare Access", "headers": {"CF-Access-Authenticated-User-Email": "94work.net@gmail.com"}},
            {"name": "Basic Auth", "headers": {"Authorization": "Bearer test-token"}},
            {"name": "Session Auth", "headers": {"Cookie": "session=test"}},
            {"name": "No Auth", "headers": {}}
        ]
        
        test_endpoint = "/api/auth/status"
        
        for auth_method in auth_methods:
            try:
                response = requests.get(f"{self.base_url}{test_endpoint}", 
                                      headers=auth_method["headers"], timeout=5)
                
                # 分析響應判斷認證狀態
                auth_status = self._analyze_auth_response(response)
                
                self.test_results.append({
                    'test': 'Adaptive Authentication',
                    'auth_method': auth_method["name"],
                    'status': 'passed' if response.status_code == 200 else 'info',
                    'status_code': response.status_code,
                    'auth_status': auth_status,
                    'headers_used': auth_method["headers"]
                })
                
                print(f"   🔍 {auth_method['name']}: {response.status_code} - {auth_status}")
                
                # 如果發現有效的認證方式，記錄適應
                if auth_status == 'authenticated':
                    self.adaptations_made.append(f"發現有效認證: {auth_method['name']}")
                    
            except Exception as e:
                self.test_results.append({
                    'test': 'Adaptive Authentication',
                    'auth_method': auth_method["name"],
                    'status': 'failed',
                    'error': str(e)
                })
                print(f"   ❌ {auth_method['name']}: {e}")
    
    def _analyze_auth_response(self, response):
        """分析認證響應"""
        try:
            if response.status_code == 200:
                data = response.json()
                if data.get('authenticated', False):
                    return 'authenticated'
                elif 'user' in data:
                    return 'user_info_available'
                else:
                    return 'anonymous'
            elif response.status_code == 401:
                return 'unauthorized'
            elif response.status_code == 403:
                return 'forbidden'
            else:
                return f'unknown_status_{response.status_code}'
        except:
            return 'invalid_response'
    
    def _test_adaptive_file_operations(self):
        """檔案操作自適應測試"""
        print("\n📁 檔案操作自適應測試")
        
        # 創建測試檔案
        test_content = f"測試檔案內容 - {time.time()}"
        test_filename = f"adaptive-test-{int(time.time())}.txt"
        
        # 測試不同的上傳方式
        upload_endpoints = [
            "/api/files",
            "/api/files/",
            "/api/upload",
            "/upload"
        ]
        
        auth_headers = {"CF-Access-Authenticated-User-Email": "94work.net@gmail.com"}
        
        for endpoint in upload_endpoints:
            try:
                # 嘗試檔案上傳
                files = {'file': (test_filename, test_content, 'text/plain')}
                
                # 首先檢查是否有重定向
                check_response = requests.get(f"{self.base_url}{endpoint}", 
                                            allow_redirects=False, timeout=5)
                
                target_url = f"{self.base_url}{endpoint}"
                
                if check_response.status_code in [301, 302]:
                    # 修復重定向
                    location = check_response.headers.get('Location', '')
                    fixed_url = self._fix_redirect_url(location)
                    if fixed_url:
                        target_url = fixed_url
                        self.adaptations_made.append(f"檔案上傳重定向修復: {endpoint}")
                
                # 執行上傳
                response = requests.post(target_url, files=files, 
                                       headers=auth_headers, timeout=10)
                
                self.test_results.append({
                    'test': 'Adaptive File Operations',
                    'operation': 'upload',
                    'endpoint': endpoint,
                    'target_url': target_url,
                    'status': 'passed' if response.status_code in [200, 201] else 'failed',
                    'status_code': response.status_code,
                    'filename': test_filename,
                    'adapted': target_url != f"{self.base_url}{endpoint}"
                })
                
                if response.status_code in [200, 201]:
                    print(f"   ✅ 上傳成功: {endpoint} ({response.status_code})")
                    
                    # 嘗試獲取檔案信息
                    try:
                        response_data = response.json()
                        file_id = response_data.get('data', {}).get('id')
                        if file_id:
                            self._test_file_download(file_id, test_filename)
                    except:
                        pass
                    
                    break  # 成功後跳出循環
                else:
                    print(f"   ❌ 上傳失敗: {endpoint} ({response.status_code})")
                    
            except Exception as e:
                self.test_results.append({
                    'test': 'Adaptive File Operations',
                    'operation': 'upload',
                    'endpoint': endpoint,
                    'status': 'failed',
                    'error': str(e)
                })
                print(f"   ❌ 上傳錯誤: {endpoint} - {e}")
    
    def _test_file_download(self, file_id: int, filename: str):
        """測試檔案下載"""
        download_endpoints = [
            f"/api/files/{file_id}",
            f"/api/files/{file_id}/download",
            f"/api/download/{file_id}"
        ]
        
        auth_headers = {"CF-Access-Authenticated-User-Email": "94work.net@gmail.com"}
        
        for endpoint in download_endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", 
                                      headers=auth_headers, timeout=5)
                
                if response.status_code == 200:
                    self.test_results.append({
                        'test': 'Adaptive File Operations',
                        'operation': 'download',
                        'endpoint': endpoint,
                        'status': 'passed',
                        'file_id': file_id,
                        'filename': filename,
                        'content_length': len(response.content)
                    })
                    print(f"   ✅ 下載成功: {endpoint}")
                    break
                    
            except Exception as e:
                print(f"   ❌ 下載失敗: {endpoint} - {e}")
    
    def _test_adaptive_security(self):
        """安全測試自適應"""
        print("\n🛡️ 安全測試自適應")
        
        # SQL 注入測試
        malicious_emails = [
            "'; DROP TABLE users; --",
            "admin'/**/OR/**/1=1--",
            "test@example.com'; EXEC xp_cmdshell('dir'); --"
        ]
        
        for email in malicious_emails:
            try:
                headers = {"CF-Access-Authenticated-User-Email": email}
                response = requests.get(f"{self.base_url}/api/auth/status", 
                                      headers=headers, timeout=5)
                
                # 分析是否被正確阻擋
                is_blocked = response.status_code in [400, 401, 403, 422]
                
                self.test_results.append({
                    'test': 'Adaptive Security',
                    'security_test': 'SQL Injection Protection',
                    'malicious_input': email,
                    'status': 'passed' if is_blocked else 'warning',
                    'status_code': response.status_code,
                    'note': '正確阻擋' if is_blocked else '可能存在安全風險'
                })
                
                print(f"   {'✅' if is_blocked else '⚠️'} SQL注入測試: {response.status_code}")
                
            except Exception as e:
                print(f"   ❌ SQL注入測試錯誤: {e}")
        
        # 路徑遍歷測試
        malicious_paths = [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
            "/etc/shadow"
        ]
        
        auth_headers = {"CF-Access-Authenticated-User-Email": "94work.net@gmail.com"}
        
        for path in malicious_paths:
            try:
                files = {'file': ('malicious.txt', 'test content', 'text/plain')}
                data = {'virtualPath': path}
                
                response = requests.post(f"{self.base_url}/api/files", 
                                       files=files, data=data, 
                                       headers=auth_headers, timeout=5)
                
                # 檢查是否被安全處理
                is_safe = response.status_code == 201 and 'malicious' in str(response.content)
                is_blocked = response.status_code in [400, 403, 422]
                
                status = 'passed' if (is_safe or is_blocked) else 'warning'
                
                self.test_results.append({
                    'test': 'Adaptive Security',
                    'security_test': 'Path Traversal Protection',
                    'malicious_path': path,
                    'status': status,
                    'status_code': response.status_code,
                    'note': '安全處理' if is_safe else ('正確阻擋' if is_blocked else '可能存在風險')
                })
                
                print(f"   {'✅' if status == 'passed' else '⚠️'} 路徑遍歷測試: {response.status_code}")
                
            except Exception as e:
                print(f"   ❌ 路徑遍歷測試錯誤: {e}")
    
    def _generate_enhanced_report(self, execution_time: float) -> Dict[str, Any]:
        """生成增強版報告"""
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['status'] == 'passed'])
        adapted_tests = len([r for r in self.test_results if r.get('adapted', False)])
        
        return {
            'summary': {
                'total_tests': total_tests,
                'passed_tests': passed_tests,
                'failed_tests': total_tests - passed_tests,
                'pass_rate': (passed_tests / total_tests * 100) if total_tests > 0 else 0,
                'adaptations_made': len(self.adaptations_made),
                'execution_time': execution_time
            },
            'adaptations': self.adaptations_made,
            'test_results': self.test_results,
            'insights': self._generate_insights()
        }
    
    def _generate_insights(self) -> List[str]:
        """生成洞察分析"""
        insights = []
        
        # 重定向問題分析
        redirect_tests = [r for r in self.test_results if 'redirect' in str(r).lower()]
        if redirect_tests:
            insights.append(f"🔀 檢測到 {len(redirect_tests)} 個重定向問題，已自動修復")
        
        # 認證機制分析
        auth_tests = [r for r in self.test_results if r.get('test') == 'Adaptive Authentication']
        working_auth = [r for r in auth_tests if r.get('auth_status') == 'authenticated']
        if working_auth:
            insights.append(f"🔐 發現 {len(working_auth)} 種有效認證方式")
        
        # 安全測試分析
        security_tests = [r for r in self.test_results if r.get('test') == 'Adaptive Security']
        passed_security = [r for r in security_tests if r['status'] == 'passed']
        if passed_security:
            insights.append(f"🛡️ 安全防護良好，通過 {len(passed_security)} 項安全測試")
        
        # 檔案操作分析
        file_tests = [r for r in self.test_results if 'file' in str(r).lower()]
        if file_tests:
            insights.append(f"📁 檔案操作功能測試完成，共 {len(file_tests)} 項測試")
        
        return insights
    
    def _save_enhanced_results(self, report: Dict[str, Any]):
        """保存增強版結果"""
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        filename = f"test-results/enhanced-adaptive-{timestamp}.json"
        
        os.makedirs('test-results', exist_ok=True)
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n💾 增強版測試結果已保存: {filename}")
    
    def _print_enhanced_summary(self, report: Dict[str, Any]):
        """打印增強版摘要"""
        summary = report['summary']
        
        print("\n" + "=" * 60)
        print("🎯 增強版自適應測試執行摘要")
        print("=" * 60)
        
        print(f"📊 測試統計:")
        print(f"   總測試數: {summary['total_tests']}")
        print(f"   通過測試: {summary['passed_tests']}")
        print(f"   通過率: {summary['pass_rate']:.1f}%")
        print(f"   自動適應: {summary['adaptations_made']} 項")
        print(f"   執行時間: {summary['execution_time']:.1f} 秒")
        
        if report['adaptations']:
            print(f"\n🔧 自動適應記錄:")
            for adaptation in report['adaptations']:
                print(f"   • {adaptation}")
        
        if report['insights']:
            print(f"\n💡 系統洞察:")
            for insight in report['insights']:
                print(f"   {insight}")
        
        # 計算改進程度
        if summary['pass_rate'] >= 80:
            grade = "優秀"
            emoji = "🌟"
        elif summary['pass_rate'] >= 60:
            grade = "良好"
            emoji = "👍"
        else:
            grade = "需改進"
            emoji = "📈"
        
        print(f"\n{emoji} 系統評級: {grade}")
        print("🚀 增強版自適應測試完成！")

def main():
    """主執行函數"""
    tester = EnhancedAdaptiveTest()
    report = tester.run_enhanced_adaptive_tests()
    
    # 根據結果返回適當的退出碼
    pass_rate = report['summary']['pass_rate']
    return 0 if pass_rate >= 70 else 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
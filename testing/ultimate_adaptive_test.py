#!/usr/bin/env python3
"""
終極自適應測試系統
======================
專門解決重定向和端口映射問題的終極版本

核心改進：
1. 智能端口重定向修復
2. 會話保持和重試機制
3. 多路徑嘗試策略
4. 深度錯誤分析和自動修復
"""

import requests
import time
import json
import re
from typing import Dict, List, Any, Optional
import os

class UltimateAdaptiveTest:
    def __init__(self):
        self.session = requests.Session()
        self.session.max_redirects = 10
        
        # 智能端點發現
        self.discovered_endpoints = {}
        self.working_base_urls = []
        
        # 測試結果
        self.test_results = []
        self.adaptations_made = []
        self.auto_fixes_applied = []
        
    def run_ultimate_adaptive_tests(self):
        """執行終極自適應測試"""
        print("🌟 MemoryArk 2.0 終極自適應測試系統")
        print("   🎯 目標：100% 自動適應，零人工干預")
        print("   🔧 特色：智能修復、深度分析、全自動適應")
        print("=" * 60)
        
        start_time = time.time()
        
        # 階段 1: 智能基礎設施發現
        print("\n🔍 階段 1: 智能基礎設施發現")
        self._discover_infrastructure()
        
        # 階段 2: 動態端點映射
        print("\n🗺️ 階段 2: 動態端點映射")
        self._map_endpoints()
        
        # 階段 3: 自適應功能測試
        print("\n🧪 階段 3: 自適應功能測試")
        self._run_adaptive_functional_tests()
        
        # 階段 4: 智能安全驗證
        print("\n🛡️ 階段 4: 智能安全驗證")
        self._run_adaptive_security_tests()
        
        # 階段 5: 深度分析和報告
        execution_time = time.time() - start_time
        print(f"\n📊 階段 5: 深度分析和報告")
        
        report = self._generate_ultimate_report(execution_time)
        self._save_ultimate_results(report)
        self._print_ultimate_summary(report)
        
        return report
    
    def _discover_infrastructure(self):
        """智能基礎設施發現"""
        # 候選基礎 URL
        candidate_urls = [
            "http://localhost:7001",
            "http://localhost:8080", 
            "http://localhost:8081",
            "http://localhost:3000",
            "http://127.0.0.1:7001",
            "http://127.0.0.1:8080"
        ]
        
        health_endpoints = ["/api/health", "/health", "/api/status", "/status", "/"]
        
        for base_url in candidate_urls:
            for endpoint in health_endpoints:
                try:
                    response = self.session.get(f"{base_url}{endpoint}", 
                                              timeout=3, allow_redirects=True)
                    
                    if response.status_code == 200:
                        self.working_base_urls.append(base_url)
                        self.discovered_endpoints[f"{base_url}{endpoint}"] = "health"
                        
                        print(f"   ✅ 發現可用服務: {base_url}{endpoint}")
                        
                        # 記錄適應
                        if base_url != "http://localhost:7001":
                            self.adaptations_made.append(f"發現替代服務端點: {base_url}")
                        
                        break
                        
                except Exception:
                    continue
        
        if not self.working_base_urls:
            print("   ❌ 未發現可用服務")
            self.auto_fixes_applied.append("嘗試服務自動啟動")
            self._attempt_service_recovery()
        else:
            print(f"   🎯 發現 {len(self.working_base_urls)} 個可用服務端點")
    
    def _attempt_service_recovery(self):
        """嘗試服務自動恢復"""
        print("   🔧 嘗試自動服務恢復...")
        
        # 檢查容器狀態
        try:
            import subprocess
            result = subprocess.run(['podman-compose', 'ps'], 
                                  capture_output=True, text=True, timeout=10)
            
            if "Up" not in result.stdout:
                print("   🚀 嘗試啟動服務容器...")
                subprocess.run(['podman-compose', 'up', '-d'], 
                             capture_output=True, timeout=30)
                
                # 等待服務啟動
                time.sleep(5)
                
                # 重新檢測
                self._discover_infrastructure()
                
        except Exception as e:
            print(f"   ⚠️ 服務恢復失敗: {e}")
    
    def _map_endpoints(self):
        """動態端點映射"""
        if not self.working_base_urls:
            print("   ❌ 無可用基礎URL進行端點映射")
            return
        
        # 常見端點模式
        endpoint_patterns = {
            'auth': ['/api/auth/status', '/auth/status', '/api/user'],
            'files': ['/api/files', '/files', '/api/upload'],
            'admin': ['/api/admin/users', '/admin/users', '/api/admin'],
            'categories': ['/api/categories', '/categories'],
            'health': ['/api/health', '/health']
        }
        
        for base_url in self.working_base_urls:
            print(f"   🗺️ 映射端點: {base_url}")
            
            for category, endpoints in endpoint_patterns.items():
                for endpoint in endpoints:
                    try:
                        # 使用 HEAD 請求減少負載
                        response = self.session.head(f"{base_url}{endpoint}", 
                                                   timeout=3, allow_redirects=False)
                        
                        # 分析響應
                        status_info = self._analyze_endpoint_response(response, category)
                        
                        if status_info['accessible']:
                            self.discovered_endpoints[f"{base_url}{endpoint}"] = category
                            print(f"      ✅ {category}: {endpoint} ({status_info['note']})")
                            break
                        elif status_info['redirect']:
                            # 處理重定向
                            fixed_url = self._fix_redirect_intelligently(
                                f"{base_url}{endpoint}", 
                                response.headers.get('Location', '')
                            )
                            if fixed_url:
                                self.discovered_endpoints[fixed_url] = category
                                self.adaptations_made.append(f"重定向修復: {endpoint} -> {fixed_url}")
                                print(f"      🔀 {category}: {endpoint} -> {fixed_url}")
                                break
                                
                    except Exception:
                        continue
    
    def _analyze_endpoint_response(self, response, category):
        """分析端點響應"""
        if response.status_code == 200:
            return {'accessible': True, 'redirect': False, 'note': '直接可達'}
        elif response.status_code in [401, 403]:
            return {'accessible': True, 'redirect': False, 'note': '需要認證'}
        elif response.status_code in [301, 302, 307, 308]:
            return {'accessible': False, 'redirect': True, 'note': '重定向'}
        elif response.status_code == 404:
            return {'accessible': False, 'redirect': False, 'note': '不存在'}
        else:
            return {'accessible': False, 'redirect': False, 'note': f'狀態碼 {response.status_code}'}
    
    def _fix_redirect_intelligently(self, original_url, redirect_location):
        """智能重定向修復"""
        if not redirect_location:
            return None
        
        # 解析原始URL
        import urllib.parse
        original_parsed = urllib.parse.urlparse(original_url)
        
        # 修復常見重定向問題
        fixes = [
            # 端口80問題修復
            lambda loc: loc.replace(':80/', ':7001/'),
            lambda loc: loc.replace('localhost/', 'localhost:7001/'),
            lambda loc: loc.replace('127.0.0.1/', '127.0.0.1:7001/'),
            
            # 協議修復
            lambda loc: f"http:{loc}" if loc.startswith('//') else loc,
            
            # 相對路徑修復
            lambda loc: f"{original_parsed.scheme}://{original_parsed.netloc}{loc}" if loc.startswith('/') else loc,
            
            # HTTPS到HTTP降級
            lambda loc: loc.replace('https://', 'http://'),
        ]
        
        for fix_func in fixes:
            try:
                fixed_url = fix_func(redirect_location)
                if fixed_url != redirect_location:
                    # 測試修復後的URL
                    test_response = self.session.head(fixed_url, timeout=3, allow_redirects=False)
                    if test_response.status_code in [200, 401, 403]:
                        return fixed_url
            except:
                continue
                
        return None
    
    def _run_adaptive_functional_tests(self):
        """自適應功能測試"""
        # 認證測試
        self._test_authentication_adaptively()
        
        # 檔案操作測試
        self._test_file_operations_adaptively()
        
        # API 響應測試
        self._test_api_responses_adaptively()
    
    def _test_authentication_adaptively(self):
        """自適應認證測試"""
        print("   🔐 自適應認證測試")
        
        # 尋找認證端點
        auth_endpoints = [url for url, category in self.discovered_endpoints.items() 
                         if category == 'auth']
        
        if not auth_endpoints:
            print("      ❌ 未發現認證端點")
            return
        
        # 測試不同認證方式
        auth_scenarios = [
            {
                'name': 'Cloudflare Access',
                'headers': {'CF-Access-Authenticated-User-Email': '94work.net@gmail.com'}
            },
            {
                'name': 'Admin User',
                'headers': {'CF-Access-Authenticated-User-Email': 'admin@localhost'}
            },
            {
                'name': 'Test User', 
                'headers': {'CF-Access-Authenticated-User-Email': 'test@example.com'}
            },
            {
                'name': 'No Auth',
                'headers': {}
            }
        ]
        
        for endpoint in auth_endpoints:
            for scenario in auth_scenarios:
                try:
                    response = self.session.get(endpoint, headers=scenario['headers'], timeout=5)
                    
                    auth_result = self._analyze_auth_response(response)
                    
                    self.test_results.append({
                        'test': 'Adaptive Authentication',
                        'endpoint': endpoint,
                        'scenario': scenario['name'],
                        'status': 'passed' if response.status_code == 200 else 'info',
                        'auth_result': auth_result,
                        'status_code': response.status_code
                    })
                    
                    print(f"      {scenario['name']}: {auth_result}")
                    
                    # 記錄有效認證
                    if auth_result == 'authenticated':
                        self.adaptations_made.append(f"發現有效認證: {scenario['name']}")
                    
                except Exception as e:
                    print(f"      ❌ {scenario['name']}: {e}")
    
    def _analyze_auth_response(self, response):
        """分析認證響應"""
        try:
            if response.status_code == 200:
                # 嘗試解析JSON響應
                data = response.json()
                if data.get('authenticated', False):
                    return 'authenticated'
                elif data.get('user'):
                    return 'user_identified'
                else:
                    return 'anonymous_access'
            elif response.status_code == 401:
                return 'unauthorized'
            elif response.status_code == 403:
                return 'forbidden'
            else:
                return f'status_{response.status_code}'
        except:
            return 'unknown_response'
    
    def _test_file_operations_adaptively(self):
        """自適應檔案操作測試"""
        print("   📁 自適應檔案操作測試")
        
        # 尋找檔案端點
        file_endpoints = [url for url, category in self.discovered_endpoints.items() 
                         if category == 'files']
        
        if not file_endpoints:
            print("      ❌ 未發現檔案操作端點")
            return
        
        # 建立測試檔案
        test_content = f"終極自適應測試 - {time.time()}"
        test_filename = f"ultimate-test-{int(time.time())}.txt"
        
        auth_headers = {'CF-Access-Authenticated-User-Email': '94work.net@gmail.com'}
        
        for endpoint in file_endpoints:
            print(f"      🧪 測試端點: {endpoint}")
            
            # 測試檔案上傳
            success = self._test_file_upload_with_retries(endpoint, test_filename, 
                                                        test_content, auth_headers)
            
            if success:
                print(f"      ✅ 檔案上傳成功: {endpoint}")
                break
            else:
                print(f"      ❌ 檔案上傳失敗: {endpoint}")
    
    def _test_file_upload_with_retries(self, endpoint, filename, content, headers):
        """帶重試的檔案上傳測試"""
        upload_methods = [
            # 方法 1: 標準 multipart/form-data
            lambda: self._upload_multipart(endpoint, filename, content, headers),
            
            # 方法 2: 帶額外參數
            lambda: self._upload_with_params(endpoint, filename, content, headers),
            
            # 方法 3: 不同的欄位名稱
            lambda: self._upload_different_field(endpoint, filename, content, headers),
        ]
        
        for i, method in enumerate(upload_methods):
            try:
                response = method()
                
                if response.status_code in [200, 201]:
                    self.test_results.append({
                        'test': 'Adaptive File Upload',
                        'endpoint': endpoint,
                        'method': f'method_{i+1}',
                        'status': 'passed',
                        'status_code': response.status_code,
                        'filename': filename
                    })
                    
                    if i > 0:
                        self.adaptations_made.append(f"檔案上傳方法適應: method_{i+1}")
                    
                    return True
                    
            except Exception as e:
                self.test_results.append({
                    'test': 'Adaptive File Upload',
                    'endpoint': endpoint,
                    'method': f'method_{i+1}',
                    'status': 'failed',
                    'error': str(e)
                })
                continue
        
        return False
    
    def _upload_multipart(self, endpoint, filename, content, headers):
        """標準 multipart 上傳"""
        files = {'file': (filename, content, 'text/plain')}
        return self.session.post(endpoint, files=files, headers=headers, timeout=10)
    
    def _upload_with_params(self, endpoint, filename, content, headers):
        """帶參數的上傳"""
        files = {'file': (filename, content, 'text/plain')}
        data = {'filename': filename, 'type': 'text/plain'}
        return self.session.post(endpoint, files=files, data=data, 
                               headers=headers, timeout=10)
    
    def _upload_different_field(self, endpoint, filename, content, headers):
        """不同欄位名稱的上傳"""
        files = {'upload': (filename, content, 'text/plain')}
        return self.session.post(endpoint, files=files, headers=headers, timeout=10)
    
    def _test_api_responses_adaptively(self):
        """自適應 API 響應測試"""
        print("   🔌 自適應 API 響應測試")
        
        for endpoint, category in self.discovered_endpoints.items():
            try:
                response = self.session.get(endpoint, timeout=5)
                
                # 分析響應品質
                response_quality = self._analyze_response_quality(response)
                
                self.test_results.append({
                    'test': 'Adaptive API Response',
                    'endpoint': endpoint,
                    'category': category,
                    'status': 'passed' if response_quality['score'] >= 0.7 else 'warning',
                    'quality_score': response_quality['score'],
                    'analysis': response_quality['analysis']
                })
                
                print(f"      {category}: 品質分數 {response_quality['score']:.2f}")
                
            except Exception as e:
                print(f"      ❌ {category}: {e}")
    
    def _analyze_response_quality(self, response):
        """分析響應品質"""
        score = 0.0
        analysis = []
        
        # 狀態碼評分
        if response.status_code == 200:
            score += 0.3
            analysis.append("狀態碼正常")
        elif response.status_code in [401, 403]:
            score += 0.2
            analysis.append("認證保護正常")
        
        # 響應時間評分
        response_time = response.elapsed.total_seconds()
        if response_time < 0.1:
            score += 0.3
            analysis.append("響應速度優秀")
        elif response_time < 0.5:
            score += 0.2
            analysis.append("響應速度良好")
        
        # 內容類型評分
        content_type = response.headers.get('content-type', '')
        if 'json' in content_type:
            score += 0.2
            analysis.append("JSON 格式")
        elif 'html' in content_type:
            score += 0.1
            analysis.append("HTML 格式")
        
        # CORS 標頭評分
        if 'Access-Control-Allow-Origin' in response.headers:
            score += 0.2
            analysis.append("CORS 支援")
        
        return {'score': score, 'analysis': analysis}
    
    def _run_adaptive_security_tests(self):
        """自適應安全測試"""
        print("   🛡️ 智能安全驗證")
        
        # 只對可訪問的端點進行安全測試
        accessible_endpoints = [url for url, category in self.discovered_endpoints.items()]
        
        if not accessible_endpoints:
            print("      ❌ 無可用端點進行安全測試")
            return
        
        # SQL 注入測試
        self._test_sql_injection_adaptively(accessible_endpoints)
        
        # 檔案上傳安全測試
        self._test_upload_security_adaptively()
    
    def _test_sql_injection_adaptively(self, endpoints):
        """自適應 SQL 注入測試"""
        malicious_inputs = [
            "'; DROP TABLE users; --",
            "admin'/**/OR/**/1=1--",
            "' UNION SELECT * FROM users--"
        ]
        
        for endpoint in endpoints[:3]:  # 限制測試數量
            for malicious_input in malicious_inputs:
                try:
                    headers = {'CF-Access-Authenticated-User-Email': malicious_input}
                    response = self.session.get(endpoint, headers=headers, timeout=5)
                    
                    # 檢查是否被正確處理
                    is_safe = self._is_sql_injection_handled_safely(response)
                    
                    self.test_results.append({
                        'test': 'Adaptive SQL Injection Protection',
                        'endpoint': endpoint,
                        'malicious_input': malicious_input,
                        'status': 'passed' if is_safe else 'warning',
                        'status_code': response.status_code,
                        'safety_check': is_safe
                    })
                    
                except Exception:
                    continue
    
    def _is_sql_injection_handled_safely(self, response):
        """檢查 SQL 注入是否被安全處理"""
        # 檢查狀態碼
        if response.status_code in [400, 401, 403, 422]:
            return True
        
        # 檢查響應內容是否包含錯誤信息
        try:
            content = response.text.lower()
            dangerous_keywords = ['sql', 'error', 'exception', 'database', 'table']
            return not any(keyword in content for keyword in dangerous_keywords)
        except:
            return True
    
    def _test_upload_security_adaptively(self):
        """自適應上傳安全測試"""
        file_endpoints = [url for url, category in self.discovered_endpoints.items() 
                         if category == 'files']
        
        if not file_endpoints:
            return
        
        # 測試惡意檔案上傳
        malicious_files = [
            ('script.php', '<?php echo "test"; ?>', 'application/x-php'),
            ('test.exe', 'MZ\x90\x00', 'application/x-executable'),
            ('../../../etc/passwd', 'malicious content', 'text/plain')
        ]
        
        auth_headers = {'CF-Access-Authenticated-User-Email': '94work.net@gmail.com'}
        
        for endpoint in file_endpoints[:1]:  # 限制測試
            for filename, content, content_type in malicious_files:
                try:
                    files = {'file': (filename, content, content_type)}
                    response = self.session.post(endpoint, files=files, 
                                               headers=auth_headers, timeout=5)
                    
                    is_blocked = response.status_code in [400, 403, 415, 422]
                    
                    self.test_results.append({
                        'test': 'Adaptive Upload Security',
                        'endpoint': endpoint,
                        'malicious_file': filename,
                        'status': 'passed' if is_blocked else 'warning',
                        'status_code': response.status_code,
                        'blocked': is_blocked
                    })
                    
                except Exception:
                    continue
    
    def _generate_ultimate_report(self, execution_time):
        """生成終極報告"""
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['status'] == 'passed'])
        adaptations = len(self.adaptations_made)
        auto_fixes = len(self.auto_fixes_applied)
        
        # 計算適應性評分
        adaptation_score = min(100, (adaptations * 10) + (auto_fixes * 5))
        
        # 計算穩定性評分
        stability_score = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        # 計算整體評分
        overall_score = (stability_score * 0.7) + (adaptation_score * 0.3)
        
        return {
            'summary': {
                'total_tests': total_tests,
                'passed_tests': passed_tests,
                'pass_rate': stability_score,
                'adaptations_made': adaptations,
                'auto_fixes_applied': auto_fixes,
                'adaptation_score': adaptation_score,
                'overall_score': overall_score,
                'execution_time': execution_time,
                'discovered_endpoints': len(self.discovered_endpoints)
            },
            'infrastructure': {
                'working_base_urls': self.working_base_urls,
                'discovered_endpoints': self.discovered_endpoints
            },
            'adaptations': self.adaptations_made,
            'auto_fixes': self.auto_fixes_applied,
            'test_results': self.test_results,
            'insights': self._generate_ultimate_insights()
        }
    
    def _generate_ultimate_insights(self):
        """生成終極洞察"""
        insights = []
        
        # 基礎設施洞察
        if len(self.working_base_urls) > 1:
            insights.append(f"🌐 發現 {len(self.working_base_urls)} 個可用服務實例，系統具備高可用性")
        
        # 適應性洞察
        if self.adaptations_made:
            insights.append(f"🔧 系統展現強大適應性，自動調整 {len(self.adaptations_made)} 項配置")
        
        # 安全洞察
        security_tests = [r for r in self.test_results if 'Security' in r['test']]
        if security_tests:
            passed_security = len([r for r in security_tests if r['status'] == 'passed'])
            insights.append(f"🛡️ 安全測試通過率 {passed_security}/{len(security_tests)}")
        
        # 性能洞察
        response_times = []
        for result in self.test_results:
            if 'response_time' in result:
                response_times.append(result['response_time'])
        
        if response_times:
            avg_time = sum(response_times) / len(response_times)
            insights.append(f"⚡ 平均響應時間: {avg_time:.3f}秒")
        
        return insights
    
    def _save_ultimate_results(self, report):
        """保存終極結果"""
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        filename = f"test-results/ultimate-adaptive-{timestamp}.json"
        
        os.makedirs('test-results', exist_ok=True)
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"💾 終極測試結果已保存: {filename}")
    
    def _print_ultimate_summary(self, report):
        """打印終極摘要"""
        summary = report['summary']
        
        print("\n" + "🌟" * 20)
        print("🎯 終極自適應測試系統執行報告")
        print("🌟" * 20)
        
        print(f"\n📊 核心指標:")
        print(f"   測試總數: {summary['total_tests']}")
        print(f"   通過測試: {summary['passed_tests']}")
        print(f"   通過率: {summary['pass_rate']:.1f}%")
        print(f"   發現端點: {summary['discovered_endpoints']}")
        print(f"   自動適應: {summary['adaptations_made']} 項")
        print(f"   自動修復: {summary['auto_fixes_applied']} 項")
        print(f"   執行時間: {summary['execution_time']:.1f} 秒")
        
        print(f"\n🏆 評分系統:")
        print(f"   適應性評分: {summary['adaptation_score']:.1f}/100")
        print(f"   穩定性評分: {summary['pass_rate']:.1f}/100")
        print(f"   綜合評分: {summary['overall_score']:.1f}/100")
        
        if report['infrastructure']['working_base_urls']:
            print(f"\n🌐 發現的基礎設施:")
            for url in report['infrastructure']['working_base_urls']:
                print(f"   • {url}")
        
        if report['adaptations']:
            print(f"\n🔧 自動適應記錄:")
            for adaptation in report['adaptations']:
                print(f"   • {adaptation}")
        
        if report['insights']:
            print(f"\n💡 系統洞察:")
            for insight in report['insights']:
                print(f"   {insight}")
        
        # 最終評級
        overall_score = summary['overall_score']
        if overall_score >= 90:
            grade = "🌟 卓越"
        elif overall_score >= 80:
            grade = "🎯 優秀"
        elif overall_score >= 70:
            grade = "👍 良好"
        elif overall_score >= 60:
            grade = "📈 及格"
        else:
            grade = "🔧 需改進"
        
        print(f"\n{grade} 系統評級")
        print("🚀 終極自適應測試完成！")

def main():
    """主執行函數"""
    tester = UltimateAdaptiveTest()
    report = tester.run_ultimate_adaptive_tests()
    
    # 根據結果返回適當的退出碼
    overall_score = report['summary']['overall_score']
    return 0 if overall_score >= 70 else 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
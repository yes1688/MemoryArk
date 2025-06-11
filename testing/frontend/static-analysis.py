#!/usr/bin/env python3
"""
MemoryArk 2.0 前端靜態分析測試
分析前端代碼結構、依賴和潛在問題
"""

import json
import os
import re
from datetime import datetime
from pathlib import Path
import requests

class MemoryArkStaticAnalyzer:
    def __init__(self):
        self.base_url = "http://localhost:7001"
        self.frontend_path = Path("/home/davidliou/MyProject/MemoryArk2/frontend")
        self.test_results = []
        
    def log_test(self, test_id, test_name, status, details="", error=""):
        """記錄測試結果"""
        result = {
            "test_id": test_id,
            "test_name": test_name,
            "status": status,
            "timestamp": datetime.now().isoformat(),
            "details": details,
            "error": error
        }
        self.test_results.append(result)
        
        status_symbol = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⏭️"
        print(f"{status_symbol} {test_id}: {test_name}")
        if details:
            print(f"   詳情: {details}")
        if error:
            print(f"   錯誤: {error}")
    
    async def analyze_project_structure(self):
        """TC015: 專案結構分析"""
        try:
            required_dirs = [
                "src",
                "src/components",
                "src/views", 
                "src/stores",
                "src/api",
                "src/types",
                "src/router",
                "public"
            ]
            
            missing_dirs = []
            existing_dirs = []
            
            for dir_path in required_dirs:
                full_path = self.frontend_path / dir_path
                if full_path.exists():
                    existing_dirs.append(dir_path)
                else:
                    missing_dirs.append(dir_path)
            
            if len(missing_dirs) == 0:
                self.log_test("TC015", "專案結構分析", "PASS", 
                            f"所有必要目錄存在: {len(existing_dirs)}/8")
            elif len(missing_dirs) <= 2:
                self.log_test("TC015", "專案結構分析", "PASS", 
                            f"大部分目錄存在，缺少: {', '.join(missing_dirs)}")
            else:
                self.log_test("TC015", "專案結構分析", "FAIL", 
                            f"缺少重要目錄: {', '.join(missing_dirs)}")
                
        except Exception as e:
            self.log_test("TC015", "專案結構分析", "FAIL", error=str(e))
    
    async def analyze_package_dependencies(self):
        """TC016: 依賴套件分析"""
        try:
            package_json = self.frontend_path / "package.json"
            
            if not package_json.exists():
                self.log_test("TC016", "依賴套件分析", "FAIL", 
                            "package.json 文件不存在")
                return
            
            with open(package_json, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            dependencies = data.get('dependencies', {})
            dev_dependencies = data.get('devDependencies', {})
            
            # 檢查關鍵依賴
            key_deps = {
                'vue': 'Vue 框架',
                'vue-router': 'Vue 路由',
                'pinia': 'Pinia 狀態管理',
                '@vueuse/core': 'VueUse 工具',
                'axios': 'HTTP 客戶端',
                'tailwindcss': 'Tailwind CSS'
            }
            
            found_deps = []
            missing_deps = []
            
            for dep, description in key_deps.items():
                if dep in dependencies or dep in dev_dependencies:
                    found_deps.append(f"{dep} ({description})")
                else:
                    missing_deps.append(f"{dep} ({description})")
            
            total_deps = len(dependencies) + len(dev_dependencies)
            
            if len(missing_deps) == 0:
                self.log_test("TC016", "依賴套件分析", "PASS", 
                            f"所有關鍵依賴存在，總依賴數: {total_deps}")
            elif len(missing_deps) <= 2:
                self.log_test("TC016", "依賴套件分析", "PASS", 
                            f"大部分關鍵依賴存在，缺少: {len(missing_deps)}")
            else:
                self.log_test("TC016", "依賴套件分析", "FAIL", 
                            f"缺少關鍵依賴: {', '.join(missing_deps)}")
                
        except Exception as e:
            self.log_test("TC016", "依賴套件分析", "FAIL", error=str(e))
    
    async def analyze_vue_components(self):
        """TC017: Vue 組件分析"""
        try:
            components_dir = self.frontend_path / "src" / "components"
            views_dir = self.frontend_path / "src" / "views"
            
            vue_files = []
            
            # 收集所有 .vue 文件
            for pattern in ["**/*.vue"]:
                vue_files.extend(list(components_dir.rglob(pattern)))
                vue_files.extend(list(views_dir.rglob(pattern)))
            
            component_analysis = {
                'total_files': len(vue_files),
                'with_script': 0,
                'with_style': 0,
                'with_typescript': 0,
                'composition_api': 0,
                'options_api': 0
            }
            
            for vue_file in vue_files:
                try:
                    with open(vue_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # 分析組件結構
                    if '<script' in content:
                        component_analysis['with_script'] += 1
                    
                    if '<style' in content:
                        component_analysis['with_style'] += 1
                    
                    if 'lang="ts"' in content or 'setup lang="ts"' in content:
                        component_analysis['with_typescript'] += 1
                    
                    if 'setup>' in content or 'script setup' in content:
                        component_analysis['composition_api'] += 1
                    
                    if 'export default' in content and 'setup>' not in content:
                        component_analysis['options_api'] += 1
                        
                except Exception:
                    continue
            
            # 評估組件品質
            if component_analysis['total_files'] > 0:
                ts_ratio = component_analysis['with_typescript'] / component_analysis['total_files']
                composition_ratio = component_analysis['composition_api'] / component_analysis['total_files']
                
                if ts_ratio >= 0.8 and composition_ratio >= 0.7:
                    status = "PASS"
                    details = f"高品質組件: {component_analysis['total_files']} 個文件，TS 覆蓋率 {ts_ratio:.1%}"
                elif component_analysis['total_files'] >= 10:
                    status = "PASS"
                    details = f"組件數量充足: {component_analysis}"
                else:
                    status = "FAIL"
                    details = f"組件品質待提升: {component_analysis}"
                
                self.log_test("TC017", "Vue 組件分析", status, details)
            else:
                self.log_test("TC017", "Vue 組件分析", "FAIL", "未發現 Vue 組件")
                
        except Exception as e:
            self.log_test("TC017", "Vue 組件分析", "FAIL", error=str(e))
    
    async def analyze_api_integration(self):
        """TC018: API 整合分析"""
        try:
            api_dir = self.frontend_path / "src" / "api"
            stores_dir = self.frontend_path / "src" / "stores"
            
            api_files = list(api_dir.rglob("*.ts")) if api_dir.exists() else []
            store_files = list(stores_dir.rglob("*.ts")) if stores_dir.exists() else []
            
            api_analysis = {
                'api_files': len(api_files),
                'store_files': len(store_files),
                'axios_usage': 0,
                'error_handling': 0,
                'type_definitions': 0
            }
            
            # 分析 API 文件
            for api_file in api_files:
                try:
                    with open(api_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    if 'axios' in content or 'fetch' in content:
                        api_analysis['axios_usage'] += 1
                    
                    if 'try' in content and 'catch' in content:
                        api_analysis['error_handling'] += 1
                    
                    if 'interface' in content or 'type' in content:
                        api_analysis['type_definitions'] += 1
                        
                except Exception:
                    continue
            
            # 分析 Store 文件
            for store_file in store_files:
                try:
                    with open(store_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    if 'defineStore' in content:
                        api_analysis['store_files'] += 1
                        
                except Exception:
                    continue
            
            if api_analysis['api_files'] >= 3 and api_analysis['store_files'] >= 2:
                self.log_test("TC018", "API 整合分析", "PASS", 
                            f"API 架構完整: {api_analysis}")
            elif api_analysis['api_files'] >= 1:
                self.log_test("TC018", "API 整合分析", "PASS", 
                            f"基本 API 結構存在: {api_analysis}")
            else:
                self.log_test("TC018", "API 整合分析", "FAIL", 
                            f"API 結構不完整: {api_analysis}")
                
        except Exception as e:
            self.log_test("TC018", "API 整合分析", "FAIL", error=str(e))
    
    async def analyze_routing_structure(self):
        """TC019: 路由結構分析"""
        try:
            router_file = self.frontend_path / "src" / "router" / "index.ts"
            
            if not router_file.exists():
                self.log_test("TC019", "路由結構分析", "FAIL", "路由文件不存在")
                return
            
            with open(router_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            routing_features = {
                'routes_defined': len(re.findall(r'path:\s*[\'"][^\'"]+[\'"]', content)),
                'lazy_loading': 'import(' in content,
                'route_guards': 'beforeEach' in content,
                'nested_routes': 'children:' in content,
                'meta_fields': 'meta:' in content
            }
            
            feature_count = sum(1 for feature, exists in routing_features.items() 
                              if (isinstance(exists, bool) and exists) or 
                                 (isinstance(exists, int) and exists > 0))
            
            if feature_count >= 4:
                self.log_test("TC019", "路由結構分析", "PASS", 
                            f"路由功能完整: {routing_features}")
            elif routing_features['routes_defined'] >= 5:
                self.log_test("TC019", "路由結構分析", "PASS", 
                            f"基本路由結構完整: {routing_features}")
            else:
                self.log_test("TC019", "路由結構分析", "FAIL", 
                            f"路由結構不完整: {routing_features}")
                
        except Exception as e:
            self.log_test("TC019", "路由結構分析", "FAIL", error=str(e))
    
    async def analyze_build_output(self):
        """TC020: 建置輸出分析"""
        try:
            dist_dir = self.frontend_path / "dist"
            
            if not dist_dir.exists():
                self.log_test("TC020", "建置輸出分析", "FAIL", "dist 目錄不存在")
                return
            
            # 分析建置文件
            js_files = list(dist_dir.rglob("*.js"))
            css_files = list(dist_dir.rglob("*.css"))
            html_files = list(dist_dir.rglob("*.html"))
            assets = list(dist_dir.rglob("assets/*"))
            
            build_analysis = {
                'js_files': len(js_files),
                'css_files': len(css_files),
                'html_files': len(html_files),
                'total_assets': len(assets),
                'has_index_html': (dist_dir / "index.html").exists(),
                'assets_dir_exists': (dist_dir / "assets").exists()
            }
            
            # 檢查文件大小
            large_files = []
            for file_path in js_files + css_files:
                try:
                    size = file_path.stat().st_size
                    if size > 1024 * 1024:  # 大於 1MB
                        large_files.append(f"{file_path.name}: {size/1024/1024:.1f}MB")
                except:
                    continue
            
            if (build_analysis['has_index_html'] and 
                build_analysis['js_files'] > 0 and 
                build_analysis['css_files'] > 0):
                
                details = f"建置完整: {build_analysis}"
                if large_files:
                    details += f", 大文件: {large_files[:3]}"
                
                self.log_test("TC020", "建置輸出分析", "PASS", details)
            else:
                self.log_test("TC020", "建置輸出分析", "FAIL", 
                            f"建置不完整: {build_analysis}")
                
        except Exception as e:
            self.log_test("TC020", "建置輸出分析", "FAIL", error=str(e))
    
    async def run_all_tests(self):
        """執行所有靜態分析測試"""
        print("🔍 開始 MemoryArk 2.0 前端靜態分析")
        print("="*50)
        
        # 專案結構分析
        print("\n📁 專案結構分析")
        await self.analyze_project_structure()
        await self.analyze_package_dependencies()
        
        # 程式碼分析
        print("\n💻 程式碼分析")
        await self.analyze_vue_components()
        await self.analyze_api_integration()
        await self.analyze_routing_structure()
        
        # 建置分析
        print("\n🏗️ 建置分析")
        await self.analyze_build_output()
        
        # 生成報告
        await self.generate_report()
    
    async def generate_report(self):
        """生成分析報告"""
        # 統計結果
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["status"] == "PASS"])
        failed_tests = len([r for r in self.test_results if r["status"] == "FAIL"])
        skipped_tests = len([r for r in self.test_results if r["status"] == "SKIP"])
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        # 控制台摘要
        print("\n" + "="*50)
        print("📊 靜態分析結果摘要")
        print("="*50)
        print(f"總測試數: {total_tests}")
        print(f"通過: {passed_tests} ✅")
        print(f"失敗: {failed_tests} ❌")
        print(f"跳過: {skipped_tests} ⏭️")
        print(f"成功率: {success_rate:.1f}%")
        
        # 生成 JSON 報告
        report = {
            "test_session": {
                "timestamp": datetime.now().isoformat(),
                "test_type": "static_analysis",
                "frontend_path": str(self.frontend_path)
            },
            "summary": {
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "skipped": skipped_tests,
                "success_rate": success_rate
            },
            "test_results": self.test_results
        }
        
        # 保存報告
        test_dir = Path("/home/davidliou/MyProject/MemoryArk2/testing/frontend/results")
        test_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        json_file = test_dir / f"static_analysis_report_{timestamp}.json"
        
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n📄 靜態分析報告已保存: {json_file}")
        
        return report

async def main():
    """主函數"""
    analyzer = MemoryArkStaticAnalyzer()
    await analyzer.run_all_tests()

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
#!/usr/bin/env python3
"""
MemoryArk 2.0 前端綜合測試報告生成器
整合所有測試結果並生成完整的 Markdown 報告
"""

import json
import os
from datetime import datetime
from pathlib import Path

class ComprehensiveReportGenerator:
    def __init__(self):
        self.test_dir = Path("/home/davidliou/MyProject/MemoryArk2/testing/frontend")
        self.results_dir = self.test_dir / "results"
        self.reports = {}
        
    def load_test_reports(self):
        """載入所有測試報告"""
        print("📊 載入測試報告...")
        
        # 載入所有 JSON 報告
        for json_file in self.results_dir.glob("*.json"):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                test_type = data.get('test_session', {}).get('test_type', 'unknown')
                self.reports[test_type] = data
                print(f"✅ 已載入: {json_file.name}")
                
            except Exception as e:
                print(f"❌ 載入失敗 {json_file.name}: {e}")
    
    def generate_markdown_report(self):
        """生成 Markdown 測試報告"""
        report_lines = []
        
        # 報告標題
        report_lines.extend([
            "# MemoryArk 2.0 前端功能測試報告",
            "",
            f"**測試日期**: {datetime.now().strftime('%Y年%m月%d日 %H:%M:%S')}  ",
            f"**測試版本**: MemoryArk 2.0.3  ",
            f"**測試環境**: http://localhost:7001  ",
            f"**測試類型**: 自動化功能測試  ",
            "",
            "---",
            ""
        ])
        
        # 執行摘要
        report_lines.extend(self.generate_executive_summary())
        
        # 測試結果詳情
        report_lines.extend(self.generate_detailed_results())
        
        # 問題分析
        report_lines.extend(self.generate_issue_analysis())
        
        # 建議事項
        report_lines.extend(self.generate_recommendations())
        
        # 附錄
        report_lines.extend(self.generate_appendix())
        
        return "\\n".join(report_lines)
    
    def generate_executive_summary(self):
        """生成執行摘要"""
        lines = [
            "## 📋 執行摘要",
            "",
            "### 測試覆蓋範圍",
            "",
            "本次測試對 MemoryArk 2.0 前端系統進行了全面的功能驗證，包括：",
            "",
            "- **基本功能測試**: HTTP 連接、頁面載入、API 端點",
            "- **靜態分析測試**: 專案結構、依賴管理、程式碼品質",
            "- **架構完整性**: Vue 組件、路由系統、建置輸出",
            "",
        ]
        
        # 整體統計
        total_tests = 0
        total_passed = 0
        total_failed = 0
        total_skipped = 0
        
        for test_type, report in self.reports.items():
            summary = report.get('summary', {})
            total_tests += summary.get('total_tests', 0)
            total_passed += summary.get('passed', 0)
            total_failed += summary.get('failed', 0)
            total_skipped += summary.get('skipped', 0)
        
        overall_success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
        
        lines.extend([
            "### 整體測試結果",
            "",
            f"| 測試項目 | 數量 | 比例 |",
            f"|----------|------|------|",
            f"| 總測試數 | {total_tests} | 100% |",
            f"| ✅ 通過 | {total_passed} | {total_passed/total_tests*100:.1f}% |",
            f"| ❌ 失敗 | {total_failed} | {total_failed/total_tests*100:.1f}% |",
            f"| ⏭️ 跳過 | {total_skipped} | {total_skipped/total_tests*100:.1f}% |",
            "",
            f"**整體成功率**: {overall_success_rate:.1f}%",
            "",
        ])
        
        # 關鍵發現
        lines.extend([
            "### 🔍 關鍵發現",
            "",
        ])
        
        if overall_success_rate >= 90:
            lines.extend([
                "✅ **系統狀態良好**: 前端系統運行穩定，核心功能正常",
                "✅ **架構完整**: Vue 3 + TypeScript 架構完整，組件結構良好",
                "✅ **建置正常**: 前端建置輸出完整，靜態資源載入正常",
                ""
            ])
        elif overall_success_rate >= 75:
            lines.extend([
                "⚠️ **輕微問題**: 系統整體良好，存在少量待優化項目",
                "✅ **核心功能正常**: 主要功能模組運作正常",
                ""
            ])
        else:
            lines.extend([
                "🚨 **需要關注**: 發現多項問題，建議優先修復",
                ""
            ])
        
        lines.append("---\\n")
        return lines
    
    def generate_detailed_results(self):
        """生成詳細測試結果"""
        lines = [
            "## 📊 詳細測試結果",
            ""
        ]
        
        test_type_names = {
            'unknown': '基本功能測試',
            'static_analysis': '靜態分析測試',
            'browser_interaction': '瀏覽器交互測試'
        }
        
        for test_type, report in self.reports.items():
            type_name = test_type_names.get(test_type, test_type)
            summary = report.get('summary', {})
            
            lines.extend([
                f"### {type_name}",
                "",
                f"**執行時間**: {report.get('test_session', {}).get('duration_seconds', 'N/A')} 秒  ",
                f"**成功率**: {summary.get('success_rate', 0):.1f}%  ",
                "",
                "| 測試案例 | 狀態 | 詳情 |",
                "|----------|------|------|"
            ])
            
            for result in report.get('test_results', []):
                status_emoji = "✅" if result['status'] == 'PASS' else "❌" if result['status'] == 'FAIL' else "⏭️"
                test_name = result.get('test_name', 'Unknown')
                details = result.get('details', '').replace('|', '\\|')[:50]
                if len(details) > 50:
                    details += "..."
                
                lines.append(f"| {result.get('test_id', 'N/A')} - {test_name} | {status_emoji} {result['status']} | {details} |")
            
            lines.extend(["", ""])
        
        lines.append("---\\n")
        return lines
    
    def generate_issue_analysis(self):
        """生成問題分析"""
        lines = [
            "## 🔍 問題分析",
            ""
        ]
        
        # 收集所有失敗的測試
        failed_tests = []
        for test_type, report in self.reports.items():
            for result in report.get('test_results', []):
                if result['status'] == 'FAIL':
                    failed_tests.append({
                        'type': test_type,
                        'test': result
                    })
        
        if not failed_tests:
            lines.extend([
                "✅ **優秀表現**: 所有測試均通過，系統運行穩定。",
                ""
            ])
        else:
            lines.extend([
                f"發現 {len(failed_tests)} 個需要關注的問題：",
                ""
            ])
            
            for i, failed in enumerate(failed_tests, 1):
                test = failed['test']
                lines.extend([
                    f"### 問題 {i}: {test.get('test_name', 'Unknown')}",
                    "",
                    f"**測試 ID**: {test.get('test_id', 'N/A')}  ",
                    f"**測試類型**: {failed['type']}  ",
                    f"**錯誤信息**: {test.get('error', 'N/A')}  ",
                    f"**詳細描述**: {test.get('details', 'N/A')}  ",
                    "",
                    "**建議解決方案**:",
                    self.get_solution_suggestion(test),
                    ""
                ])
        
        lines.append("---\\n")
        return lines
    
    def get_solution_suggestion(self, test):
        """根據測試失敗情況提供解決建議"""
        test_name = test.get('test_name', '').lower()
        error = test.get('error', '').lower()
        
        if 'connection' in error or 'refused' in error:
            return "- 檢查服務是否正常運行\\n- 確認端口配置正確\\n- 檢查防火牆設置"
        elif 'timeout' in error:
            return "- 增加超時時間設定\\n- 檢查服務器效能\\n- 優化資源載入"
        elif 'not found' in error or '404' in error:
            return "- 檢查路由配置\\n- 確認資源文件存在\\n- 檢查 URL 路徑"
        elif 'security' in test_name or 'header' in test_name:
            return "- 配置安全標頭\\n- 檢查 nginx 配置\\n- 更新安全政策"
        elif 'responsive' in test_name:
            return "- 檢查 CSS 媒體查詢\\n- 更新響應式設計\\n- 測試多種裝置"
        else:
            return "- 詳細檢查錯誤日誌\\n- 確認系統配置\\n- 進行進一步調試"
    
    def generate_recommendations(self):
        """生成建議事項"""
        lines = [
            "## 💡 建議事項",
            "",
            "基於測試結果，我們提出以下建議：",
            ""
        ]
        
        # 根據測試結果生成具體建議
        overall_success_rate = 0
        total_tests = 0
        for report in self.reports.values():
            summary = report.get('summary', {})
            total_tests += summary.get('total_tests', 0)
            overall_success_rate += summary.get('success_rate', 0)
        
        if total_tests > 0:
            overall_success_rate /= len(self.reports)
        
        lines.extend([
            "### 短期建議 (1-2週)",
            ""
        ])
        
        if overall_success_rate >= 90:
            lines.extend([
                "- ✅ **持續監控**: 維持現有系統穩定性",
                "- 🔧 **性能優化**: 進一步優化載入速度",
                "- 📱 **移動體驗**: 加強移動端用戶體驗",
                ""
            ])
        else:
            lines.extend([
                "- 🔧 **修復失敗項目**: 優先處理測試失敗的功能",
                "- 🔍 **深度調試**: 對問題進行根本原因分析",
                "- 📊 **增加監控**: 加強系統監控和日誌記錄",
                ""
            ])
        
        lines.extend([
            "### 中期建議 (1-2個月)",
            "",
            "- 🧪 **自動化測試**: 建立 CI/CD 自動化測試流程",
            "- 📈 **效能監控**: 設置即時效能監控系統",
            "- 🔒 **安全加固**: 加強安全標頭和防護機制",
            "- 📱 **無障礙優化**: 提升無障礙功能支援",
            "",
            "### 長期建議 (3-6個月)",
            "",
            "- 🚀 **技術升級**: 評估 Vue 3.5+ 等新技術",
            "- 📊 **用戶分析**: 建立用戶行為分析系統",
            "- 🌐 **國際化**: 支援多語言和區域化",
            "- ⚡ **PWA 支援**: 考慮 Progressive Web App 功能",
            ""
        ])
        
        lines.append("---\\n")
        return lines
    
    def generate_appendix(self):
        """生成附錄"""
        lines = [
            "## 📎 附錄",
            "",
            "### 測試環境詳情",
            "",
            f"- **測試工具**: Python 3.x, requests, json",
            f"- **測試方法**: 自動化腳本 + 靜態分析",
            f"- **測試範圍**: 前端功能、架構、效能",
            f"- **測試數據**: 模擬真實使用場景",
            "",
            "### 測試文件結構",
            "",
            "```",
            "/testing/frontend/",
            "├── test-plan.md              # 測試計劃",
            "├── automated-test.py         # 基本功能測試",
            "├── browser-test.py           # 瀏覽器測試",
            "├── static-analysis.py        # 靜態分析",
            "├── comprehensive-test-report.py  # 報告生成器",
            "├── results/                  # 測試結果",
            "│   ├── frontend_test_report_*.json",
            "│   ├── static_analysis_report_*.json",
            "│   └── comprehensive_report_*.md",
            "└── screenshots/              # 測試截圖",
            "```",
            "",
            "### 相關文檔",
            "",
            "- [前端架構分析](../docs/frontend-architecture.md)",
            "- [API 測試結果](../api/api-test-results.md)",
            "- [效能測試報告](../performance/performance-report.md)",
            "",
            "---",
            "",
            f"**報告生成時間**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  ",
            f"**生成工具**: MemoryArk 2.0 自動化測試系統  ",
            f"**聯繫方式**: 94work.net@gmail.com  "
        ]
        
        return lines
    
    def save_report(self, content):
        """保存測試報告"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"comprehensive_frontend_test_report_{timestamp}.md"
        filepath = self.results_dir / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return filepath
    
    def generate_summary_json(self):
        """生成摘要 JSON"""
        summary = {
            "report_metadata": {
                "generated_at": datetime.now().isoformat(),
                "version": "MemoryArk 2.0.3",
                "test_environment": "http://localhost:7001"
            },
            "overall_results": {},
            "test_types": {}
        }
        
        # 計算整體結果
        total_tests = 0
        total_passed = 0
        total_failed = 0
        total_skipped = 0
        
        for test_type, report in self.reports.items():
            summary_data = report.get('summary', {})
            
            tests = summary_data.get('total_tests', 0)
            passed = summary_data.get('passed', 0)
            failed = summary_data.get('failed', 0)
            skipped = summary_data.get('skipped', 0)
            
            total_tests += tests
            total_passed += passed
            total_failed += failed
            total_skipped += skipped
            
            summary["test_types"][test_type] = {
                "total_tests": tests,
                "passed": passed,
                "failed": failed,
                "skipped": skipped,
                "success_rate": summary_data.get('success_rate', 0)
            }
        
        summary["overall_results"] = {
            "total_tests": total_tests,
            "passed": total_passed,
            "failed": total_failed,
            "skipped": total_skipped,
            "success_rate": (total_passed / total_tests * 100) if total_tests > 0 else 0
        }
        
        return summary
    
    def run(self):
        """執行報告生成"""
        print("🚀 開始生成 MemoryArk 2.0 前端綜合測試報告")
        print("="*50)
        
        # 載入測試報告
        self.load_test_reports()
        
        if not self.reports:
            print("❌ 未找到測試報告，請先執行測試")
            return
        
        # 生成 Markdown 報告
        print("📝 生成 Markdown 報告...")
        markdown_content = self.generate_markdown_report()
        markdown_file = self.save_report(markdown_content)
        
        # 生成 JSON 摘要
        print("📊 生成 JSON 摘要...")
        summary = self.generate_summary_json()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        json_file = self.results_dir / f"test_summary_{timestamp}.json"
        
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
        
        # 輸出結果
        overall_success_rate = summary["overall_results"]["success_rate"]
        
        print("\\n" + "="*50)
        print("📋 報告生成完成")
        print("="*50)
        print(f"整體成功率: {overall_success_rate:.1f}%")
        print(f"Markdown 報告: {markdown_file}")
        print(f"JSON 摘要: {json_file}")
        
        if overall_success_rate >= 90:
            print("\\n🎉 優秀！前端系統運行穩定")
        elif overall_success_rate >= 75:
            print("\\n👍 良好！系統整體運作正常")
        else:
            print("\\n⚠️  注意！發現多項問題，建議及時處理")

if __name__ == "__main__":
    generator = ComprehensiveReportGenerator()
    generator.run()
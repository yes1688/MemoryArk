#!/usr/bin/env python3
"""
MemoryArk 2.0 綜合測試報告生成器
===============================
整合所有自適應測試結果，生成專業級測試報告

功能特色：
1. 多源數據整合
2. 智能趨勢分析  
3. 視覺化圖表
4. 專業報告格式
5. 執行摘要和建議
"""

import json
import time
import os
from pathlib import Path
from typing import Dict, List, Any, Optional
import glob

class ComprehensiveReportGenerator:
    def __init__(self):
        self.test_results_dir = "test-results"
        self.report_data = {}
        self.insights = []
        
    def generate_comprehensive_report(self):
        """生成綜合測試報告"""
        print("📊 MemoryArk 2.0 綜合測試報告生成器")
        print("=" * 50)
        
        # 1. 收集所有測試數據
        print("\n📂 收集測試數據...")
        self._collect_all_test_data()
        
        # 2. 分析數據和趨勢
        print("\n📈 分析測試趨勢...")
        self._analyze_test_trends()
        
        # 3. 生成執行摘要
        print("\n📋 生成執行摘要...")
        executive_summary = self._generate_executive_summary()
        
        # 4. 生成 HTML 報告
        print("\n🌐 生成 HTML 報告...")
        html_report = self._generate_html_report(executive_summary)
        
        # 5. 生成文字報告
        print("\n📄 生成文字報告...")
        text_report = self._generate_text_report(executive_summary)
        
        # 6. 保存報告
        self._save_reports(html_report, text_report)
        
        # 7. 打印摘要
        self._print_generation_summary(executive_summary)
        
        return executive_summary
    
    def _collect_all_test_data(self):
        """收集所有測試數據"""
        results_files = glob.glob(f"{self.test_results_dir}/*.json")
        
        if not results_files:
            print("   ⚠️ 未找到測試結果文件")
            return
        
        # 按類型分類測試結果
        self.report_data = {
            'ultimate_adaptive': [],
            'enhanced_adaptive': [],
            'basic_adaptive': [],
            'environment_detection': [],
            'legacy_results': []
        }
        
        for file_path in results_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # 根據文件名分類
                filename = os.path.basename(file_path)
                if 'ultimate-adaptive' in filename:
                    self.report_data['ultimate_adaptive'].append({
                        'file': filename,
                        'data': data,
                        'timestamp': self._extract_timestamp(filename)
                    })
                elif 'enhanced-adaptive' in filename:
                    self.report_data['enhanced_adaptive'].append({
                        'file': filename,
                        'data': data,
                        'timestamp': self._extract_timestamp(filename)
                    })
                elif 'adaptive-system' in filename:
                    self.report_data['basic_adaptive'].append({
                        'file': filename,
                        'data': data,
                        'timestamp': self._extract_timestamp(filename)
                    })
                elif 'environment-detection' in filename:
                    self.report_data['environment_detection'].append({
                        'file': filename,
                        'data': data,
                        'timestamp': self._extract_timestamp(filename)
                    })
                else:
                    self.report_data['legacy_results'].append({
                        'file': filename,
                        'data': data,
                        'timestamp': self._extract_timestamp(filename)
                    })
                    
                print(f"   ✅ 已載入: {filename}")
                
            except Exception as e:
                print(f"   ❌ 載入失敗: {filename} - {e}")
    
    def _extract_timestamp(self, filename):
        """從文件名提取時間戳"""
        import re
        match = re.search(r'(\d{8}-\d{6})', filename)
        if match:
            return match.group(1)
        return "unknown"
    
    def _analyze_test_trends(self):
        """分析測試趨勢"""
        # 獲取最新的終極自適應測試結果
        latest_ultimate = self._get_latest_result('ultimate_adaptive')
        latest_enhanced = self._get_latest_result('enhanced_adaptive')
        latest_basic = self._get_latest_result('basic_adaptive')
        latest_env = self._get_latest_result('environment_detection')
        
        # 分析系統演進
        self._analyze_system_evolution(latest_ultimate, latest_enhanced, latest_basic)
        
        # 分析環境適應性
        self._analyze_environment_adaptability(latest_env, latest_ultimate)
        
        # 分析性能趨勢
        self._analyze_performance_trends()
    
    def _get_latest_result(self, category):
        """獲取指定類型的最新結果"""
        results = self.report_data.get(category, [])
        if results:
            return max(results, key=lambda x: x['timestamp'])
        return None
    
    def _analyze_system_evolution(self, ultimate, enhanced, basic):
        """分析系統演進"""
        evolution_data = {}
        
        if basic and basic['data'].get('test_execution'):
            basic_summary = basic['data']['test_execution']['summary']
            evolution_data['basic'] = {
                'pass_rate': basic_summary.get('pass_rate', 0),
                'total_tests': basic_summary.get('total', 0),
                'adaptations': basic_summary.get('adapted', 0)
            }
        
        if enhanced and enhanced['data'].get('summary'):
            enhanced_summary = enhanced['data']['summary']
            evolution_data['enhanced'] = {
                'pass_rate': enhanced_summary.get('pass_rate', 0),
                'total_tests': enhanced_summary.get('total_tests', 0),
                'adaptations': enhanced_summary.get('adaptations_made', 0)
            }
        
        if ultimate and ultimate['data'].get('summary'):
            ultimate_summary = ultimate['data']['summary']
            evolution_data['ultimate'] = {
                'pass_rate': ultimate_summary.get('pass_rate', 0),
                'total_tests': ultimate_summary.get('total_tests', 0),
                'adaptations': ultimate_summary.get('adaptations_made', 0),
                'discovered_endpoints': ultimate_summary.get('discovered_endpoints', 0)
            }
        
        self.report_data['evolution_analysis'] = evolution_data
        
        # 生成演進洞察
        if len(evolution_data) >= 2:
            self.insights.append("📈 系統展現持續演進能力，測試框架不斷優化")
            
            if 'ultimate' in evolution_data and 'basic' in evolution_data:
                improvement = evolution_data['ultimate']['pass_rate'] - evolution_data['basic']['pass_rate']
                if improvement > 10:
                    self.insights.append(f"🚀 終極自適應系統相比基礎版本提升 {improvement:.1f}% 通過率")
    
    def _analyze_environment_adaptability(self, env_data, ultimate_data):
        """分析環境適應性"""
        adaptability_score = 0
        
        if env_data and env_data['data']:
            env_info = env_data['data']
            
            # 服務發現能力
            services = env_info.get('services', [])
            running_services = len([s for s in services if s.get('running', False)])
            adaptability_score += min(30, running_services * 10)
            
            # 端口檢測能力
            detected_ports = len(env_info.get('detected_ports', {}))
            adaptability_score += min(20, detected_ports * 10)
            
        if ultimate_data and ultimate_data['data']:
            ultimate_info = ultimate_data['data']
            
            # 自動適應能力
            adaptations = ultimate_info.get('summary', {}).get('adaptations_made', 0)
            adaptability_score += min(30, adaptations * 7.5)
            
            # 端點發現能力
            endpoints = ultimate_info.get('summary', {}).get('discovered_endpoints', 0)
            adaptability_score += min(20, endpoints * 1)
        
        self.report_data['adaptability_score'] = adaptability_score
        
        if adaptability_score >= 80:
            self.insights.append("🌟 系統展現卓越的環境適應能力")
        elif adaptability_score >= 60:
            self.insights.append("👍 系統具備良好的環境適應能力")
        else:
            self.insights.append("📈 系統適應能力有提升空間")
    
    def _analyze_performance_trends(self):
        """分析性能趨勢"""
        execution_times = []
        
        for category in ['ultimate_adaptive', 'enhanced_adaptive', 'basic_adaptive']:
            results = self.report_data.get(category, [])
            for result in results:
                exec_time = result['data'].get('summary', {}).get('execution_time')
                if exec_time:
                    execution_times.append(exec_time)
        
        if execution_times:
            avg_time = sum(execution_times) / len(execution_times)
            min_time = min(execution_times)
            
            self.report_data['performance_metrics'] = {
                'average_execution_time': avg_time,
                'fastest_execution_time': min_time,
                'total_executions': len(execution_times)
            }
            
            if min_time < 1.0:
                self.insights.append(f"⚡ 測試執行速度優秀，最快 {min_time:.1f} 秒完成")
    
    def _generate_executive_summary(self):
        """生成執行摘要"""
        # 獲取最新的終極測試結果
        latest_ultimate = self._get_latest_result('ultimate_adaptive')
        
        if not latest_ultimate:
            return self._generate_fallback_summary()
        
        summary_data = latest_ultimate['data']['summary']
        
        return {
            'report_title': 'MemoryArk 2.0 自適應測試系統綜合報告',
            'generation_time': time.strftime("%Y-%m-%d %H:%M:%S"),
            'test_period': f"測試執行期間: {latest_ultimate['timestamp']}",
            'key_metrics': {
                'total_tests': summary_data.get('total_tests', 0),
                'pass_rate': summary_data.get('pass_rate', 0),
                'adaptations_made': summary_data.get('adaptations_made', 0),
                'discovered_endpoints': summary_data.get('discovered_endpoints', 0),
                'execution_time': summary_data.get('execution_time', 0),
                'overall_score': summary_data.get('overall_score', 0)
            },
            'system_grade': self._calculate_system_grade(summary_data),
            'key_achievements': self._extract_key_achievements(latest_ultimate),
            'recommendations': self._generate_recommendations(),
            'insights': self.insights,
            'evolution_data': self.report_data.get('evolution_analysis', {}),
            'adaptability_score': self.report_data.get('adaptability_score', 0),
            'performance_metrics': self.report_data.get('performance_metrics', {})
        }
    
    def _generate_fallback_summary(self):
        """生成後備摘要（當沒有終極測試結果時）"""
        return {
            'report_title': 'MemoryArk 2.0 測試報告',
            'generation_time': time.strftime("%Y-%m-%d %H:%M:%S"),
            'test_period': '基於現有測試數據',
            'key_metrics': {
                'total_tests': 0,
                'pass_rate': 0,
                'adaptations_made': 0,
                'discovered_endpoints': 0,
                'execution_time': 0,
                'overall_score': 0
            },
            'system_grade': 'D',
            'key_achievements': ['測試數據收集完成'],
            'recommendations': ['建議執行完整的自適應測試'],
            'insights': ['需要更多測試數據進行深入分析'],
            'evolution_data': {},
            'adaptability_score': 0,
            'performance_metrics': {}
        }
    
    def _calculate_system_grade(self, summary_data):
        """計算系統評級"""
        overall_score = summary_data.get('overall_score', 0)
        
        if overall_score >= 90:
            return 'A+'
        elif overall_score >= 85:
            return 'A'
        elif overall_score >= 80:
            return 'A-'
        elif overall_score >= 75:
            return 'B+'
        elif overall_score >= 70:
            return 'B'
        elif overall_score >= 65:
            return 'B-'
        elif overall_score >= 60:
            return 'C+'
        elif overall_score >= 55:
            return 'C'
        else:
            return 'D'
    
    def _extract_key_achievements(self, ultimate_result):
        """提取關鍵成就"""
        achievements = []
        
        summary = ultimate_result['data']['summary']
        infrastructure = ultimate_result['data'].get('infrastructure', {})
        
        # 基於數據的成就
        if summary.get('discovered_endpoints', 0) >= 20:
            achievements.append(f"🌐 發現 {summary['discovered_endpoints']} 個可用端點")
        
        if summary.get('pass_rate', 0) >= 80:
            achievements.append(f"✅ 測試通過率達到 {summary['pass_rate']:.1f}%")
        
        if summary.get('adaptations_made', 0) >= 3:
            achievements.append(f"🔧 成功執行 {summary['adaptations_made']} 項自動適應")
        
        working_urls = len(infrastructure.get('working_base_urls', []))
        if working_urls >= 3:
            achievements.append(f"🚀 發現 {working_urls} 個可用服務實例")
        
        if summary.get('execution_time', float('inf')) < 1:
            achievements.append(f"⚡ 超快執行速度: {summary['execution_time']:.1f} 秒")
        
        return achievements if achievements else ['🔧 系統基礎功能正常運行']
    
    def _generate_recommendations(self):
        """生成建議"""
        recommendations = []
        
        # 基於最新結果的建議
        latest_ultimate = self._get_latest_result('ultimate_adaptive')
        
        if latest_ultimate:
            summary = latest_ultimate['data']['summary']
            
            if summary.get('pass_rate', 0) < 90:
                recommendations.append("📈 建議調查失敗測試項目，進一步提升通過率")
            
            if summary.get('adaptations_made', 0) < 5:
                recommendations.append("🔧 可考慮增加更多自適應規則以應對複雜環境")
            
            if summary.get('overall_score', 0) >= 80:
                recommendations.append("🌟 系統表現優秀，建議定期執行測試確保穩定性")
        
        # 基於分析的建議
        if self.report_data.get('adaptability_score', 0) < 70:
            recommendations.append("🎯 建議強化環境檢測和自動適應機制")
        
        if not recommendations:
            recommendations.append("✅ 系統運行良好，建議持續監控")
        
        return recommendations
    
    def _generate_html_report(self, executive_summary):
        """生成 HTML 報告"""
        html_template = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{executive_summary['report_title']}</title>
    <style>
        :root {{
            --primary-color: #1e3a8a;
            --secondary-color: #3b82f6;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --danger-color: #ef4444;
            --background-color: #f8fafc;
            --card-background: #ffffff;
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
            --border-color: #e5e7eb;
        }}
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--background-color);
            color: var(--text-primary);
            line-height: 1.6;
        }}
        
        .header {{
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            padding: 2rem 0;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        
        .header h1 {{
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            font-weight: 700;
        }}
        
        .header p {{
            font-size: 1.1rem;
            opacity: 0.9;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }}
        
        .summary-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin: 2rem 0;
        }}
        
        .summary-card {{
            background: var(--card-background);
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-left: 4px solid var(--secondary-color);
            transition: transform 0.2s ease;
        }}
        
        .summary-card:hover {{
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }}
        
        .summary-card h3 {{
            color: var(--primary-color);
            margin-bottom: 0.5rem;
            font-size: 1rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        
        .summary-card .value {{
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--success-color);
            margin-bottom: 0.25rem;
        }}
        
        .summary-card .label {{
            color: var(--text-secondary);
            font-size: 0.9rem;
        }}
        
        .grade-display {{
            text-align: center;
            margin: 2rem 0;
            padding: 2rem;
            background: var(--card-background);
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        
        .grade {{
            font-size: 4rem;
            font-weight: 700;
            color: var(--success-color);
            margin-bottom: 0.5rem;
        }}
        
        .section {{
            background: var(--card-background);
            margin: 2rem 0;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        
        .section h2 {{
            color: var(--primary-color);
            margin-bottom: 1rem;
            font-size: 1.5rem;
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 0.5rem;
        }}
        
        .achievement-list, .recommendation-list, .insight-list {{
            list-style: none;
        }}
        
        .achievement-list li, .recommendation-list li, .insight-list li {{
            padding: 0.75rem 0;
            border-bottom: 1px solid var(--border-color);
            font-size: 1rem;
        }}
        
        .achievement-list li:last-child, 
        .recommendation-list li:last-child, 
        .insight-list li:last-child {{
            border-bottom: none;
        }}
        
        .progress-bar {{
            width: 100%;
            height: 20px;
            background-color: var(--border-color);
            border-radius: 10px;
            overflow: hidden;
            margin: 1rem 0;
        }}
        
        .progress-fill {{
            height: 100%;
            background: linear-gradient(90deg, var(--success-color), var(--secondary-color));
            border-radius: 10px;
            transition: width 0.3s ease;
        }}
        
        .footer {{
            text-align: center;
            padding: 2rem;
            color: var(--text-secondary);
            border-top: 1px solid var(--border-color);
            margin-top: 2rem;
        }}
        
        .emoji {{
            font-size: 1.2em;
            margin-right: 0.5rem;
        }}
        
        @media (max-width: 768px) {{
            .header h1 {{
                font-size: 2rem;
            }}
            
            .container {{
                padding: 1rem;
            }}
            
            .summary-grid {{
                grid-template-columns: 1fr;
            }}
            
            .grade {{
                font-size: 3rem;
            }}
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🌟 {executive_summary['report_title']}</h1>
        <p>{executive_summary['generation_time']} • {executive_summary['test_period']}</p>
    </div>
    
    <div class="container">
        <div class="summary-grid">
            <div class="summary-card">
                <h3>總測試數</h3>
                <div class="value">{executive_summary['key_metrics']['total_tests']}</div>
                <div class="label">執行的測試項目</div>
            </div>
            <div class="summary-card">
                <h3>通過率</h3>
                <div class="value">{executive_summary['key_metrics']['pass_rate']:.1f}%</div>
                <div class="label">測試成功率</div>
            </div>
            <div class="summary-card">
                <h3>自動適應</h3>
                <div class="value">{executive_summary['key_metrics']['adaptations_made']}</div>
                <div class="label">智能調整次數</div>
            </div>
            <div class="summary-card">
                <h3>發現端點</h3>
                <div class="value">{executive_summary['key_metrics']['discovered_endpoints']}</div>
                <div class="label">可用服務端點</div>
            </div>
        </div>
        
        <div class="grade-display">
            <div class="grade">{executive_summary['system_grade']}</div>
            <h3>系統綜合評級</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: {executive_summary['key_metrics']['overall_score']:.0f}%"></div>
            </div>
            <p>綜合評分: {executive_summary['key_metrics']['overall_score']:.1f}/100</p>
        </div>
        
        <div class="section">
            <h2><span class="emoji">🏆</span>關鍵成就</h2>
            <ul class="achievement-list">
"""
        
        for achievement in executive_summary['key_achievements']:
            html_template += f"                <li>{achievement}</li>\n"
        
        html_template += f"""            </ul>
        </div>
        
        <div class="section">
            <h2><span class="emoji">💡</span>系統洞察</h2>
            <ul class="insight-list">
"""
        
        for insight in executive_summary['insights']:
            html_template += f"                <li>{insight}</li>\n"
        
        html_template += f"""            </ul>
        </div>
        
        <div class="section">
            <h2><span class="emoji">📋</span>改進建議</h2>
            <ul class="recommendation-list">
"""
        
        for recommendation in executive_summary['recommendations']:
            html_template += f"                <li>{recommendation}</li>\n"
        
        html_template += f"""            </ul>
        </div>
        
        <div class="section">
            <h2><span class="emoji">📊</span>性能指標</h2>
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>執行時間</h3>
                    <div class="value">{executive_summary['key_metrics']['execution_time']:.1f}s</div>
                    <div class="label">測試執行速度</div>
                </div>
                <div class="summary-card">
                    <h3>適應能力</h3>
                    <div class="value">{executive_summary['adaptability_score']:.0f}</div>
                    <div class="label">環境適應評分</div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="footer">
        <p>🤖 Generated with MemoryArk 2.0 智能自適應測試系統</p>
        <p>報告生成時間: {executive_summary['generation_time']}</p>
    </div>
</body>
</html>"""
        
        return html_template
    
    def _generate_text_report(self, executive_summary):
        """生成文字報告"""
        report_lines = [
            "=" * 80,
            f"{executive_summary['report_title']}",
            "=" * 80,
            f"報告生成時間: {executive_summary['generation_time']}",
            f"測試執行期間: {executive_summary['test_period']}",
            "",
            "📊 核心指標摘要:",
            f"   總測試數: {executive_summary['key_metrics']['total_tests']}",
            f"   通過率: {executive_summary['key_metrics']['pass_rate']:.1f}%",
            f"   自動適應: {executive_summary['key_metrics']['adaptations_made']} 項",
            f"   發現端點: {executive_summary['key_metrics']['discovered_endpoints']} 個",
            f"   執行時間: {executive_summary['key_metrics']['execution_time']:.1f} 秒",
            f"   綜合評分: {executive_summary['key_metrics']['overall_score']:.1f}/100",
            "",
            f"🏆 系統評級: {executive_summary['system_grade']}",
            "",
            "🌟 關鍵成就:",
        ]
        
        for achievement in executive_summary['key_achievements']:
            report_lines.append(f"   • {achievement}")
        
        report_lines.extend([
            "",
            "💡 系統洞察:",
        ])
        
        for insight in executive_summary['insights']:
            report_lines.append(f"   • {insight}")
        
        report_lines.extend([
            "",
            "📋 改進建議:",
        ])
        
        for recommendation in executive_summary['recommendations']:
            report_lines.append(f"   • {recommendation}")
        
        report_lines.extend([
            "",
            "📈 適應能力評分:",
            f"   環境適應性: {executive_summary['adaptability_score']:.0f}/100",
            "",
            "=" * 80,
            "🤖 由 MemoryArk 2.0 智能自適應測試系統生成",
            "=" * 80
        ])
        
        return "\n".join(report_lines)
    
    def _save_reports(self, html_report, text_report):
        """保存報告"""
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        
        # 創建目錄
        os.makedirs(self.test_results_dir, exist_ok=True)
        
        # 保存 HTML 報告
        html_path = f"{self.test_results_dir}/comprehensive-report-{timestamp}.html"
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html_report)
        
        # 更新最新 HTML 報告
        latest_html_path = f"{self.test_results_dir}/index.html"
        with open(latest_html_path, 'w', encoding='utf-8') as f:
            f.write(html_report)
        
        # 保存文字報告
        text_path = f"{self.test_results_dir}/comprehensive-report-{timestamp}.txt"
        with open(text_path, 'w', encoding='utf-8') as f:
            f.write(text_report)
        
        # 更新最新文字報告
        latest_text_path = f"{self.test_results_dir}/report.txt"
        with open(latest_text_path, 'w', encoding='utf-8') as f:
            f.write(text_report)
        
        print(f"   ✅ HTML 報告: {html_path}")
        print(f"   ✅ 文字報告: {text_path}")
        print(f"   ✅ 最新版本: index.html, report.txt")
    
    def _print_generation_summary(self, executive_summary):
        """打印生成摘要"""
        print("\n" + "🌟" * 20)
        print("📊 綜合測試報告生成完成")
        print("🌟" * 20)
        
        print(f"\n🎯 系統評級: {executive_summary['system_grade']}")
        print(f"📈 綜合評分: {executive_summary['key_metrics']['overall_score']:.1f}/100")
        print(f"✅ 通過率: {executive_summary['key_metrics']['pass_rate']:.1f}%")
        print(f"🔧 自動適應: {executive_summary['key_metrics']['adaptations_made']} 項")
        
        print(f"\n💡 關鍵洞察:")
        for insight in executive_summary['insights'][:3]:  # 顯示前3個洞察
            print(f"   {insight}")
        
        print(f"\n🚀 報告已生成，可在 test-results/index.html 查看")

def main():
    """主執行函數"""
    generator = ComprehensiveReportGenerator()
    summary = generator.generate_comprehensive_report()
    return summary

if __name__ == "__main__":
    main()
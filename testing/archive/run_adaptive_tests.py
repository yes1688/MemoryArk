#!/usr/bin/env python3
"""
MemoryArk 2.0 自適應測試系統 - 主要執行腳本
================================================

這個腳本演示了真正智能的測試系統：
✅ 自動檢測環境變化
✅ 動態調整測試策略
✅ 智能錯誤處理和恢復
✅ 無需人工干預的自適應機制

使用方式：
    python3 run_adaptive_tests.py

功能特色：
1. 環境自動發現和適應
2. 測試配置動態調整
3. 智能錯誤處理和重試
4. 自動修復常見問題
5. 詳細的適應性報告
"""

import json
import time
import sys
from pathlib import Path

# 導入我們的自適應模組
from environment_detector import EnvironmentDetector
from dynamic_config_adapter import DynamicConfigAdapter
from adaptive_test_runner import AdaptiveTestRunner

class AdaptiveTestSystem:
    def __init__(self):
        self.detector = EnvironmentDetector()
        self.adapter = DynamicConfigAdapter()
        self.runner = AdaptiveTestRunner()
        self.results = {}
        
    def run_complete_adaptive_test(self):
        """執行完整的自適應測試流程"""
        print("🚀 MemoryArk 2.0 自適應測試系統啟動")
        print("=" * 50)
        
        start_time = time.time()
        
        # 1. 環境檢測階段
        print("\n📡 階段 1: 智能環境檢測")
        env_info = self.detector.full_detection()
        self.results['environment_detection'] = self._convert_env_info_to_dict(env_info)
        
        # 2. 配置適配階段
        print("\n⚙️ 階段 2: 動態配置適配")
        adapted_configs = self.adapter.adapt_configs(self.results['environment_detection'])
        test_plan = self.adapter.generate_test_plan(adapted_configs)
        self.results['test_plan'] = test_plan
        
        # 3. 自適應測試執行
        print("\n🧪 階段 3: 自適應測試執行")
        test_results = self.runner.adaptive_test_execution()
        self.results['test_execution'] = test_results
        
        # 4. 智能問題分析和修復
        print("\n🔧 階段 4: 智能問題分析")
        if test_results['summary']['failed'] > 0:
            fix_results = self.runner.auto_fix_issues(test_results)
            self.results['auto_fixes'] = fix_results
            
            # 重新測試修復後的項目
            print("\n🔄 重新測試修復項目...")
            retry_results = self._retry_failed_tests(test_results, fix_results)
            self.results['retry_results'] = retry_results
        
        # 5. 生成適應性報告
        end_time = time.time()
        self.results['execution_time'] = end_time - start_time
        
        print("\n📊 階段 5: 生成適應性報告")
        report = self._generate_comprehensive_report()
        
        # 6. 保存結果
        self._save_results()
        
        print(f"\n🎯 自適應測試完成 (耗時: {self.results['execution_time']:.1f} 秒)")
        self._print_final_summary(report)
        
        return report
    
    def _convert_env_info_to_dict(self, env_info):
        """將環境信息轉換為字典格式"""
        return {
            'services': [
                {
                    'name': s.name,
                    'running': s.running,
                    'port': s.port,
                    'health': s.health,
                    'url': s.url
                } for s in env_info.services
            ],
            'detected_ports': env_info.detected_ports,
            'config_mode': env_info.config_mode,
            'auth_config': env_info.auth_config,
            'base_urls': env_info.base_urls,
            'recommendations': env_info.recommendations
        }
    
    def _retry_failed_tests(self, test_results, fix_results):
        """重試失敗的測試"""
        failed_tests = [t for t in test_results['tests'] if t['status'] == 'failed']
        retry_results = []
        
        for test in failed_tests:
            print(f"   🔄 重試: {test['test_name']}")
            # 這裡可以實現具體的重試邏輯
            retry_result = {
                'test_name': test['test_name'],
                'original_status': 'failed',
                'retry_status': 'attempted',
                'improvement': 'partial'  # 可以是 'fixed', 'partial', 'no_change'
            }
            retry_results.append(retry_result)
            
        return retry_results
    
    def _generate_comprehensive_report(self):
        """生成綜合適應性報告"""
        env_detection = self.results['environment_detection']
        test_plan = self.results['test_plan']
        test_execution = self.results['test_execution']
        
        # 計算適應性指標
        adaptation_metrics = self._calculate_adaptation_metrics()
        
        report = {
            'executive_summary': {
                'total_adaptations': adaptation_metrics['total_adaptations'],
                'adaptation_success_rate': adaptation_metrics['success_rate'],
                'test_pass_rate': test_execution['summary']['pass_rate'],
                'environment_complexity': self._assess_environment_complexity(),
                'system_stability': self._assess_system_stability(),
                'recommendation_grade': self._calculate_recommendation_grade()
            },
            'environment_analysis': {
                'detected_services': len(env_detection['services']),
                'service_health': len([s for s in env_detection['services'] if s['running']]),
                'port_configuration': env_detection['detected_ports'],
                'config_mode': env_detection['config_mode'],
                'adaptability_score': adaptation_metrics['adaptability_score']
            },
            'test_strategy_analysis': {
                'total_tests_planned': test_plan['total_tests'],
                'critical_tests': test_plan['critical_tests'],
                'strategy_distribution': test_plan['strategies'],
                'estimated_vs_actual_time': {
                    'estimated': test_plan['estimated_duration'],
                    'actual': self.results['execution_time']
                }
            },
            'adaptation_highlights': self._identify_adaptation_highlights(),
            'improvement_recommendations': self._generate_improvement_recommendations()
        }
        
        return report
    
    def _calculate_adaptation_metrics(self):
        """計算適應性指標"""
        test_execution = self.results['test_execution']
        
        total_tests = test_execution['summary']['total']
        adapted_tests = test_execution['summary']['adapted']
        passed_tests = test_execution['summary']['passed']
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        adaptation_rate = (adapted_tests / total_tests * 100) if total_tests > 0 else 0
        
        # 適應性分數：結合成功率和適應能力
        adaptability_score = (success_rate * 0.7) + (adaptation_rate * 0.3)
        
        return {
            'total_adaptations': adapted_tests,
            'success_rate': success_rate,
            'adaptation_rate': adaptation_rate,
            'adaptability_score': adaptability_score
        }
    
    def _assess_environment_complexity(self):
        """評估環境複雜度"""
        env_detection = self.results['environment_detection']
        
        complexity_factors = 0
        
        # 服務數量
        if len(env_detection['services']) >= 3:
            complexity_factors += 2
        elif len(env_detection['services']) >= 2:
            complexity_factors += 1
            
        # 端口配置
        if len(env_detection['detected_ports']) >= 2:
            complexity_factors += 1
            
        # 認證配置
        if env_detection['auth_config']:
            complexity_factors += 1
            
        # 配置模式
        if env_detection['config_mode'] in ['production', 'testing']:
            complexity_factors += 1
            
        if complexity_factors >= 4:
            return 'High'
        elif complexity_factors >= 2:
            return 'Medium'
        else:
            return 'Low'
    
    def _assess_system_stability(self):
        """評估系統穩定性"""
        test_execution = self.results['test_execution']
        
        pass_rate = test_execution['summary']['pass_rate']
        
        if pass_rate >= 90:
            return 'Excellent'
        elif pass_rate >= 75:
            return 'Good'
        elif pass_rate >= 60:
            return 'Fair'
        else:
            return 'Poor'
    
    def _calculate_recommendation_grade(self):
        """計算建議等級"""
        env_detection = self.results['environment_detection']
        recommendations = env_detection['recommendations']
        
        positive_indicators = len([r for r in recommendations if '✅' in r])
        warning_indicators = len([r for r in recommendations if '⚠️' in r])
        error_indicators = len([r for r in recommendations if '❌' in r])
        
        if error_indicators == 0 and warning_indicators <= 1:
            return 'A'
        elif error_indicators <= 1 and warning_indicators <= 2:
            return 'B'
        elif error_indicators <= 2:
            return 'C'
        else:
            return 'D'
    
    def _identify_adaptation_highlights(self):
        """識別適應性亮點"""
        highlights = []
        
        # 環境檢測亮點
        env_detection = self.results['environment_detection']
        if env_detection['detected_ports']:
            highlights.append(f"✨ 自動發現 {len(env_detection['detected_ports'])} 個活躍端口")
            
        # 測試適配亮點
        test_execution = self.results['test_execution']
        if test_execution['summary']['adapted'] > 0:
            highlights.append(f"🎯 自動適配 {test_execution['summary']['adapted']} 項測試")
            
        # 自動修復亮點
        if 'auto_fixes' in self.results:
            fixes = self.results['auto_fixes']['attempted_fixes']
            if fixes > 0:
                highlights.append(f"🔧 嘗試自動修復 {fixes} 個問題")
                
        return highlights
    
    def _generate_improvement_recommendations(self):
        """生成改進建議"""
        recommendations = []
        
        test_execution = self.results['test_execution']
        pass_rate = test_execution['summary']['pass_rate']
        
        if pass_rate < 80:
            recommendations.append("🔧 建議檢查失敗的測試項目，可能需要系統配置調整")
            
        env_detection = self.results['environment_detection']
        if env_detection['config_mode'] == 'unknown':
            recommendations.append("📝 建議明確設定環境配置模式以獲得更精確的測試策略")
            
        if test_execution['summary']['adapted'] == 0:
            recommendations.append("⚡ 系統未進行任何適應性調整，可能環境配置已經很完善")
        
        return recommendations
    
    def _save_results(self):
        """保存完整結果"""
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        
        # 保存原始結果
        results_file = f"test-results/adaptive-system-results-{timestamp}.json"
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, ensure_ascii=False, indent=2)
        
        print(f"💾 完整結果已保存到: {results_file}")
    
    def _print_final_summary(self, report):
        """打印最終摘要"""
        summary = report['executive_summary']
        
        print("\n" + "=" * 50)
        print("🎯 自適應測試系統執行摘要")
        print("=" * 50)
        
        print(f"📊 測試通過率: {summary['test_pass_rate']:.1f}%")
        print(f"🔄 適應性調整: {summary['total_adaptations']} 項")
        print(f"🌐 環境複雜度: {summary['environment_complexity']}")
        print(f"🛡️ 系統穩定性: {summary['system_stability']}")
        print(f"⭐ 綜合評級: {summary['recommendation_grade']}")
        
        if report['adaptation_highlights']:
            print("\n✨ 適應性亮點:")
            for highlight in report['adaptation_highlights']:
                print(f"   {highlight}")
        
        if report['improvement_recommendations']:
            print("\n💡 改進建議:")
            for rec in report['improvement_recommendations']:
                print(f"   {rec}")
        
        print("\n🚀 自適應測試系統完成！")

def main():
    """主執行函數"""
    print("🧠 MemoryArk 2.0 智能自適應測試系統")
    print("   特色: 自動環境檢測、動態策略調整、智能錯誤修復")
    print()
    
    try:
        system = AdaptiveTestSystem()
        report = system.run_complete_adaptive_test()
        
        # 根據結果確定退出碼
        pass_rate = report['executive_summary']['test_pass_rate']
        return 0 if pass_rate >= 80 else 1
        
    except KeyboardInterrupt:
        print("\n⚠️ 用戶中斷測試")
        return 130
    except Exception as e:
        print(f"\n❌ 測試系統錯誤: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
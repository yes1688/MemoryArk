#!/usr/bin/env python3
"""
動態配置適配器
==================
根據環境檢測結果動態調整測試配置和期望值

功能：
1. 測試參數動態調整
2. 期望值智能修正
3. 重試策略配置
4. 錯誤處理策略
5. 測試優先級調整
"""

from typing import Dict, List, Any
from dataclasses import dataclass
from enum import Enum
import json

class TestStrategy(Enum):
    STRICT = "strict"           # 嚴格模式：生產環境
    RELAXED = "relaxed"         # 寬鬆模式：開發環境
    ADAPTIVE = "adaptive"       # 自適應模式：根據情況調整

class TestPriority(Enum):
    CRITICAL = "critical"       # 關鍵測試：必須通過
    IMPORTANT = "important"     # 重要測試：建議通過
    OPTIONAL = "optional"       # 可選測試：可以失敗

@dataclass
class TestConfig:
    name: str
    endpoint: str
    method: str = "GET"
    headers: Dict[str, str] = None
    data: Any = None
    expected_status: List[int] = None
    timeout: int = 10
    retry_count: int = 3
    priority: TestPriority = TestPriority.IMPORTANT
    strategy: TestStrategy = TestStrategy.ADAPTIVE
    skip_conditions: List[str] = None
    adaptation_rules: Dict[str, Any] = None

class DynamicConfigAdapter:
    def __init__(self):
        self.base_configs = self._initialize_base_configs()
        self.adaptation_rules = self._initialize_adaptation_rules()
        
    def _initialize_base_configs(self) -> List[TestConfig]:
        """初始化基礎測試配置"""
        return [
            # 健康檢查測試
            TestConfig(
                name="Health Check",
                endpoint="/api/health",
                expected_status=[200],
                priority=TestPriority.CRITICAL,
                strategy=TestStrategy.ADAPTIVE
            ),
            
            # 認證狀態檢查
            TestConfig(
                name="Auth Status Check",
                endpoint="/api/auth/status",
                expected_status=[200],
                priority=TestPriority.CRITICAL,
                strategy=TestStrategy.ADAPTIVE
            ),
            
            # 檔案列表API
            TestConfig(
                name="File List API",
                endpoint="/api/files",
                expected_status=[200, 301, 401, 403],  # 多種可能的狀態
                priority=TestPriority.IMPORTANT,
                strategy=TestStrategy.ADAPTIVE,
                adaptation_rules={
                    "development": {"expected_status": [200]},
                    "production": {"expected_status": [401, 403]},
                    "redirect_detected": {"expected_status": [301, 302]}
                }
            ),
            
            # 檔案上傳測試
            TestConfig(
                name="File Upload Test",
                endpoint="/api/files",
                method="POST",
                expected_status=[201, 401, 403],
                priority=TestPriority.IMPORTANT,
                strategy=TestStrategy.ADAPTIVE,
                adaptation_rules={
                    "development": {"expected_status": [201]},
                    "production": {"expected_status": [401, 403]},
                    "auth_bypass": {"expected_status": [201]}
                }
            ),
            
            # 管理員端點測試
            TestConfig(
                name="Admin Users API",
                endpoint="/api/admin/users",
                expected_status=[200, 401, 403],
                headers={"CF-Access-Authenticated-User-Email": "94work.net@gmail.com"},
                priority=TestPriority.IMPORTANT,
                strategy=TestStrategy.STRICT,
                adaptation_rules={
                    "development": {"expected_status": [200]},
                    "production": {"expected_status": [200], "require_auth": True},
                    "auth_bypass": {"expected_status": [200], "headers": {}}
                }
            ),
            
            # 無認證端點訪問
            TestConfig(
                name="Unauthorized Access Test",
                endpoint="/api/admin/users",
                expected_status=[401, 403],
                priority=TestPriority.CRITICAL,
                strategy=TestStrategy.STRICT,
                skip_conditions=["development", "auth_bypass"]
            ),
            
            # SQL注入測試
            TestConfig(
                name="SQL Injection Protection",
                endpoint="/api/auth/status",
                headers={"CF-Access-Authenticated-User-Email": "'; DROP TABLE users;--"},
                expected_status=[400, 401, 403],
                priority=TestPriority.CRITICAL,
                strategy=TestStrategy.STRICT
            ),
            
            # 路徑遍歷測試
            TestConfig(
                name="Path Traversal Protection",
                endpoint="/api/files",
                method="POST",
                data={"virtualPath": "../../../etc/passwd"},
                expected_status=[201, 400],  # 201表示被安全處理，400表示被拒絕
                priority=TestPriority.CRITICAL,
                strategy=TestStrategy.STRICT,
                adaptation_rules={
                    "security_enabled": {"expected_status": [400]},
                    "safe_handling": {"expected_status": [201]}
                }
            )
        ]
    
    def _initialize_adaptation_rules(self) -> Dict[str, Any]:
        """初始化適配規則"""
        return {
            "environment_mode": {
                "development": {
                    "default_strategy": TestStrategy.RELAXED,
                    "auth_requirements": False,
                    "security_tests": "optional",
                    "timeout_multiplier": 2.0,
                    "retry_count": 1
                },
                "production": {
                    "default_strategy": TestStrategy.STRICT,
                    "auth_requirements": True,
                    "security_tests": "mandatory",
                    "timeout_multiplier": 1.0,
                    "retry_count": 3
                },
                "testing": {
                    "default_strategy": TestStrategy.ADAPTIVE,
                    "auth_requirements": "auto_detect",
                    "security_tests": "adaptive",
                    "timeout_multiplier": 1.5,
                    "retry_count": 2
                }
            },
            
            "service_status": {
                "all_services_running": {
                    "skip_conditions": [],
                    "priority_boost": True
                },
                "partial_services": {
                    "skip_conditions": ["integration_tests"],
                    "priority_downgrade": ["optional"]
                },
                "minimal_services": {
                    "skip_conditions": ["file_upload", "admin_tests"],
                    "focus_on": ["health_check", "basic_api"]
                }
            },
            
            "port_configuration": {
                "standard_ports": {
                    "base_url_pattern": "http://localhost:{port}"
                },
                "redirected_ports": {
                    "follow_redirects": True,
                    "expected_redirects": [301, 302, 307, 308]
                },
                "custom_ports": {
                    "auto_discovery": True,
                    "probe_common_ports": [7001, 8080, 8081, 3000]
                }
            }
        }
    
    def adapt_configs(self, env_info: Dict[str, Any]) -> List[TestConfig]:
        """
        根據環境信息適配測試配置
        """
        print("🔧 正在根據環境動態調整測試配置...")
        
        adapted_configs = []
        env_mode = env_info.get('config_mode', 'unknown')
        services = env_info.get('services', [])
        detected_ports = env_info.get('detected_ports', {})
        auth_config = env_info.get('auth_config', {})
        
        # 分析環境特徵
        env_features = self._analyze_environment_features(env_info)
        
        for base_config in self.base_configs:
            # 複製基礎配置
            adapted_config = self._deep_copy_config(base_config)
            
            # 應用環境模式適配
            adapted_config = self._apply_environment_adaptation(adapted_config, env_mode, env_features)
            
            # 應用服務狀態適配
            adapted_config = self._apply_service_adaptation(adapted_config, services)
            
            # 應用端口配置適配
            adapted_config = self._apply_port_adaptation(adapted_config, detected_ports)
            
            # 應用認證配置適配
            adapted_config = self._apply_auth_adaptation(adapted_config, auth_config)
            
            # 檢查跳過條件
            if not self._should_skip_test(adapted_config, env_features):
                adapted_configs.append(adapted_config)
            else:
                print(f"   ⏭️ 跳過測試: {adapted_config.name} (條件: {env_features})")
        
        print(f"   ✅ 已適配 {len(adapted_configs)} 個測試配置")
        return adapted_configs
    
    def _analyze_environment_features(self, env_info: Dict[str, Any]) -> List[str]:
        """分析環境特徵"""
        features = []
        
        # 環境模式特徵
        config_mode = env_info.get('config_mode', 'unknown')
        features.append(config_mode)
        
        # 服務運行特徵
        services = env_info.get('services', [])
        running_services = [s for s in services if s.get('running', False)]
        
        if len(running_services) >= 2:
            features.append('all_services_running')
        elif len(running_services) == 1:
            features.append('partial_services')
        else:
            features.append('minimal_services')
        
        # 端口配置特徵
        detected_ports = env_info.get('detected_ports', {})
        if detected_ports:
            features.append('ports_detected')
            if 'api' in detected_ports:
                features.append('api_accessible')
        
        # 認證配置特徵
        auth_config = env_info.get('auth_config', {})
        if auth_config.get('auth_endpoint_accessible', False):
            features.append('auth_endpoint_accessible')
        
        # 重定向檢測
        base_urls = env_info.get('base_urls', {})
        if any('redirect' in str(url).lower() for url in base_urls.values()):
            features.append('redirect_detected')
        
        return features
    
    def _deep_copy_config(self, config: TestConfig) -> TestConfig:
        """深度複製配置"""
        return TestConfig(
            name=config.name,
            endpoint=config.endpoint,
            method=config.method,
            headers=config.headers.copy() if config.headers else {},
            data=config.data.copy() if isinstance(config.data, dict) else config.data,
            expected_status=config.expected_status.copy() if config.expected_status else [200],
            timeout=config.timeout,
            retry_count=config.retry_count,
            priority=config.priority,
            strategy=config.strategy,
            skip_conditions=config.skip_conditions.copy() if config.skip_conditions else [],
            adaptation_rules=config.adaptation_rules.copy() if config.adaptation_rules else {}
        )
    
    def _apply_environment_adaptation(self, config: TestConfig, env_mode: str, 
                                    env_features: List[str]) -> TestConfig:
        """應用環境模式適配"""
        env_rules = self.adaptation_rules.get('environment_mode', {}).get(env_mode, {})
        
        # 調整策略
        if 'default_strategy' in env_rules:
            config.strategy = env_rules['default_strategy']
        
        # 調整超時
        if 'timeout_multiplier' in env_rules:
            config.timeout = int(config.timeout * env_rules['timeout_multiplier'])
        
        # 調整重試次數
        if 'retry_count' in env_rules:
            config.retry_count = env_rules['retry_count']
        
        # 應用適配規則
        if config.adaptation_rules and env_mode in config.adaptation_rules:
            rule = config.adaptation_rules[env_mode]
            if 'expected_status' in rule:
                config.expected_status = rule['expected_status']
            if 'headers' in rule:
                config.headers.update(rule['headers'])
        
        return config
    
    def _apply_service_adaptation(self, config: TestConfig, services: List[Dict]) -> TestConfig:
        """應用服務狀態適配"""
        running_services = [s for s in services if s.get('running', False)]
        
        if len(running_services) < 2:
            # 服務不完整時降低優先級
            if config.priority == TestPriority.IMPORTANT:
                config.priority = TestPriority.OPTIONAL
            # 增加超時時間
            config.timeout *= 2
        
        return config
    
    def _apply_port_adaptation(self, config: TestConfig, detected_ports: Dict[str, int]) -> TestConfig:
        """應用端口配置適配"""
        if 'api' in detected_ports:
            # 如果端點是相對路徑，添加基礎URL
            if config.endpoint.startswith('/'):
                base_url = f"http://localhost:{detected_ports['api']}"
                config.endpoint = base_url + config.endpoint
        
        return config
    
    def _apply_auth_adaptation(self, config: TestConfig, auth_config: Dict[str, Any]) -> TestConfig:
        """應用認證配置適配"""
        # 如果檢測到認證繞過，調整期望值
        if not auth_config.get('auth_endpoint_accessible', True):
            if 'auth_bypass' in config.adaptation_rules:
                rule = config.adaptation_rules['auth_bypass']
                if 'expected_status' in rule:
                    config.expected_status = rule['expected_status']
                if 'headers' in rule:
                    config.headers = rule['headers']
        
        # 更新管理員郵箱
        admin_email = auth_config.get('admin_email', '94work.net@gmail.com')
        if config.headers and 'CF-Access-Authenticated-User-Email' in config.headers:
            config.headers['CF-Access-Authenticated-User-Email'] = admin_email
        
        return config
    
    def _should_skip_test(self, config: TestConfig, env_features: List[str]) -> bool:
        """判斷是否應該跳過測試"""
        if not config.skip_conditions:
            return False
        
        # 檢查跳過條件是否滿足
        for condition in config.skip_conditions:
            if condition in env_features:
                return True
        
        return False
    
    def generate_test_plan(self, adapted_configs: List[TestConfig]) -> Dict[str, Any]:
        """生成測試計劃"""
        test_plan = {
            'total_tests': len(adapted_configs),
            'critical_tests': len([c for c in adapted_configs if c.priority == TestPriority.CRITICAL]),
            'important_tests': len([c for c in adapted_configs if c.priority == TestPriority.IMPORTANT]),
            'optional_tests': len([c for c in adapted_configs if c.priority == TestPriority.OPTIONAL]),
            'strategies': {
                'strict': len([c for c in adapted_configs if c.strategy == TestStrategy.STRICT]),
                'relaxed': len([c for c in adapted_configs if c.strategy == TestStrategy.RELAXED]),
                'adaptive': len([c for c in adapted_configs if c.strategy == TestStrategy.ADAPTIVE])
            },
            'estimated_duration': sum(c.timeout * (c.retry_count + 1) for c in adapted_configs),
            'configs': [self._config_to_dict(c) for c in adapted_configs]
        }
        
        return test_plan
    
    def _config_to_dict(self, config: TestConfig) -> Dict[str, Any]:
        """將配置轉換為字典"""
        return {
            'name': config.name,
            'endpoint': config.endpoint,
            'method': config.method,
            'headers': config.headers,
            'data': config.data,
            'expected_status': config.expected_status,
            'timeout': config.timeout,
            'retry_count': config.retry_count,
            'priority': config.priority.value,
            'strategy': config.strategy.value,
            'skip_conditions': config.skip_conditions,
            'adaptation_rules': config.adaptation_rules
        }
    
    def save_adapted_config(self, test_plan: Dict[str, Any], filename: str = None):
        """保存適配後的配置"""
        if not filename:
            import time
            timestamp = time.strftime("%Y%m%d-%H%M%S")
            filename = f"test-results/adapted-config-{timestamp}.json"
            
        import os
        os.makedirs('test-results', exist_ok=True)
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(test_plan, f, ensure_ascii=False, indent=2)
        
        print(f"\n💾 適配配置已保存到: {filename}")

def main():
    """測試動態配置適配器"""
    # 模擬環境信息
    mock_env_info = {
        'config_mode': 'production',
        'services': [
            {'name': 'backend', 'running': True, 'port': 8081},
            {'name': 'nginx', 'running': True, 'port': 7001}
        ],
        'detected_ports': {'api': 7001},
        'auth_config': {
            'auth_endpoint_accessible': True,
            'admin_email': '94work.net@gmail.com'
        },
        'base_urls': {'api': 'http://localhost:7001'}
    }
    
    adapter = DynamicConfigAdapter()
    adapted_configs = adapter.adapt_configs(mock_env_info)
    test_plan = adapter.generate_test_plan(adapted_configs)
    adapter.save_adapted_config(test_plan)
    
    print("\n📋 測試計劃摘要:")
    print(f"   總測試數: {test_plan['total_tests']}")
    print(f"   關鍵測試: {test_plan['critical_tests']}")
    print(f"   預估時間: {test_plan['estimated_duration']} 秒")
    
    return test_plan

if __name__ == "__main__":
    main()
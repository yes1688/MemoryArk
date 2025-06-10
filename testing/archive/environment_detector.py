#!/usr/bin/env python3
"""
智能環境檢測器
==================
自動檢測系統運行狀態並提供適應性配置

功能：
1. 容器狀態檢測
2. 網路端口探測
3. 服務健康狀態檢測
4. 配置文件解析
5. 動態配置生成
"""

import subprocess
import requests
import json
import yaml
import re
import socket
import time
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path

@dataclass
class ServiceStatus:
    name: str
    running: bool
    port: Optional[int] = None
    health: Optional[str] = None
    url: Optional[str] = None

@dataclass
class EnvironmentInfo:
    services: List[ServiceStatus]
    detected_ports: Dict[str, int]
    config_mode: str
    auth_config: Dict[str, any]
    base_urls: Dict[str, str]
    recommendations: List[str]

class EnvironmentDetector:
    def __init__(self):
        self.common_ports = [80, 3000, 7001, 8080, 8081, 8082]
        self.service_patterns = {
            'nginx': ['nginx', 'proxy'],
            'backend': ['backend', 'api', 'server'],
            'frontend': ['frontend', 'web', 'ui']
        }
        
    def full_detection(self) -> EnvironmentInfo:
        """執行完整的環境檢測"""
        print("🔍 開始智能環境檢測...")
        
        # 1. 檢測容器服務
        services = self._detect_container_services()
        
        # 2. 探測網路端口
        detected_ports = self._probe_network_ports()
        
        # 3. 檢測配置模式
        config_mode = self._detect_configuration_mode()
        
        # 4. 檢測認證配置
        auth_config = self._detect_auth_configuration()
        
        # 5. 生成服務URL
        base_urls = self._generate_service_urls(detected_ports)
        
        # 6. 生成建議
        recommendations = self._generate_recommendations(services, detected_ports, config_mode)
        
        env_info = EnvironmentInfo(
            services=services,
            detected_ports=detected_ports,
            config_mode=config_mode,
            auth_config=auth_config,
            base_urls=base_urls,
            recommendations=recommendations
        )
        
        self._print_detection_summary(env_info)
        return env_info
    
    def _detect_container_services(self) -> List[ServiceStatus]:
        """檢測容器服務狀態"""
        services = []
        
        try:
            # 檢測 podman-compose 服務
            result = subprocess.run(['podman-compose', 'ps'], 
                                  capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                lines = result.stdout.split('\n')
                for line in lines[1:]:  # 跳過標題行
                    if line.strip():
                        parts = line.split()
                        if len(parts) >= 4:
                            container_name = parts[-1]  # 最後一列是名稱
                            status = 'Up' in line
                            
                            # 提取端口信息
                            port = self._extract_port_from_line(line)
                            
                            # 確定服務類型
                            service_type = self._identify_service_type(container_name)
                            
                            service = ServiceStatus(
                                name=service_type or container_name,
                                running=status,
                                port=port
                            )
                            services.append(service)
                            
        except subprocess.TimeoutExpired:
            print("   ⚠️ 容器檢測超時")
        except Exception as e:
            print(f"   ⚠️ 容器檢測失敗: {e}")
            
        # 如果沒有找到容器，嘗試檢測直接運行的服務
        if not services:
            services = self._detect_direct_services()
            
        return services
    
    def _extract_port_from_line(self, line: str) -> Optional[int]:
        """從容器狀態行提取端口"""
        # 查找端口映射模式 0.0.0.0:7001->80/tcp
        port_pattern = r'0\.0\.0\.0:(\d+)->'
        match = re.search(port_pattern, line)
        if match:
            return int(match.group(1))
        return None
    
    def _identify_service_type(self, container_name: str) -> Optional[str]:
        """識別服務類型"""
        container_lower = container_name.lower()
        
        for service_type, patterns in self.service_patterns.items():
            if any(pattern in container_lower for pattern in patterns):
                return service_type
        
        return None
    
    def _detect_direct_services(self) -> List[ServiceStatus]:
        """檢測直接運行的服務"""
        services = []
        
        for port in self.common_ports:
            if self._is_port_open('localhost', port):
                service_type = self._identify_service_by_response(port)
                services.append(ServiceStatus(
                    name=service_type or f'service_{port}',
                    running=True,
                    port=port
                ))
                
        return services
    
    def _is_port_open(self, host: str, port: int) -> bool:
        """檢查端口是否開放"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex((host, port))
            sock.close()
            return result == 0
        except:
            return False
    
    def _identify_service_by_response(self, port: int) -> Optional[str]:
        """通過響應識別服務類型"""
        try:
            response = requests.get(f'http://localhost:{port}/api/health', 
                                  timeout=2)
            if response.status_code == 200:
                return 'api_gateway'
        except:
            pass
            
        try:
            response = requests.get(f'http://localhost:{port}', timeout=2)
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'html' in content_type:
                    return 'frontend'
                elif 'json' in content_type:
                    return 'backend'
        except:
            pass
            
        return None
    
    def _probe_network_ports(self) -> Dict[str, int]:
        """探測網路端口"""
        ports = {}
        
        # 檢測 API 端點
        api_port = self._find_api_port()
        if api_port:
            ports['api'] = api_port
            
        # 檢測前端端點
        frontend_port = self._find_frontend_port()
        if frontend_port:
            ports['frontend'] = frontend_port
            
        return ports
    
    def _find_api_port(self) -> Optional[int]:
        """尋找 API 端口"""
        endpoints_to_test = [
            '/api/health',
            '/api/auth/status',
            '/health'
        ]
        
        for port in self.common_ports:
            for endpoint in endpoints_to_test:
                try:
                    response = requests.get(f'http://localhost:{port}{endpoint}', 
                                          timeout=2)
                    if response.status_code == 200:
                        return port
                except:
                    continue
                    
        return None
    
    def _find_frontend_port(self) -> Optional[int]:
        """尋找前端端口"""
        for port in [3000, 8080, 8081]:
            try:
                response = requests.get(f'http://localhost:{port}', timeout=2)
                if response.status_code == 200:
                    content_type = response.headers.get('content-type', '')
                    if 'html' in content_type:
                        return port
            except:
                continue
                
        return None
    
    def _detect_configuration_mode(self) -> str:
        """檢測配置模式"""
        config_files = [
            'docker-compose.yml',
            'docker-compose.yaml',
            '.env',
            'config.json'
        ]
        
        for config_file in config_files:
            if Path(config_file).exists():
                mode = self._analyze_config_file(config_file)
                if mode:
                    return mode
                    
        return 'unknown'
    
    def _analyze_config_file(self, config_file: str) -> Optional[str]:
        """分析配置文件"""
        try:
            with open(config_file, 'r') as f:
                content = f.read()
                
            # 檢測開發模式指標
            dev_indicators = [
                'DEVELOPMENT_MODE=true',
                'DEV_MODE=true',
                'GIN_MODE=debug',
                'NODE_ENV=development'
            ]
            
            prod_indicators = [
                'DEVELOPMENT_MODE=false',
                'GIN_MODE=release',
                'NODE_ENV=production'
            ]
            
            if any(indicator in content for indicator in dev_indicators):
                return 'development'
            elif any(indicator in content for indicator in prod_indicators):
                return 'production'
                
        except Exception as e:
            print(f"   ⚠️ 無法分析配置文件 {config_file}: {e}")
            
        return None
    
    def _detect_auth_configuration(self) -> Dict[str, any]:
        """檢測認證配置"""
        auth_config = {}
        
        # 測試認證端點
        try:
            api_port = self._find_api_port()
            if api_port:
                response = requests.get(f'http://localhost:{api_port}/api/auth/status', 
                                      timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    auth_config['auth_endpoint_accessible'] = True
                    auth_config['current_auth_status'] = data
                else:
                    auth_config['auth_endpoint_accessible'] = False
        except:
            auth_config['auth_endpoint_accessible'] = False
            
        # 檢測管理員配置
        try:
            with open('docker-compose.yml', 'r') as f:
                content = f.read()
                
            admin_match = re.search(r'ROOT_ADMIN_EMAIL[=:]([^\s\n}]+)', content)
            if admin_match:
                email = admin_match.group(1).replace('${ROOT_ADMIN_EMAIL:-', '').replace('}', '')
                auth_config['admin_email'] = email
                
        except:
            auth_config['admin_email'] = 'unknown'
            
        return auth_config
    
    def _generate_service_urls(self, detected_ports: Dict[str, int]) -> Dict[str, str]:
        """生成服務URL"""
        urls = {}
        
        if 'api' in detected_ports:
            urls['api'] = f"http://localhost:{detected_ports['api']}"
            
        if 'frontend' in detected_ports:
            urls['frontend'] = f"http://localhost:{detected_ports['frontend']}"
            
        return urls
    
    def _generate_recommendations(self, services: List[ServiceStatus], 
                                ports: Dict[str, int], mode: str) -> List[str]:
        """生成優化建議"""
        recommendations = []
        
        # 檢查服務運行狀態
        running_services = [s for s in services if s.running]
        if len(running_services) == 0:
            recommendations.append("❌ 沒有檢測到運行中的服務，請啟動容器")
        elif len(running_services) < 2:
            recommendations.append("⚠️ 服務不完整，建議檢查容器狀態")
            
        # 檢查API可達性
        if 'api' not in ports:
            recommendations.append("❌ 無法檢測到API端點，檢查後端服務")
        else:
            recommendations.append(f"✅ API服務運行在端口 {ports['api']}")
            
        # 配置模式建議
        if mode == 'development':
            recommendations.append("🔧 開發模式：測試將使用寬鬆的驗證標準")
        elif mode == 'production':
            recommendations.append("🔒 生產模式：測試將使用嚴格的驗證標準")
        else:
            recommendations.append("❓ 無法確定配置模式，將使用預設測試策略")
            
        return recommendations
    
    def _print_detection_summary(self, env_info: EnvironmentInfo):
        """打印檢測摘要"""
        print("\n📋 環境檢測摘要:")
        print(f"   🎯 配置模式: {env_info.config_mode}")
        print(f"   🔧 運行中服務: {len([s for s in env_info.services if s.running])}")
        print(f"   🌐 檢測到端口: {env_info.detected_ports}")
        
        if env_info.base_urls:
            print("   📍 服務端點:")
            for service, url in env_info.base_urls.items():
                print(f"      {service}: {url}")
                
        print("   💡 建議:")
        for rec in env_info.recommendations:
            print(f"      {rec}")
    
    def save_detection_result(self, env_info: EnvironmentInfo, filename: str = None):
        """保存檢測結果"""
        if not filename:
            timestamp = time.strftime("%Y%m%d-%H%M%S")
            filename = f"test-results/environment-detection-{timestamp}.json"
            
        Path("test-results").mkdir(exist_ok=True)
        
        # 轉換為可序列化的格式
        result = {
            'detection_time': time.strftime("%Y-%m-%d %H:%M:%S"),
            'services': [asdict(s) for s in env_info.services],
            'detected_ports': env_info.detected_ports,
            'config_mode': env_info.config_mode,
            'auth_config': env_info.auth_config,
            'base_urls': env_info.base_urls,
            'recommendations': env_info.recommendations
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
            
        print(f"\n💾 檢測結果已保存到: {filename}")

def main():
    """測試環境檢測器"""
    detector = EnvironmentDetector()
    env_info = detector.full_detection()
    detector.save_detection_result(env_info)
    
    return env_info

if __name__ == "__main__":
    main()
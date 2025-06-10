#!/usr/bin/env python3
"""
測試報告產生器
將 JSON 測試結果轉換為 HTML 報告
"""

import os
import json
import glob
from datetime import datetime
from jinja2 import Template

# HTML 報告模板
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MemoryArk 2.0 測試報告</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #1e3a8a;
            margin-bottom: 30px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .summary-card {
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            color: white;
        }
        .summary-card h2 {
            margin: 0 0 10px 0;
            font-size: 36px;
        }
        .summary-card p {
            margin: 0;
            font-size: 18px;
            opacity: 0.9;
        }
        .total { background: #6366f1; }
        .passed { background: #10b981; }
        .failed { background: #ef4444; }
        .skipped { background: #f59e0b; }
        
        .test-results {
            margin-top: 30px;
        }
        .test-item {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 15px;
            padding: 20px;
        }
        .test-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .test-name {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
        }
        .test-status {
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
        }
        .status-passed {
            background: #d1fae5;
            color: #065f46;
        }
        .status-failed {
            background: #fee2e2;
            color: #991b1b;
        }
        .status-skipped {
            background: #fef3c7;
            color: #92400e;
        }
        .test-details {
            color: #6b7280;
            font-size: 14px;
        }
        .error-message {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            padding: 10px;
            margin-top: 10px;
            color: #991b1b;
        }
        .metadata {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
            font-size: 14px;
            color: #4b5563;
        }
        .metadata div {
            margin-bottom: 5px;
        }
        .response-time {
            color: #059669;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 MemoryArk 2.0 整合測試報告</h1>
        
        <div class="metadata">
            <div><strong>測試時間：</strong> {{ start_time }} - {{ end_time }}</div>
            <div><strong>目標伺服器：</strong> {{ api_base_url }}</div>
            <div><strong>執行時間：</strong> {{ duration }} 秒</div>
        </div>
        
        <div class="summary">
            <div class="summary-card total">
                <h2>{{ summary.total }}</h2>
                <p>總測試數</p>
            </div>
            <div class="summary-card passed">
                <h2>{{ summary.passed }}</h2>
                <p>通過</p>
            </div>
            <div class="summary-card failed">
                <h2>{{ summary.failed }}</h2>
                <p>失敗</p>
            </div>
            <div class="summary-card skipped">
                <h2>{{ summary.skipped }}</h2>
                <p>跳過</p>
            </div>
        </div>
        
        <div class="test-results">
            <h2>測試詳情</h2>
            {% for test in tests %}
            <div class="test-item">
                <div class="test-header">
                    <div class="test-name">{{ test.test_name }}</div>
                    <div class="test-status status-{{ test.status }}">
                        {% if test.status == 'passed' %}✅ 通過
                        {% elif test.status == 'failed' %}❌ 失敗
                        {% else %}⚠️ 跳過
                        {% endif %}
                    </div>
                </div>
                <div class="test-details">
                    <div>時間: {{ test.timestamp }}</div>
                    {% if test.response %}
                    <div>狀態碼: {{ test.response.status_code }}{% if test.response.elapsed_ms %} | 
                         回應時間: <span class="response-time">{{ "%.0f"|format(test.response.elapsed_ms) }}ms</span>{% endif %}
                    </div>
                    {% endif %}
                    {% if test.error %}
                    <div class="error-message">
                        錯誤: {{ test.error }}
                    </div>
                    {% endif %}
                    {% if test.reason %}
                    <div style="color: #92400e;">
                        原因: {{ test.reason }}
                    </div>
                    {% endif %}
                </div>
            </div>
            {% endfor %}
        </div>
    </div>
</body>
</html>
"""

def generate_report():
    """產生 HTML 測試報告"""
    # 找到最新的測試結果
    results_dir = './test-results'
    json_files = glob.glob(os.path.join(results_dir, 'test-results-*.json'))
    
    if not json_files:
        print("找不到測試結果檔案")
        return
    
    # 取得最新的檔案
    latest_file = max(json_files, key=os.path.getctime)
    
    # 讀取測試結果
    with open(latest_file, 'r', encoding='utf-8') as f:
        test_results = json.load(f)
    
    # 計算執行時間
    start_time = datetime.fromisoformat(test_results['start_time'])
    end_time = datetime.fromisoformat(test_results['end_time'])
    duration = (end_time - start_time).total_seconds()
    
    # 準備模板資料
    template_data = {
        'start_time': start_time.strftime('%Y-%m-%d %H:%M:%S'),
        'end_time': end_time.strftime('%Y-%m-%d %H:%M:%S'),
        'duration': f"{duration:.1f}",
        'api_base_url': test_results['api_base_url'],
        'summary': test_results['summary'],
        'tests': test_results['tests']
    }
    
    # 產生 HTML
    template = Template(HTML_TEMPLATE)
    html_content = template.render(**template_data)
    
    # 儲存 HTML 報告
    html_file = os.path.join(results_dir, 'index.html')
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"HTML 報告已產生: {html_file}")
    
    # 同時產生簡易的文字報告
    text_report = f"""
MemoryArk 2.0 測試報告
=====================
測試時間: {template_data['start_time']} - {template_data['end_time']}
執行時間: {template_data['duration']} 秒
目標伺服器: {template_data['api_base_url']}

測試總結:
- 總測試數: {template_data['summary']['total']}
- 通過: {template_data['summary']['passed']}
- 失敗: {template_data['summary']['failed']}
- 跳過: {template_data['summary']['skipped']}

測試詳情:
"""
    
    for test in template_data['tests']:
        status_icon = {'passed': '✅', 'failed': '❌', 'skipped': '⚠️'}.get(test['status'], '?')
        text_report += f"\n{status_icon} {test['test_name']}"
        if test.get('error'):
            text_report += f"\n   錯誤: {test['error']}"
        if test.get('reason'):
            text_report += f"\n   原因: {test['reason']}"
    
    text_file = os.path.join(results_dir, 'report.txt')
    with open(text_file, 'w', encoding='utf-8') as f:
        f.write(text_report)
    
    print(f"文字報告已產生: {text_file}")

if __name__ == '__main__':
    generate_report()
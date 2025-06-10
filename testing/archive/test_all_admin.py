#!/usr/bin/env python3
import requests

session = requests.Session()
headers = {'CF-Access-Authenticated-User-Email': '94work.net@gmail.com'}

endpoints = [
    '/api/auth/me',
    '/api/admin/users',
    '/api/admin/stats', 
    '/api/admin/logs',
    '/api/admin/registrations'
]

for endpoint in endpoints:
    response = session.get(f'http://localhost:7001{endpoint}', headers=headers, timeout=30)
    print(f'{endpoint}: {response.status_code}')
    if response.status_code == 200:
        data = response.json()
        if endpoint == '/api/auth/me':
            print(f'  用戶角色: {data["data"]["role"]}')
        elif data.get('success'):
            print('  ✅ 成功')
        else:
            print(f'  ❌ API失敗: {data}')
    else:
        try:
            error_data = response.json()
            print(f'  ❌ 錯誤: {error_data["error"]}')
        except:
            print(f'  ❌ HTTP錯誤: {response.text[:50]}')
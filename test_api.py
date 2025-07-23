#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JJ Simulator API测试脚本
"""

import requests
import json
import time

def test_health_check():
    """测试健康检查接口"""
    print("🔍 测试健康检查接口...")
    try:
        response = requests.get("http://localhost:8080/health", timeout=5)
        if response.status_code == 200:
            result = response.json()
            print(f"✓ 健康检查通过: {result['message']}")
            return True
        else:
            print(f"✗ 健康检查失败: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ 健康检查失败: {e}")
        return False

def test_fund_data():
    """测试基金数据接口"""
    print("\n🔍 测试基金数据接口...")
    
    # 测试华夏成长基金 000001
    test_cases = [
        {
            "code": "000001",
            "start_date": "20230101", 
            "end_date": "20230131",
            "name": "华夏成长基金"
        },
        {
            "code": "110022",
            "start_date": "20230201",
            "end_date": "20230228", 
            "name": "易方达消费行业基金"
        }
    ]
    
    for test_case in test_cases:
        print(f"\n📊 测试 {test_case['name']} ({test_case['code']})...")
        
        try:
            url = f"http://localhost:8080/api/fund_data"
            params = {
                "code": test_case["code"],
                "start_date": test_case["start_date"],
                "end_date": test_case["end_date"]
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    data = result["data"]
                    print(f"✓ 成功获取 {len(data)} 条数据")
                    
                    # 显示前几条数据
                    if data:
                        print("📈 数据样例:")
                        for i, item in enumerate(data[:3]):
                            print(f"   {item['date']}: 涨跌幅 {item['daily_growth']}%")
                        
                        if len(data) > 3:
                            print(f"   ... 还有 {len(data) - 3} 条数据")
                else:
                    print(f"✗ API返回错误: {result.get('error', '未知错误')}")
            else:
                print(f"✗ HTTP错误: {response.status_code}")
                
        except Exception as e:
            print(f"✗ 请求失败: {e}")

def test_fund_info():
    """测试基金信息接口"""
    print("\n🔍 测试基金信息接口...")
    
    try:
        response = requests.get("http://localhost:8080/api/fund_info?code=000001", timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                info = result["data"]
                print(f"✓ 基金信息: {info['name']} ({info['code']}) - {info['type']}")
            else:
                print(f"✗ 获取基金信息失败: {result.get('error')}")
        else:
            print(f"✗ HTTP错误: {response.status_code}")
            
    except Exception as e:
        print(f"✗ 请求失败: {e}")

def main():
    """主测试函数"""
    print("=" * 60)
    print("🚀 JJ Simulator API 功能测试")
    print("=" * 60)
    
    # 测试健康检查
    if not test_health_check():
        print("\n❌ API服务未正常运行，请先启动服务:")
        print("   python fund_api.py")
        return
    
    # 测试基金数据接口
    test_fund_data()
    
    # 测试基金信息接口
    test_fund_info()
    
    print("\n" + "=" * 60)
    print("🎉 测试完成！")
    print("💡 提示：在浏览器中打开 index.html 开始使用JJ Simulator")
    print("=" * 60)

if __name__ == "__main__":
    main() 
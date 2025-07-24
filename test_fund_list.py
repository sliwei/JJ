#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试基金列表API接口
"""
import requests
import json

def test_fund_list_api():
    """测试基金列表接口"""
    base_url = "http://localhost:8080"
    
    print("🔍 测试基金列表API接口...")
    
    # 测试用例
    test_cases = [
        {
            "name": "获取前10个基金",
            "params": {"limit": 10}
        },
        {
            "name": "搜索华夏基金",
            "params": {"query": "华夏", "limit": 5}
        },
        {
            "name": "搜索基金代码000001",
            "params": {"query": "000001", "limit": 5}
        },
        {
            "name": "搜索成长基金",
            "params": {"query": "成长", "limit": 5}
        }
    ]
    
    for test_case in test_cases:
        print(f"\n📊 {test_case['name']}...")
        
        try:
            url = f"{base_url}/api/fund_list"
            response = requests.get(url, params=test_case['params'], timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    data = result["data"]
                    print(f"✓ 成功获取 {len(data)} 只基金")
                    print(f"  总数量: {result.get('total_count', 'N/A')}")
                    print(f"  缓存时间: {result.get('cache_time', 'N/A')}")
                    
                    # 显示前几条数据
                    if data:
                        print("📈 基金样例:")
                        for i, fund in enumerate(data[:3]):
                            print(f"   {fund['code']} - {fund['name']}")
                            print(f"     净值: {fund['net_value']:.4f}, 涨跌: {fund['daily_growth']:+.2f}%")
                        
                        if len(data) > 3:
                            print(f"   ... 还有 {len(data) - 3} 只基金")
                else:
                    print(f"✗ API返回错误: {result.get('error', '未知错误')}")
            else:
                print(f"✗ HTTP错误: {response.status_code}")
                print(f"   响应内容: {response.text[:200]}")
                
        except Exception as e:
            print(f"✗ 请求失败: {e}")

def test_health_check():
    """测试健康检查"""
    try:
        response = requests.get("http://localhost:8080/health", timeout=5)
        if response.status_code == 200:
            result = response.json()
            print(f"✓ 服务健康: {result.get('message', 'OK')}")
            return True
        else:
            print(f"✗ 健康检查失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ 无法连接到服务: {e}")
        return False

def main():
    """主测试函数"""
    print("=" * 60)
    print("🚀 基金列表API测试")
    print("=" * 60)
    
    # 测试健康检查
    if not test_health_check():
        print("\n❌ API服务未正常运行，请先启动服务:")
        print("   python fund_api.py")
        return
    
    # 测试基金列表接口
    test_fund_list_api()
    
    print("\n" + "=" * 60)
    print("🎉 测试完成！")
    print("💡 提示：现在可以在前端页面中使用基金搜索功能")
    print("=" * 60)

if __name__ == "__main__":
    main() 
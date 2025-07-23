#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JJ Simulator API启动脚本
自动检查依赖并启动API服务
"""

import subprocess
import sys
import os

def check_and_install_dependencies():
    """检查并安装依赖"""
    required_packages = [
        'akshare',
        'flask',
        'flask-cors', 
        'pandas'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✓ {package} 已安装")
        except ImportError:
            missing_packages.append(package)
            print(f"✗ {package} 未安装")
    
    if missing_packages:
        print(f"\n正在安装缺失的依赖: {', '.join(missing_packages)}")
        try:
            subprocess.check_call([
                sys.executable, '-m', 'pip', 'install'
            ] + missing_packages)
            print("✓ 依赖安装完成")
        except subprocess.CalledProcessError as e:
            print(f"✗ 依赖安装失败: {e}")
            print("请手动运行: pip install -r requirements.txt")
            return False
    
    return True

def start_api_server():
    """启动API服务"""
    print("\n" + "="*50)
    print("🚀 启动 JJ Simulator API 服务")
    print("="*50)
    
    if not os.path.exists('fund_api.py'):
        print("✗ 未找到 fund_api.py 文件")
        return False
    
    try:
        # 导入并启动API服务
        from fund_api import app
        print("✓ API服务启动成功")
        print("📍 服务地址: http://localhost:8080")
        print("📋 健康检查: http://localhost:8080/health")
        print("📖 使用说明: 请在浏览器中打开 index.html")
        print("\n按 Ctrl+C 停止服务\n")
        
        app.run(host='0.0.0.0', port=8080, debug=False)
        
    except KeyboardInterrupt:
        print("\n👋 API服务已停止")
        return True
    except Exception as e:
        print(f"✗ 启动失败: {e}")
        return False

def main():
    """主函数"""
    print("JJ Simulator - 基金交易模拟器")
    print("基于AKShare的基金数据API服务\n")
    
    # 检查依赖
    if not check_and_install_dependencies():
        sys.exit(1)
    
    # 启动服务
    if not start_api_server():
        sys.exit(1)

if __name__ == '__main__':
    main() 
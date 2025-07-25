#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JJ Simulator API启动脚本
自动检查依赖并启动API服务
"""

import subprocess
import sys
import os
import argparse

def check_and_install_dependencies():
    """检查并安装依赖"""
    required_packages = [
        'akshare',
        'flask',
        'flask-cors', 
        'pandas',
        'gunicorn'
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
            # 添加trusted-host参数解决SSL证书问题
            subprocess.check_call([
                sys.executable, '-m', 'pip', 'install',
                '--trusted-host', 'pypi.org',
                '--trusted-host', 'pypi.python.org', 
                '--trusted-host', 'files.pythonhosted.org'
            ] + missing_packages)
            print("✓ 依赖安装完成")
        except subprocess.CalledProcessError as e:
            print(f"✗ 依赖安装失败: {e}")
            print("请手动运行: pip install -r requirements.txt")
            return False
    
    return True

def start_api_server(production=False):
    """启动API服务"""
    print("\n" + "="*50)
    if production:
        print("🚀 启动 JJ Simulator API 服务 (生产模式)")
    else:
        print("🚀 启动 JJ Simulator API 服务 (开发模式)")
    print("="*50)
    
    if not os.path.exists('fund_api.py'):
        print("✗ 未找到 fund_api.py 文件")
        return False
    
    try:
        print("✓ API服务启动成功")
        print("📍 服务地址: http://localhost:8080")
        print("📋 健康检查: http://localhost:8080/health")
        print("📖 使用说明: 请在浏览器中打开 index.html")
        print("\n按 Ctrl+C 停止服务\n")
        
        if production:
            # 生产模式使用gunicorn
            if os.path.exists('gunicorn.conf.py'):
                cmd = ['gunicorn', '--config', 'gunicorn.conf.py', 'fund_api:app']
            else:
                cmd = ['gunicorn', '--bind', '0.0.0.0:8080', '--workers', '4', 'fund_api:app']
            subprocess.run(cmd)
        else:
            # 开发模式使用Flask内置服务器
            from fund_api import app
            app.run(host='0.0.0.0', port=8080, debug=True)
        
    except KeyboardInterrupt:
        print("\n👋 API服务已停止")
        return True
    except Exception as e:
        print(f"✗ 启动失败: {e}")
        return False

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='JJ Simulator API 启动脚本')
    parser.add_argument('--production', '-p', action='store_true', 
                       help='使用生产模式启动 (gunicorn)')
    args = parser.parse_args()
    
    print("JJ Simulator - 基金交易模拟器")
    print("基于AKShare的基金数据API服务\n")
    
    # 检查依赖
    if not check_and_install_dependencies():
        sys.exit(1)
    
    # 启动服务
    if not start_api_server(production=args.production):
        sys.exit(1)

if __name__ == '__main__':
    main() 
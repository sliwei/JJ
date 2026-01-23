#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JJ Simulator API 主入口
合并基金API和Bili Monitor API
"""

import os
import sys

# 确保backend目录在Python路径中
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify
from flask_cors import CORS

from config import Config
from services.database import db
from services.fund_cache import fund_cache
from services.polling import polling_service
from blueprints.fund import fund_bp
from blueprints.bi import bi_bp


def create_app():
    """创建Flask应用"""
    app = Flask(__name__)
    
    # 启用CORS
    CORS(app)
    
    # 注册Blueprint
    app.register_blueprint(bi_bp)    # Bili Monitor API
    app.register_blueprint(fund_bp)  # 基金API
    
    # 健康检查接口
    @app.route('/health', methods=['GET'])
    def health_check():
        """全局健康检查"""
        status = {
            'fund_cache': fund_cache.is_available,
            'database': db.is_available and db.health_check() if db.is_available else False
        }
        
        all_healthy = status['fund_cache']  # 基金缓存必须可用
        
        return jsonify({
            'status': 'healthy' if all_healthy else 'degraded',
            'message': 'JJ Simulator API Running' if all_healthy else 'Some services unavailable',
            'services': status
        }), 200 if all_healthy else 503
    
    return app


def init_services():
    """初始化服务"""
    print("\n" + "=" * 60)
    print("JJ Simulator API - Initializing...")
    print("=" * 60)
    
    # 初始化数据库（可选，用于Bili Monitor功能）
    if Config.is_db_configured():
        if db.init():
            # 数据库初始化成功，启动轮询服务
            print("=" * 60)
            print("Initializing Bili Monitor Polling Service...")
            print("=" * 60)
            polling_service.start()
        else:
            print("[WARN] Database init failed, Bili Monitor unavailable")
    else:
        print("[INFO] Database not configured, Bili Monitor unavailable")
    
    # 初始化基金缓存（必须）
    fund_cache.init()

    print("=" * 60)
    print("Service initialization complete")
    print("=" * 60 + "\n")


# 创建应用实例
app = create_app()

# 模块导入时初始化服务（适用于gunicorn等场景）
init_services()


if __name__ == '__main__':
    port = Config.APP_PORT
    debug = Config.DEBUG
    
    print("\nStarting JJ Simulator API Service")
    print("Address: http://localhost:{}".format(port))
    print("Health Check: http://localhost:{}/health".format(port))
    print("Bili Monitor: http://localhost:{}/api/bi/health".format(port))
    print("Debug Mode: {}".format("ON" if debug else "OFF"))
    print("\nPress Ctrl+C to stop\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug)

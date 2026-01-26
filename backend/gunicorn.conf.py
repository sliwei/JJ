#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gunicorn配置文件
用于生产环境部署
"""

import os

# 服务器套接字
bind = os.environ.get('GUNICORN_BIND', '0.0.0.0:8080')
backlog = 2048

# Worker进程
workers = int(os.environ.get('GUNICORN_WORKERS', 2))
worker_class = 'sync'
worker_connections = 1000
timeout = 180  # 增加到180秒，避免worker timeout（已优化查询，此配置作为额外保障）
keepalive = 2

# 重启策略
max_requests = 1000
max_requests_jitter = 50
preload_app = True

# 日志配置
loglevel = os.environ.get('GUNICORN_LOGLEVEL', 'info')
accesslog = os.environ.get('GUNICORN_ACCESS_LOG', '-')
errorlog = os.environ.get('GUNICORN_ERROR_LOG', '-')

# 进程命名
proc_name = 'jj-simulator'

# 请求限制
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# 钩子函数
def on_starting(server):
    """服务启动时"""
    print("=" * 60)
    print("🚀 JJ Simulator API (Gunicorn) 启动中...")
    print("=" * 60)


def on_exit(server):
    """服务退出时"""
    print("=" * 60)
    print("👋 JJ Simulator API 已停止")
    print("=" * 60)

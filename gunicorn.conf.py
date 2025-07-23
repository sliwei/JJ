# Gunicorn配置文件
import multiprocessing

# 服务器套接字
bind = "0.0.0.0:8080"
backlog = 2048

# Worker进程
workers = 2  # 简化为固定数量
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 2

# 重启
max_requests = 1000
max_requests_jitter = 50
preload_app = True

# 日志 - 简化配置
loglevel = "info"

# 进程命名
proc_name = 'jj-serve'

# 安全
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190 
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
配置管理模块
统一管理环境变量和应用配置
"""

import os
from dotenv import load_dotenv

# 加载环境变量（开发环境从项目根目录的 .env 文件读取）
_env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(_env_path)


class Config:
    """应用配置类"""
    
    # Flask配置
    DEBUG = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    
    # JWT配置
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
    JWT_EXPIRES_DAYS = int(os.environ.get('JWT_EXPIRES_DAYS', 2))
    
    # 服务端口
    FUND_API_PORT = int(os.environ.get('FUND_API_PORT', 8080))
    BI_API_PORT = int(os.environ.get('BI_API_PORT', 8081))
    APP_PORT = int(os.environ.get('APP_PORT', 8080))
    
    # 数据库配置
    DB_HOST = os.environ.get('DB_HOST')
    DB_PORT = int(os.environ.get('DB_PORT', 3306))
    DB_USER = os.environ.get('DB_USER')
    DB_PASSWORD = os.environ.get('DB_PASSWORD')
    DB_NAME = os.environ.get('DB_NAME')
    
    # 数据库连接池配置
    DB_POOL_SIZE = int(os.environ.get('DB_POOL_SIZE', 10))
    DB_POOL_MIN_CACHED = int(os.environ.get('DB_POOL_MIN_CACHED', 2))
    DB_POOL_MAX_CACHED = int(os.environ.get('DB_POOL_MAX_CACHED', 5))
    
    @classmethod
    def get_db_config(cls) -> dict:
        """获取数据库配置字典"""
        return {
            'host': cls.DB_HOST,
            'port': cls.DB_PORT,
            'user': cls.DB_USER,
            'password': cls.DB_PASSWORD,
            'database': cls.DB_NAME,
            'charset': 'utf8mb4',
        }
    
    @classmethod
    def validate_db_config(cls) -> list:
        """验证数据库配置，返回缺失的配置项列表"""
        required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
        missing = [key for key in required if not getattr(cls, key)]
        return missing
    
    @classmethod
    def is_db_configured(cls) -> bool:
        """检查数据库是否已配置"""
        return len(cls.validate_db_config()) == 0


# 项目路径
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIST_DIR = os.path.join(PROJECT_ROOT, 'frontend', 'dist')


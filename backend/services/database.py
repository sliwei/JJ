#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库服务模块
管理数据库连接池和基本操作
"""

from typing import Any, Optional
import pymysql
from pymysql.cursors import DictCursor
from dbutils.pooled_db import PooledDB

from config import Config


class DatabaseService:
    """数据库服务类"""
    
    _instance: Optional['DatabaseService'] = None
    _pool: Optional[PooledDB] = None
    _initialized: bool = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def init(self) -> bool:
        """初始化数据库连接池"""
        if self._initialized:
            return True
        
        # 验证配置
        missing = Config.validate_db_config()
        if missing:
            print(f"⚠️ 缺少必要的数据库环境变量: {', '.join(missing)}")
            print("请配置 .env 文件或设置环境变量")
            return False
        
        try:
            db_config = Config.get_db_config()
            db_config['cursorclass'] = DictCursor
            
            self._pool = PooledDB(
                creator=pymysql,
                maxconnections=Config.DB_POOL_SIZE,
                mincached=Config.DB_POOL_MIN_CACHED,
                maxcached=Config.DB_POOL_MAX_CACHED,
                blocking=True,
                **db_config
            )
            self._initialized = True
            print(f"✓ 数据库连接池已初始化: {Config.DB_HOST}:{Config.DB_PORT}/{Config.DB_NAME}")
            return True
        except Exception as e:
            print(f"✗ 数据库连接池初始化失败: {e}")
            return False
    
    @property
    def is_available(self) -> bool:
        """检查数据库服务是否可用"""
        return self._initialized and self._pool is not None
    
    def get_connection(self):
        """获取数据库连接"""
        if not self.is_available:
            raise RuntimeError("数据库服务未初始化")
        return self._pool.connection()
    
    def execute_query(self, sql: str, params: tuple = None, fetch_one: bool = False) -> Any:
        """执行查询SQL"""
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(sql, params)
                if fetch_one:
                    return cursor.fetchone()
                return cursor.fetchall()
        finally:
            conn.close()
    
    def execute_modify(self, sql: str, params: tuple = None) -> int:
        """执行修改SQL，返回受影响行数"""
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                result = cursor.execute(sql, params)
                conn.commit()
                return result
        finally:
            conn.close()
    
    def execute_insert(self, sql: str, params: tuple = None) -> int:
        """执行插入SQL，返回自增ID"""
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(sql, params)
                conn.commit()
                return cursor.lastrowid
        finally:
            conn.close()
    
    def health_check(self) -> bool:
        """健康检查"""
        if not self.is_available:
            return False
        try:
            self.execute_query("SELECT 1", fetch_one=True)
            return True
        except:
            return False


# 全局数据库服务实例
db = DatabaseService()


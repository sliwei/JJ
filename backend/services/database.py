#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库服务模块
管理数据库连接池和基本操作
"""

from typing import Any, Optional
import time
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
            # 添加连接超时配置
            db_config['connect_timeout'] = 10  # 连接超时10秒
            db_config['read_timeout'] = 30      # 读取超时30秒
            db_config['write_timeout'] = 30     # 写入超时30秒
            
            self._pool = PooledDB(
                creator=pymysql,
                maxconnections=Config.DB_POOL_SIZE,
                mincached=Config.DB_POOL_MIN_CACHED,
                maxcached=Config.DB_POOL_MAX_CACHED,
                blocking=True,
                maxusage=0,  # 连接使用次数限制，0表示无限制
                setsession=[],  # 连接会话设置
                ping=1,  # 每次使用连接前ping，确保连接有效
                **db_config
            )
            self._initialized = True
            print(f"✓ 数据库连接池已初始化: {Config.DB_HOST}:{Config.DB_PORT}/{Config.DB_NAME}")
            print(f"  连接池配置: max={Config.DB_POOL_SIZE}, min_cached={Config.DB_POOL_MIN_CACHED}, max_cached={Config.DB_POOL_MAX_CACHED}")
            return True
        except Exception as e:
            print(f"✗ 数据库连接池初始化失败: {e}")
            return False
    
    @property
    def is_available(self) -> bool:
        """检查数据库服务是否可用"""
        return self._initialized and self._pool is not None
    
    def get_connection(self, timeout: float = 10.0):
        """获取数据库连接
        
        Args:
            timeout: 获取连接的超时时间（秒），默认10秒
            
        Returns:
            数据库连接对象
            
        Raises:
            RuntimeError: 数据库服务未初始化
            TimeoutError: 获取连接超时
        """
        if not self.is_available:
            raise RuntimeError("数据库服务未初始化")
        
        start_time = time.time()
        try:
            conn = self._pool.connection()
            elapsed = time.time() - start_time
            if elapsed > 1.0:  # 如果获取连接耗时超过1秒，记录警告
                print(f"⚠️ 获取数据库连接耗时 {elapsed:.2f} 秒")
            return conn
        except Exception as e:
            elapsed = time.time() - start_time
            if elapsed >= timeout:
                raise TimeoutError(f"获取数据库连接超时（{elapsed:.2f}秒）: {e}")
            raise
    
    def execute_query(self, sql: str, params: tuple = None, fetch_one: bool = False) -> Any:
        """执行查询SQL
        
        Args:
            sql: SQL查询语句
            params: SQL参数
            fetch_one: 是否只获取一条记录
            
        Returns:
            查询结果
            
        Raises:
            RuntimeError: 数据库服务未初始化
            Exception: 数据库查询错误
        """
        conn = None
        try:
            conn = self.get_connection()
            with conn.cursor() as cursor:
                cursor.execute(sql, params)
                if fetch_one:
                    return cursor.fetchone()
                return cursor.fetchall()
        except Exception as e:
            print(f"数据库查询错误: {e}")
            print(f"SQL: {sql[:200]}...")  # 只打印前200个字符
            raise
        finally:
            if conn:
                try:
                    conn.close()
                except Exception as e:
                    print(f"关闭数据库连接时出错: {e}")
    
    def execute_modify(self, sql: str, params: tuple = None) -> int:
        """执行修改SQL，返回受影响行数"""
        conn = None
        try:
            conn = self.get_connection()
            with conn.cursor() as cursor:
                result = cursor.execute(sql, params)
                conn.commit()
                return result
        except Exception as e:
            print(f"数据库修改错误: {e}")
            print(f"SQL: {sql[:200]}...")
            if conn:
                try:
                    conn.rollback()
                except:
                    pass
            raise
        finally:
            if conn:
                try:
                    conn.close()
                except Exception as e:
                    print(f"关闭数据库连接时出错: {e}")
    
    def execute_insert(self, sql: str, params: tuple = None) -> int:
        """执行插入SQL，返回自增ID"""
        conn = None
        try:
            conn = self.get_connection()
            with conn.cursor() as cursor:
                cursor.execute(sql, params)
                conn.commit()
                return cursor.lastrowid
        except Exception as e:
            print(f"数据库插入错误: {e}")
            print(f"SQL: {sql[:200]}...")
            if conn:
                try:
                    conn.rollback()
                except:
                    pass
            raise
        finally:
            if conn:
                try:
                    conn.close()
                except Exception as e:
                    print(f"关闭数据库连接时出错: {e}")
    
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

